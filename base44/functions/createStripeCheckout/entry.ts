import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { packageId, clientId, successUrl, cancelUrl, itemType = 'package' } = await req.json();

        // Check if trainer has connected Stripe account
        if (!user.stripe_account_id || !user.stripe_onboarding_complete) {
            return Response.json({ 
                error: 'Please complete Stripe Connect setup in Settings to accept payments' 
            }, { status: 400 });
        }

        // Get package details
        const pkg = itemType === 'ticket' 
            ? await base44.entities.TicketTemplate.get(packageId)
            : await base44.entities.Package.get(packageId);
            
        const client = await base44.entities.Client.get(clientId);

        if (!pkg || !client) {
            return Response.json({ error: 'Package or client not found' }, { status: 404 });
        }

        // Create Stripe checkout session with connected account
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: pkg.name,
                        description: pkg.description || 'Training package',
                    },
                    unit_amount: Math.round(pkg.price * 100), // Convert to cents
                },
                quantity: 1,
            }],
            mode: (pkg.billing_frequency === 'one_time' || itemType === 'ticket') ? 'payment' : 'subscription',
            ...(pkg.billing_frequency === 'one_time' || itemType === 'ticket' ? {
                payment_intent_data: {
                    application_fee_amount: Math.round(pkg.price * 100 * ((user.platform_fee_percent || 10) / 100)),
                    transfer_data: {
                        destination: user.stripe_account_id,
                    },
                }
            } : {
                subscription_data: {
                    application_fee_percent: user.platform_fee_percent || 10,
                    transfer_data: {
                        destination: user.stripe_account_id,
                    }
                }
            }),
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                packageId: pkg.id,
                clientId: client.id,
                trainerId: user.id,
                packageName: pkg.name,
                clientName: client.full_name,
                itemType: itemType
            }
        });

        // Create payment record
        const platformFee = pkg.price * ((user.platform_fee_percent || 10) / 100);
        await base44.entities.Payment.create({
            client_id: clientId,
            client_name: client.full_name,
            package_id: packageId,
            package_name: pkg.name,
            amount: pkg.price,
            platform_fee: platformFee,
            net_amount_to_trainer: pkg.price - platformFee,
            status: 'pending',
            payment_method: 'card',
            stripe_payment_id: session.id,
            trainer_id: user.id
        });

        return Response.json({ 
            sessionId: session.id,
            url: session.url 
        });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});