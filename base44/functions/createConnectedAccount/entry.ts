import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

// Initialize Stripe client with secret key
// Make sure STRIPE_SECRET_KEY is set in your environment variables
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

        const { display_name, contact_email, country = 'US' } = await req.json();

        // Check if user already has a connected account
        if (user.stripe_account_id) {
            return Response.json({ 
                account_id: user.stripe_account_id,
                already_exists: true 
            });
        }

        /**
         * Create a V2 Connected Account
         * 
         * Using the V2 API allows for more flexibility and control.
         * Key properties:
         * - display_name: The business name shown to customers
         * - contact_email: Email for important account notifications
         * - identity.country: The country where the account is based (affects available features)
         * - dashboard: 'express' provides a simplified dashboard experience for connected accounts
         * - defaults.responsibilities: Platform handles fees and losses collection
         * - configuration.recipient.capabilities: Request stripe_balance capability for receiving transfers
         * 
         * IMPORTANT: Do NOT use top-level 'type' property (like type: 'express')
         * The account type is determined by the dashboard and configuration properties
         */
        const account = await stripeClient.v2.core.accounts.create({
            display_name: display_name || user.full_name || user.email,
            contact_email: contact_email || user.email,
            identity: {
                country: country,
            },
            dashboard: 'express', // Express dashboard for simplified user experience
            defaults: {
                responsibilities: {
                    fees_collector: 'application', // Platform collects fees
                    losses_collector: 'application', // Platform handles chargebacks/losses
                },
            },
            configuration: {
                recipient: {
                    capabilities: {
                        stripe_balance: {
                            stripe_transfers: {
                                requested: true, // Request ability to receive transfers
                            },
                        },
                    },
                },
            },
        });

        // Store the account ID in the user record for future reference
        await base44.auth.updateMe({ 
            stripe_account_id: account.id,
            stripe_onboarding_complete: false // Not complete until onboarding is done
        });

        return Response.json({ 
            account_id: account.id,
            status: 'created'
        });
    } catch (error) {
        console.error('❌ Failed to create connected account:', error);
        return Response.json({ 
            error: error.message,
            details: 'Failed to create Stripe connected account. Check server logs for details.'
        }, { status: 500 });
    }
});