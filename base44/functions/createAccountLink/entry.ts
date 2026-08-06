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
                error: 'No connected account found. Please create an account first.' 
            }, { status: 400 });
        }

        const { refresh_url, return_url } = await req.json();

        /**
         * Create V2 Account Link for Onboarding
         * 
         * Account Links direct users through Stripe's onboarding flow to:
         * - Verify identity
         * - Add bank account details
         * - Accept terms of service
         * - Complete any requirements for accepting payments
         * 
         * Properties:
         * - account: The connected account ID to onboard
         * - use_case.type: 'account_onboarding' starts the onboarding process
         * - configurations: ['recipient'] - onboard as a payment recipient
         * - refresh_url: Where to redirect if the link expires or user needs to restart
         * - return_url: Where to redirect after successful completion
         * 
         * The account link expires after a short time and can only be used once.
         */
        const accountLink = await stripeClient.v2.core.accountLinks.create({
            account: user.stripe_account_id,
            use_case: {
                type: 'account_onboarding',
                account_onboarding: {
                    configurations: ['recipient'], // Onboard as payment recipient
                    refresh_url: refresh_url || `${new URL(req.url).origin}/settings`,
                    return_url: return_url || `${new URL(req.url).origin}/settings?onboarding=complete`,
                },
            },
        });

        return Response.json({ 
            url: accountLink.url,
            expires_at: accountLink.expires_at
        });
    } catch (error) {
        console.error('❌ Failed to create account link:', error);
        return Response.json({ 
            error: error.message,
            details: 'Failed to create onboarding link. The account may already be onboarded or there may be an issue with the account.'
        }, { status: 500 });
    }
});