import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function verifyPayPalWebhook(transmissionId, transmissionTime, certUrl, signatureAlgo, signature, webhook_id, eventBody) {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  
  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const verifyResponse = await fetch('https://api.sandbox.paypal.com/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: signatureAlgo,
      transmission_sig: signature,
      webhook_id: webhook_id,
      webhook_event: eventBody,
    }),
  });

  const result = await verifyResponse.json();
  return result.verification_status === 'SUCCESS';
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const event = await req.json();

    const transmissionId = req.headers.get('paypal-transmission-id');
    const transmissionTime = req.headers.get('paypal-transmission-time');
    const certUrl = req.headers.get('paypal-cert-url');
    const signatureAlgo = req.headers.get('paypal-auth-algo');
    const signature = req.headers.get('paypal-transmission-sig');
    const webhookId = 'YOUR_WEBHOOK_ID'; // Set this in PayPal dashboard

    // Verify webhook signature
    const isValid = await verifyPayPalWebhook(
      transmissionId,
      transmissionTime,
      certUrl,
      signatureAlgo,
      signature,
      webhookId,
      event
    );

    if (!isValid) {
      return Response.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const eventType = event.event_type;
    const resource = event.resource;

    if (eventType === 'BILLING.SUBSCRIPTION.CREATED') {
      // Subscription created
      const transactions = await base44.entities.PayPalTransaction.filter({
        order_id: resource.plan_id,
      });
      if (transactions.length > 0) {
        await base44.entities.PayPalTransaction.update(transactions[0].id, {
          status: 'completed',
          subscription_id: resource.id,
        });
      }
    } else if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      // Subscription activated
      const transactions = await base44.entities.PayPalTransaction.filter({
        subscription_id: resource.id,
      });
      if (transactions.length > 0) {
        const tx = transactions[0];
        await base44.entities.PayPalTransaction.update(tx.id, {
          status: 'completed',
        });
        
        // Update user role if platform subscription
        if (tx.item_type === 'platform_subscription') {
          try {
            await base44.asServiceRole.auth.updateUser(tx.user_id, {
              role: 'premium',
            });
          } catch (e) {
            console.log('Note: Could not update user role');
          }
        }
      }
    } else if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED') {
      // Subscription cancelled
      const transactions = await base44.entities.PayPalTransaction.filter({
        subscription_id: resource.id,
      });
      if (transactions.length > 0) {
        await base44.entities.PayPalTransaction.update(transactions[0].id, {
          status: 'cancelled',
        });
      }
    } else if (eventType === 'CHECKOUT.ORDER.COMPLETED') {
      // Order completed
      const transactions = await base44.entities.PayPalTransaction.filter({
        order_id: resource.id,
      });
      if (transactions.length > 0) {
        await base44.entities.PayPalTransaction.update(transactions[0].id, {
          status: 'completed',
          transaction_id: resource.id,
        });
      }
    } else if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      // Payment captured
      const transactions = await base44.entities.PayPalTransaction.filter({
        transaction_id: resource.id,
      });
      if (transactions.length > 0) {
        const tx = transactions[0];
        await base44.entities.PayPalTransaction.update(tx.id, {
          status: 'completed',
        });

        // Calculate trainer earnings if this is a trainer product sale
        if (tx.item_type === 'trainer_product' && tx.metadata?.trainer_id) {
          try {
            const earningResult = await base44.functions.invoke('calculateTrainerEarnings', {
              orderId: tx.order_id,
              transactionId: tx.transaction_id,
              trainerId: tx.metadata.trainer_id,
              productId: tx.item_id,
              productName: tx.item_name,
              customerId: tx.user_id,
              grossAmount: tx.amount,
              source: 'trainer_product'
            });
            console.log('TrainerEarnings created:', earningResult);
          } catch (e) {
            console.error('Failed to create trainer earnings:', e);
          }
        }
      }
    } else if (eventType === 'PAYMENT.CAPTURE.DENIED') {
      // Payment denied
      const transactions = await base44.entities.PayPalTransaction.filter({
        transaction_id: resource.id,
      });
      if (transactions.length > 0) {
        await base44.entities.PayPalTransaction.update(transactions[0].id, {
          status: 'failed',
        });
      }
    }

    return Response.json({ success: true, event_type: eventType });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});