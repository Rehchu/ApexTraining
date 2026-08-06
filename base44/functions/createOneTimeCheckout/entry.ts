import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId, clientId, trainerEmail, workoutPlanName } = await req.json();

    if (!priceId) {
      return Response.json({ error: 'priceId is required' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: `${origin}/Workouts?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${origin}/Workouts?status=cancelled`,
      customer_email: user.email,
      metadata: {
        clientId,
        trainerEmail,
        userId: user.id,
        workoutPlanName,
        type: 'one_time',
        appId: Deno.env.get('BASE44_APP_ID')
      }
    });

    return Response.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});