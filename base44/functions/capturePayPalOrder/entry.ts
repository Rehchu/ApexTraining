import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getPayPalAccessToken() {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  
  const auth = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`PayPal auth failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await req.json();

    if (!orderId) {
      return Response.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const accessToken = await getPayPalAccessToken();

    const captureResponse = await fetch(
      `https://api.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!captureResponse.ok) {
      const errData = await captureResponse.text();
      throw new Error(`PayPal capture failed: ${errData}`);
    }

    const captureData = await captureResponse.json();

    // Update transaction status
    const transactions = await base44.entities.PayPalTransaction.filter({
      order_id: orderId,
    });

    if (transactions.length > 0) {
      const tx = transactions[0];
      await base44.entities.PayPalTransaction.update(tx.id, {
        status: 'completed',
        transaction_id: captureData.id,
        payment_method: {
          email: captureData.payer?.email_address,
          name: `${captureData.payer?.name?.given_name} ${captureData.payer?.name?.surname}`,
          payer_id: captureData.payer?.payer_id,
        },
      });

      // Create Payment Record
      if (tx.metadata?.trainer_id) {
        const trainerUser = await base44.asServiceRole.entities.User.get(tx.metadata.trainer_id);
        const feePercent = trainerUser?.platform_fee_percent || 10;
        const platformFee = tx.amount * (feePercent / 100);
        const netAmount = tx.amount - platformFee;

        await base44.asServiceRole.entities.Payment.create({
          client_id: user.id,
          client_name: user.full_name,
          package_id: tx.item_id,
          package_name: tx.item_name,
          amount: tx.amount,
          platform_fee: platformFee,
          net_amount_to_trainer: netAmount,
          status: 'completed',
          payment_method: 'paypal',
          trainer_id: tx.metadata.trainer_id
        });

        // Create Trainer Earnings Record
        await base44.asServiceRole.entities.TrainerEarnings.create({
          trainer_id: tx.metadata.trainer_id,
          transaction_id: captureData.id,
          paypal_order_id: orderId,
          source: 'trainer_product',
          product_id: tx.item_id,
          product_name: tx.item_name,
          customer_id: user.id,
          gross_amount: tx.amount,
          platform_fee_percentage: feePercent,
          platform_fee_amount: platformFee,
          net_amount_to_trainer: netAmount,
          status: 'pending' // Pending for the daily payout cron
        });
      }

      // Send confirmation email
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `Payment Confirmed - ${tx.item_name}`,
        body: `Your payment of $${tx.amount} for ${tx.item_name} has been successfully processed. Thank you!`,
      });
    }

    return Response.json({
      success: true,
      message: 'Payment captured successfully',
      orderId: captureData.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});