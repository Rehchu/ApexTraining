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

        const { refresh_url, return_url } = await req.json();

        // Check if user already has a connected account
        if (user.stripe_account_id) {
            // Create account link for existing account
            const accountLink = await stripe.accountLinks.create({
                account: user.stripe_account_id,
                refresh_url: refresh_url,
                return_url: return_url,
                type: 'account_onboarding',
            });

            return Response.json({ url: accountLink.url });
        }

        // Create new connected account
        const account = await stripe.accounts.create({
            type: 'express',
            email: user.email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_type: 'individual',
        });

        // Save account ID to user
        await base44.auth.updateMe({ stripe_account_id: account.id });

        // Create account link
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: refresh_url,
            return_url: return_url,
            type: 'account_onboarding',
        });

        return Response.json({ url: accountLink.url });
    } catch (error) {
        console.error('Stripe Connect error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});