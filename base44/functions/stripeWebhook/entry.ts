import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const body = await req.text();
        const signature = req.headers.get('stripe-signature');

        if (!signature || !webhookSecret) {
            return Response.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
        }

        // Verify webhook signature
        const event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            webhookSecret
        );

        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const { packageId, clientId, trainerId, packageName, clientName } = session.metadata;

                // Update payment status
                const payments = await base44.asServiceRole.entities.Payment.filter({
                    stripe_payment_id: session.id
                });

                if (payments.length > 0) {
                    await base44.asServiceRole.entities.Payment.update(payments[0].id, {
                        status: 'completed',
                        paid_date: new Date().toISOString().split('T')[0]
                    });

                    // Create Trainer Earnings record
                    const payment = payments[0];
                    await base44.asServiceRole.entities.TrainerEarnings.create({
                        trainer_id: trainerId,
                        transaction_id: session.id,
                        source: 'trainer_product',
                        product_id: packageId,
                        product_name: packageName,
                        customer_id: clientId,
                        gross_amount: payment.amount,
                        platform_fee_percentage: payment.platform_fee ? (payment.platform_fee / payment.amount) * 100 : 10,
                        platform_fee_amount: payment.platform_fee || (payment.amount * 0.1),
                        net_amount_to_trainer: payment.net_amount_to_trainer || (payment.amount * 0.9),
                        status: 'paid', // Instant auto-payout via Stripe Connect
                        paid_date: new Date().toISOString()
                    });
                }

                // Create notification
                await base44.asServiceRole.entities.Notification.create({
                    user_id: trainerId,
                    type: 'message',
                    title: 'Payment Received',
                    message: `Payment received from ${clientName} for ${packageName}`,
                    metadata: { clientId, packageId }
                });

                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                
                // Update payment status to failed
                const payments = await base44.asServiceRole.entities.Payment.filter({
                    stripe_payment_id: paymentIntent.id
                });

                if (payments.length > 0) {
                    await base44.asServiceRole.entities.Payment.update(payments[0].id, {
                        status: 'failed'
                    });
                }

                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                const subscription = invoice.subscription;

                // Handle subscription payment
                if (subscription) {
                    // You can track recurring subscription payments here
                    console.log('Subscription payment succeeded:', subscription);
                }

                break;
            }

            case 'charge.refunded': {
                const charge = event.data.object;
                
                const refundedPayments = await base44.asServiceRole.entities.Payment.filter({
                    stripe_payment_id: charge.payment_intent
                });

                if (refundedPayments.length > 0) {
                    await base44.asServiceRole.entities.Payment.update(refundedPayments[0].id, {
                        status: 'refunded'
                    });
                }
                break;
            }

            case 'account.updated': {
                // Handle Stripe Connect account updates
                const account = event.data.object;
                if (account.charges_enabled && account.details_submitted) {
                    console.log('Account onboarding complete:', account.id);
                }
                break;
            }
        }

        return Response.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return Response.json({ error: error.message }, { status: 400 });
    }
});