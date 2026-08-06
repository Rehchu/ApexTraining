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

    const { itemId, itemName, amount, itemType, trainerId, billingFrequency, metadata } = await req.json();

    if (!itemId || !itemName || !amount || !itemType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Money goes to the platform by default to process the platform fee.
    // The auto-payout cron will forward the net earnings via Payouts API.

    const accessToken = await getPayPalAccessToken();

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: itemId,
          amount: {
            currency_code: 'USD',
            value: amount.toString(),
          },
          description: itemName,
          custom_id: JSON.stringify({
            user_id: user.id,
            item_id: itemId,
            item_type: itemType,
            metadata: metadata || {},
          }),
          // No payee set: platform collects the funds to split fees
        },
      ],
      application_context: {
        return_url: 'https://apextraining.dev/success', // Update with your domain
        cancel_url: 'https://apextraining.dev/cancel',
        locale: 'en-US',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
      },
    };

    const createOrderResponse = await fetch('https://api.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!createOrderResponse.ok) {
      const errData = await createOrderResponse.text();
      throw new Error(`PayPal order creation failed: ${errData}`);
    }

    const orderData = await createOrderResponse.json();

    // Store transaction record
    await base44.entities.PayPalTransaction.create({
      order_id: orderData.id,
      user_id: user.id,
      type: 'one_time',
      amount: parseFloat(amount),
      currency: 'USD',
      status: 'pending',
      item_type: itemType,
      item_id: itemId,
      item_name: itemName,
      billing_frequency: billingFrequency || 'one_time',
      metadata: { ...(metadata || {}), trainer_id: trainerId },
    });

    return Response.json({ orderId: orderData.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});