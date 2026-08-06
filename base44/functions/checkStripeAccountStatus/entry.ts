import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

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
                charges_enabled: false,
                details_submitted: false 
            });
        }

        const account = await stripe.accounts.retrieve(user.stripe_account_id);

        const isComplete = account.charges_enabled && account.details_submitted;

        // Update user if onboarding is complete
        if (isComplete && !user.stripe_onboarding_complete) {
            await base44.auth.updateMe({ stripe_onboarding_complete: true });
        }

        return Response.json({
            connected: true,
            charges_enabled: account.charges_enabled,
            details_submitted: account.details_submitted,
            onboarding_complete: isComplete
        });
    } catch (error) {
        console.error('Status check error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});