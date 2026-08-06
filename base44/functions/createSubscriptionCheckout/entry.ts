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

    const { packageId, packageName, packagePrice, clientId, clientEmail, trainerEmail } = await req.json();

    if (!packagePrice) {
      return Response.json({ error: 'packagePrice is required' }, { status: 400 });
    }

    // Get the origin from request headers
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: packageName
            },
            unit_amount: Math.round(packagePrice * 100)
          },
          quantity: 1
        }
      ],
      success_url: `${origin}/Payments?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${origin}/Payments?status=cancelled`,
      customer_email: clientEmail || user.email,
      metadata: {
        clientId,
        packageId,
        trainerEmail,
        userId: user.id,
        appId: Deno.env.get('BASE44_APP_ID')
      }
    });

    return Response.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});