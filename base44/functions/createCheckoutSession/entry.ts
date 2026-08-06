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

        const { 
            price_id, 
            connected_account_id, 
            success_url, 
            cancel_url,
            customer_email 
        } = await req.json();

        if (!price_id || !connected_account_id) {
            return Response.json({ 
                error: 'price_id and connected_account_id are required' 
            }, { status: 400 });
        }

        const origin = new URL(req.url).origin;

        /**
         * Create Checkout Session with Destination Charge
         * 
         * This creates a Stripe Checkout session where:
         * 1. Customer pays the platform
         * 2. Platform automatically transfers funds to the connected account
         * 3. Platform can take an application fee (5% in this example)
         * 
         * Key properties:
         * - line_items: What the customer is purchasing (using price_id from product)
         * - payment_intent_data.transfer_data.destination: The connected account receiving funds
         * - mode: 'payment' for one-time purchases (use 'subscription' for recurring)
         * - success_url: Where to redirect after successful payment
         * - cancel_url: Where to redirect if customer cancels
         * 
         * The checkout session URL is returned and should be used to redirect the customer.
         */
        const session = await stripeClient.checkout.sessions.create({
            line_items: [
                {
                    price: price_id, // Use the price ID from the product
                    quantity: 1,
                },
            ],
            mode: 'payment', // One-time payment (change to 'subscription' for recurring)
            
            /**
             * Destination Charge Configuration
             * 
             * transfer_data.destination: Automatically transfer funds to connected account
             * The platform can retain an application fee by setting it in payment_intent_data
             * 
             * Example with 5% platform fee on a $100 purchase:
             * - Customer pays: $100
             * - Connected account receives: $95
             * - Platform keeps: $5
             */
            payment_intent_data: {
                transfer_data: {
                    destination: connected_account_id, // Connected account receives the payment
                },
                // Optional: Add application fee (5% of total)
                // application_fee_amount: This would need to be calculated based on the price
            },
            
            success_url: success_url || `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancel_url || `${origin}/storefront`,
            
            // Optional: Pre-fill customer email if available
            ...(customer_email && { customer_email }),
        });

        return Response.json({ 
            session_id: session.id,
            url: session.url // Redirect customer to this URL
        });
    } catch (error) {
        console.error('❌ Failed to create checkout session:', error);
        return Response.json({ 
            error: error.message,
            details: 'Failed to create checkout session. Check that the price and connected account are valid.'
        }, { status: 500 });
    }
});