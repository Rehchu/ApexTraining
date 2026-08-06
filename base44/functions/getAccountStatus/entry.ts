import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

// Initialize Stripe client
const stripeClient = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

if (!Deno.env.get('STRIPE_SECRET_KEY')) {
    console.error('❌ STRIPE_SECRET_KEY is not set. Please add it to your environment variables.');
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!user.stripe_account_id) {
            return Response.json({ 
                connected: false,
                ready_to_receive_payments: false,
                onboarding_complete: false
            });
        }

        /**
         * Retrieve V2 Account with Configuration and Requirements
         * 
         * The 'include' parameter expands nested objects:
         * - configuration.recipient: Details about recipient configuration
         * - requirements: Information about what's needed to complete onboarding
         * 
         * Key status indicators:
         * 1. readyToReceivePayments: Can the account receive transfers?
         *    - Checks if stripe_balance capability status is 'active'
         * 
         * 2. onboardingComplete: Are all requirements satisfied?
         *    - Checks if requirements.summary.minimum_deadline.status is not 'currently_due' or 'past_due'
         */
        const account = await stripeClient.v2.core.accounts.retrieve(
            user.stripe_account_id,
            {
                include: ['configuration.recipient', 'requirements'],
            }
        );

        // Check if the account can receive payments
        const readyToReceivePayments = 
            account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === 'active';

        // Check if onboarding requirements are complete
        const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status;
        const onboardingComplete = 
            requirementsStatus !== 'currently_due' && 
            requirementsStatus !== 'past_due';

        // Update user record if onboarding is now complete
        if (onboardingComplete && !user.stripe_onboarding_complete) {
            await base44.auth.updateMe({ stripe_onboarding_complete: true });
        }

        return Response.json({
            connected: true,
            ready_to_receive_payments: readyToReceivePayments,
            onboarding_complete: onboardingComplete,
            account_id: account.id,
            display_name: account.display_name,
            requirements_status: requirementsStatus,
            // Include any currently due requirements for debugging
            currently_due: account.requirements?.summary?.currently_due || [],
        });
    } catch (error) {
        console.error('❌ Failed to retrieve account status:', error);
        return Response.json({ 
            error: error.message,
            details: 'Failed to check account status. The account may have been deleted or there may be an API issue.'
        }, { status: 500 });
    }
});