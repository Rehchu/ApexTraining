import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { trainerId, itemId, itemName, amount, method } = await req.json();

    if (!trainerId || !itemId || amount === undefined || !method) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create Payment
    await base44.asServiceRole.entities.Payment.create({
      client_id: user.id,
      client_name: user.full_name,
      package_id: itemId,
      package_name: itemName,
      amount: parseFloat(amount),
      status: 'completed',
      payment_method: method,
      trainer_id: trainerId
    });

    // Create Trainer Earnings
    await base44.asServiceRole.entities.TrainerEarnings.create({
      trainer_id: trainerId,
      transaction_id: `manual_${Date.now()}`,
      paypal_order_id: '',
      source: 'trainer_product',
      product_id: itemId,
      product_name: itemName,
      customer_id: user.id,
      gross_amount: parseFloat(amount),
      platform_fee_percentage: 0,
      platform_fee_amount: 0,
      net_amount_to_trainer: parseFloat(amount),
      status: 'paid'
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});