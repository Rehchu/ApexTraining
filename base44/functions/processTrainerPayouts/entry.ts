import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const MINIMUM_PAYOUT = 25; // $25 minimum threshold
const PLATFORM_NAME = "APEX COACH";

async function getPayPalAccessToken() {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  
  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch("https://api.sandbox.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("Failed to get PayPal access token");
  }

  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    let action = "auto_batch";
    let trainer_ids = [];
    try {
      const body = await req.json();
      action = body.action || "auto_batch";
      trainer_ids = body.trainer_ids || [];
    } catch (e) {
      // no body, defaults to auto_batch
    }

    if (action === "process_batch" || action === "auto_batch") {
      let trainers = [];
      if (action === "auto_batch") {
        trainers = await base44.asServiceRole.entities.User.filter({
          payout_method: "paypal",
          paypal_email: { $exists: true }
        });
      } else {
        trainers = await base44.asServiceRole.entities.User.filter({
          id: { $in: trainer_ids },
          paypal_email: { $exists: true }
        });
      }

      if (trainers.length === 0) {
        return Response.json({ error: 'No trainers with PayPal email found' }, { status: 400 });
      }

      const accessToken = await getPayPalAccessToken();
      const payouts = [];
      const timestamp = new Date().toISOString();
      const batchId = `APEX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      for (const trainer of trainers) {
        // Get trainer's pending earnings
        const earnings = await base44.asServiceRole.entities.TrainerEarnings.filter({
          trainer_id: trainer.id,
          status: "pending"
        });

        const totalAmount = earnings.reduce((sum, e) => sum + e.net_amount_to_trainer, 0);

        if (totalAmount < MINIMUM_PAYOUT) continue; // Skip if below threshold

        payouts.push({
          recipient_type: "EMAIL",
          amount: {
            value: totalAmount.toFixed(2),
            currency_code: "USD"
          },
          description: `${PLATFORM_NAME} Earnings Payout`,
          receiver: trainer.paypal_email,
          note: `Earnings from ${PLATFORM_NAME} - Period: ${timestamp}`
        });
      }

      if (payouts.length === 0) {
        return Response.json({ message: "No trainers eligible for payout" }, { status: 200 });
      }

      // Send batch payout to PayPal
      const payoutResponse = await fetch("https://api.sandbox.paypal.com/v1/payments/payouts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sender_batch_header: {
            sender_batch_id: batchId,
            email_subject: `Your ${PLATFORM_NAME} Earnings Payout`,
            email_message: `You have received your ${PLATFORM_NAME} earnings payout. Check your PayPal account for details.`
          },
          items: payouts
        })
      });

      const payoutData = await payoutResponse.json();

      if (!payoutResponse.ok) {
        console.error("PayPal payout error:", payoutData);
        return Response.json({
          error: "Failed to process payout",
          details: payoutData
        }, { status: 400 });
      }

      // Update earnings status to "payout_requested"
      for (const trainer of trainers) {
        const earnings = await base44.asServiceRole.entities.TrainerEarnings.filter({
          trainer_id: trainer.id,
          status: "pending"
        });

        for (const earning of earnings) {
          await base44.asServiceRole.entities.TrainerEarnings.update(earning.id, {
            status: "payout_requested",
            payout_batch_id: batchId
          });
        }
      }

      return Response.json({
        success: true,
        batch_id: payoutData.batch_header.payout_batch_id,
        items_processed: payouts.length
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error("Payout processing error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});