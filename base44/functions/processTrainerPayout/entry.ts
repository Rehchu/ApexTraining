import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PAYPAL_API_BASE = 'https://api.sandbox.paypal.com'; // Change to https://api.paypal.com for live

/**
 * Get PayPal access token
 */
async function getPayPalAccessToken() {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Missing PayPal credentials');
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('Failed to get PayPal access token');
  }

  return data.access_token;
}

/**
 * Submit payout to PayPal
 */
async function submitPayPalPayout(accessToken, payoutData) {
  const response = await fetch(`${PAYPAL_API_BASE}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(payoutData)
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('PayPal Payout Error:', data);
    throw new Error(data.message || 'Payout submission failed');
  }

  return data;
}

/**
 * Main handler: Submit trainer payout to PayPal
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can process payouts
    if (user?.role !== 'admin') {
      return Response.json({
        success: false,
        error: 'Unauthorized: Admin access required'
      }, { status: 403 });
    }

    const { payoutId } = await req.json();

    if (!payoutId) {
      return Response.json({
        success: false,
        error: 'Missing payout ID'
      }, { status: 400 });
    }

    // Get payout record
    const payout = await base44.asServiceRole.entities.TrainerPayout.get(payoutId);

    if (!payout) {
      return Response.json({
        success: false,
        error: 'Payout not found'
      }, { status: 404 });
    }

    if (payout.status !== 'pending' && payout.status !== 'failed') {
      return Response.json({
        success: false,
        error: `Cannot process payout with status: ${payout.status}`
      }, { status: 400 });
    }

    // Get trainer's PayPal email
    if (!payout.paypal_email) {
      return Response.json({
        success: false,
        error: 'Trainer has no PayPal email on file'
      }, { status: 400 });
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Prepare payout data for PayPal
    const payoutData = {
      sender_batch_header: {
        sender_batch_id: `trainer_payout_${payout.id}_${Date.now()}`,
        email_subject: 'You received a payout from ApexCoach',
        email_message: `You have received a payout for your trainer earnings. Amount: $${payout.total_amount.toFixed(2)}`
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: payout.total_amount.toFixed(2),
            currency: 'USD'
          },
          description: `ApexCoach Trainer Payout - ${payout.payout_items_count} transactions`,
          sender_item_id: `item_${payout.id}`,
          receiver: payout.paypal_email
        }
      ]
    };

    // Submit to PayPal
    const paypalResponse = await submitPayPalPayout(accessToken, payoutData);

    // Update payout record
    await base44.asServiceRole.entities.TrainerPayout.update(payoutId, {
      paypal_payout_id: paypalResponse.batch_header.payout_batch_id,
      paypal_batch_status: paypalResponse.batch_header.batch_status,
      status: 'submitted',
      submitted_date: new Date().toISOString()
    });

    // Mark earnings as "payout_requested"
    for (const earningId of payout.earning_ids) {
      await base44.asServiceRole.entities.TrainerEarnings.update(earningId, {
        status: 'payout_requested',
        payout_id: paypalResponse.batch_header.payout_batch_id
      });
    }

    // Send email notification to trainer (optional)
    try {
      await base44.integrations.Core.SendEmail({
        to: payout.trainer_email,
        subject: 'Your Payout has been Submitted',
        body: `Hi ${payout.trainer_name},\n\nYour payout request of $${payout.total_amount.toFixed(2)} has been submitted and is being processed.\n\nPayPal Batch ID: ${paypalResponse.batch_header.payout_batch_id}\n\nFunds should arrive within 1-3 business days.\n\nBest regards,\nApexCoach`
      });
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
    }

    console.log(`Payout submitted to PayPal - Batch ID: ${paypalResponse.batch_header.payout_batch_id}`);

    return Response.json({
      success: true,
      payout_id: payoutId,
      paypal_batch_id: paypalResponse.batch_header.payout_batch_id,
      status: paypalResponse.batch_header.batch_status
    });
  } catch (error) {
    console.error('Error processing payout:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});