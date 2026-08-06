import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Called from payment webhook to create TrainerEarnings record
 * Calculates platform fee based on source and creates earnings entry
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId, transactionId, trainerId, productId, productName, customerId, grossAmount, source } = await req.json();

    // Validate required fields
    if (!trainerId || !transactionId || !grossAmount) {
      return Response.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Determine fee based on source
    let platformFeePercentage = 0;
    if (source === 'trainer_product') {
      platformFeePercentage = 20; // 20% on trainer storefront
    } else if (source === 'platform_subscription') {
      platformFeePercentage = 0; // No fee on platform subscriptions
    }

    const platformFeeAmount = (grossAmount * platformFeePercentage) / 100;
    const netAmount = grossAmount - platformFeeAmount;

    // Create TrainerEarnings record
    const earning = await base44.asServiceRole.entities.TrainerEarnings.create({
      trainer_id: trainerId,
      transaction_id: transactionId,
      paypal_order_id: orderId,
      source: source,
      product_id: productId,
      product_name: productName,
      customer_id: customerId,
      gross_amount: grossAmount,
      platform_fee_percentage: platformFeePercentage,
      platform_fee_amount: platformFeeAmount,
      net_amount_to_trainer: netAmount,
      status: 'pending'
    });

    console.log(`TrainerEarnings created: ${earning.id} for trainer ${trainerId}, amount: $${netAmount}`);

    return Response.json({
      success: true,
      earning_id: earning.id,
      net_amount: netAmount,
      platform_fee: platformFeeAmount
    });
  } catch (error) {
    console.error('Error calculating trainer earnings:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});