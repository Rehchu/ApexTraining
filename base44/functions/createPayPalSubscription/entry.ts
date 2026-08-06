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

    const { itemId, itemName, amount, billingCycle, trainerId, metadata } = await req.json();

    if (!itemId || !itemName || !amount || !billingCycle) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // For automatic platform fee deductions, all PayPal payments are routed to the platform first.
    // Daily auto-payout cron will forward net earnings via Payouts API.

    const accessToken = await getPayPalAccessToken();

    // Map billing cycle to PayPal interval
    const intervalMap = {
      monthly: { interval_unit: 'MONTH', interval_count: 1 },
      yearly: { interval_unit: 'YEAR', interval_count: 1 },
    };

    const interval = intervalMap[billingCycle] || intervalMap.monthly;

    // Create billing plan
    const planPayload = {
      product_id: 'PROD-' + itemId,
      name: itemName,
      description: `Subscription to ${itemName}`,
      billing_cycles: [
        {
          frequency: {
            interval_unit: interval.interval_unit,
            interval_count: interval.interval_count,
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // Indefinite
          pricing_scheme: {
            fixed_price: {
              value: amount.toString(),
              currency_code: 'USD',
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_amount: 'YES',
        setup_fee: {
          value: '0',
          currency_code: 'USD',
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
      // No payee set: platform collects the funds to split fees
      taxes: {
        percentage: '0',
      },
    };

    const planResponse = await fetch('https://api.sandbox.paypal.com/v1/billing/plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(planPayload),
    });

    if (!planResponse.ok) {
      const errData = await planResponse.text();
      throw new Error(`PayPal plan creation failed: ${errData}`);
    }

    const planData = await planResponse.json();

    // Store subscription transaction
    await base44.entities.PayPalTransaction.create({
      order_id: planData.id,
      user_id: user.id,
      type: 'subscription',
      amount: parseFloat(amount),
      currency: 'USD',
      status: 'pending',
      item_type: 'platform_subscription',
      item_id: itemId,
      item_name: itemName,
      billing_frequency: billingCycle,
      metadata: metadata || {},
    });

    return Response.json({
      planId: planData.id,
      subscriptionUrl: `https://www.sandbox.paypal.com/subscribe?plan_id=${planData.id}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});