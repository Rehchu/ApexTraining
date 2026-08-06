import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')
    );

    const base44 = createClientFromRequest(req);

    // Handle subscription events
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const clientId = subscription.metadata.clientId;
      const userId = subscription.metadata.userId;

      if (clientId && userId) {
        // Update client subscription status
        const client = await base44.asServiceRole.entities.Client.get(clientId);
        if (client) {
          await base44.asServiceRole.entities.Client.update(clientId, {
            ...client,
            subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscription_current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null
          });
        }

        // Create or update payment record
        await base44.asServiceRole.entities.Payment.create({
          client_id: clientId,
          amount: subscription.items.data[0].price.unit_amount / 100,
          status: subscription.status === 'active' ? 'completed' : 'pending',
          payment_method: 'card',
          stripe_payment_id: subscription.id,
          trainer_id: subscription.metadata.trainerEmail,
          paid_date: new Date().toISOString()
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const clientId = subscription.metadata.clientId;

      if (clientId) {
        const client = await base44.asServiceRole.entities.Client.get(clientId);
        if (client) {
          await base44.asServiceRole.entities.Client.update(clientId, {
            ...client,
            subscription_status: 'cancelled'
          });
        }
      }
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const clientId = session.metadata?.clientId;
      const userId = session.metadata?.userId;

      if (clientId && userId) {
        const client = await base44.asServiceRole.entities.Client.get(clientId);
        if (client) {
          await base44.asServiceRole.entities.Client.update(clientId, {
            ...client,
            subscription_id: session.subscription
          });
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});