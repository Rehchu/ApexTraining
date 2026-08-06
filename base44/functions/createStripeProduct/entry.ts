import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { name, description, prices } = await req.json();

    if (!name || !prices || prices.length === 0) {
      return Response.json({ error: 'name and prices are required' }, { status: 400 });
    }

    // Create product
    const product = await stripe.products.create({
      name,
      description,
      metadata: { app_id: Deno.env.get('BASE44_APP_ID') }
    });

    // Create prices
    const priceObjects = [];
    for (const price of prices) {
      const priceObj = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(price.amount * 100), // Convert to cents
        currency: 'usd',
        type: price.recurring ? 'recurring' : 'one_time',
        ...(price.recurring && {
          recurring: {
            interval: price.recurring.interval, // 'month' or 'year'
            interval_count: price.recurring.interval_count || 1
          }
        }),
        metadata: { name: price.name }
      });
      priceObjects.push(priceObj);
    }

    return Response.json({
      productId: product.id,
      prices: priceObjects.map(p => ({
        id: p.id,
        name: p.metadata.name,
        amount: p.unit_amount / 100,
        recurring: p.recurring
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});