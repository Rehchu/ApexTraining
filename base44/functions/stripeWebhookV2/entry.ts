import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

// Initialize Stripe client
const stripeClient = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_V2');

if (!Deno.env.get('STRIPE_SECRET_KEY')) {
    console.error('❌ STRIPE_SECRET_KEY is not set. Please add it to your environment variables.');
}

if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET_V2 is not set. Create a webhook endpoint in Stripe Dashboard and add the signing secret.');
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const body = await req.text();
        const signature = req.headers.get('stripe-signature');

        if (!signature || !webhookSecret) {
            return Response.json({ 
                error: 'Missing signature or webhook secret' 
            }, { status: 400 });
        }

        /**
         * Parse Thin Event
         * 
         * V2 webhooks use "thin" events which only contain the event ID and type.
         * You must fetch the full event data separately using the event ID.
         * 
         * Steps:
         * 1. Verify the webhook signature to ensure it's from Stripe
         * 2. Parse the thin event to get the event ID
         * 3. Retrieve the full event data using the event ID
         * 4. Handle the event based on its type
         * 
         * Common V2 event types for connected accounts:
         * - v2.core.account[requirements].updated: Account requirements changed
         * - v2.core.account[.recipient].capability_status_updated: Capability status changed
         */
        const thinEvent = stripeClient.parseThinEvent(body, signature, webhookSecret);

        // Fetch the full event data
        const event = await stripeClient.v2.core.events.retrieve(thinEvent.id);

        console.log('📥 Received webhook event:', event.type);

        // Handle different event types
        switch (event.type) {
            /**
             * Account Requirements Updated
             * 
             * This event fires when an account's requirements change, such as:
             * - New verification documents needed
             * - Additional information required
             * - Deadlines approaching or past due
             * 
             * You should notify the connected account owner to complete requirements.
             */
            case 'v2.core.account[requirements].updated': {
                const accountId = event.data.account;
                console.log('📋 Account requirements updated:', accountId);

                // Retrieve full account details to see what's needed
                const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
                    include: ['requirements'],
                });

                const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status;
                const currentlyDue = account.requirements?.summary?.currently_due || [];

                if (requirementsStatus === 'currently_due' || requirementsStatus === 'past_due') {
                    console.log('⚠️  Requirements need attention:', {
                        status: requirementsStatus,
                        currently_due: currentlyDue,
                    });

                    // TODO: Notify the account owner via email or in-app notification
                    // You could create a Notification entity record here
                }

                break;
            }

            /**
             * Capability Status Updated
             * 
             * This event fires when a capability status changes, such as:
             * - stripe_balance.stripe_transfers moving from 'pending' to 'active'
             * - Capability being disabled or restricted
             * 
             * When status becomes 'active', the account can receive payments.
             */
            case 'v2.core.account[.recipient].capability_status_updated': {
                const accountId = event.data.account;
                const capabilityStatus = event.data.status;

                console.log('🎯 Capability status updated:', {
                    account: accountId,
                    status: capabilityStatus,
                });

                if (capabilityStatus === 'active') {
                    console.log('✅ Account is now ready to receive payments!');
                    
                    // TODO: Update user record to reflect capability is active
                    // TODO: Send congratulatory notification to account owner
                }

                break;
            }

            default:
                console.log('ℹ️  Unhandled event type:', event.type);
        }

        return Response.json({ received: true, event_type: event.type });
    } catch (error) {
        console.error('❌ Webhook error:', error);
        return Response.json({ 
            error: error.message,
            details: 'Webhook processing failed. Check server logs for details.'
        }, { status: 400 });
    }
});

/**
 * Webhook Setup Instructions
 * 
 * 1. Go to Stripe Dashboard → Developers → Webhooks
 * 2. Click "+ Add destination"
 * 3. Select "Connected accounts" for events from
 * 4. Click "Show advanced options"
 * 5. Under "Payload style", select "Thin"
 * 6. In the "Events" field, type "v2" to search for V2 events
 * 7. Select these events:
 *    - v2.core.account[requirements].updated
 *    - v2.core.account[.recipient].capability_status_updated
 * 8. Enter your endpoint URL
 * 9. Copy the webhook signing secret and add it as STRIPE_WEBHOOK_SECRET_V2
 * 
 * For local testing with Stripe CLI:
 * ```bash
 * stripe listen --thin-events 'v2.core.account[requirements].updated,v2.core.account[.recipient].capability_status_updated' --forward-thin-to http://localhost:3000/webhook
 * ```
 */