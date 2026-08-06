import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const MINIMUM_PAYOUT_THRESHOLD = 50; // Minimum $50 to request payout

/**
 * Trainer requests payout of pending earnings
 * Creates a TrainerPayout record and stores pending earnings
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get pending earnings for this trainer
    const pendingEarnings = await base44.entities.TrainerEarnings.filter({
      trainer_id: user.id,
      status: 'pending'
    });

    if (pendingEarnings.length === 0) {
      return Response.json({
        success: false,
        error: 'No pending earnings to request payout'
      }, { status: 400 });
    }

    // Calculate total
    const totalAmount = pendingEarnings.reduce((sum, e) => sum + e.net_amount_to_trainer, 0);

    if (totalAmount < MINIMUM_PAYOUT_THRESHOLD) {
      return Response.json({
        success: false,
        error: `Minimum payout threshold is $${MINIMUM_PAYOUT_THRESHOLD}. Your pending amount: $${totalAmount.toFixed(2)}`
      }, { status: 400 });
    }

    // Check if trainer has PayPal email
    const trainerData = await base44.auth.me();
    if (!trainerData.paypal_email) {
      return Response.json({
        success: false,
        error: 'Please add your PayPal email in profile settings before requesting a payout'
      }, { status: 400 });
    }

    // Create TrainerPayout record
    const payout = await base44.entities.TrainerPayout.create({
      trainer_id: user.id,
      trainer_name: user.full_name || user.email,
      trainer_email: user.email,
      paypal_email: trainerData.paypal_email,
      total_amount: totalAmount,
      payout_items_count: pendingEarnings.length,
      earning_ids: pendingEarnings.map(e => e.id),
      status: 'pending',
      requested_date: new Date().toISOString()
    });

    // Update all earnings to payout_requested status
    for (const earning of pendingEarnings) {
      await base44.entities.TrainerEarnings.update(earning.id, {
        status: 'payout_requested'
      });
    }

    console.log(`Payout requested by trainer ${user.id}: $${totalAmount.toFixed(2)}`);

    return Response.json({
      success: true,
      payout_id: payout.id,
      total_amount: totalAmount,
      message: `Payout request submitted. Admin will review and process within 2-3 business days.`
    });
  } catch (error) {
    console.error('Error requesting payout:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});