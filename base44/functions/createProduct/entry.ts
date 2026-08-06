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

        if (!user.stripe_account_id || !user.stripe_onboarding_complete) {
            return Response.json({ 
                error: 'Please complete Stripe onboarding before creating products' 
            }, { status: 400 });
        }

        const { name, description, price, currency = 'usd', image_url } = await req.json();

        if (!name || !price) {
            return Response.json({ 
                error: 'Product name and price are required' 
            }, { status: 400 });
        }

        /**
         * Create Product at Platform Level
         * 
         * Products are created on the PLATFORM account, not the connected account.
         * This allows the platform to control pricing and product catalog.
         * 
         * Key properties:
         * - name: Product name shown to customers
         * - description: Optional product description
         * - default_price_data: Embedded price configuration
         *   - unit_amount: Price in cents (e.g., 5000 = $50.00)
         *   - currency: Three-letter ISO currency code (usd, eur, gbp, etc.)
         * - images: Array of image URLs to display
         * - metadata: Store the connected account ID to know who owns this product
         * 
         * The product ID and price ID are returned and can be used in checkout sessions.
         */
        const product = await stripeClient.products.create({
            name: name,
            description: description || '',
            default_price_data: {
                unit_amount: Math.round(price * 100), // Convert dollars to cents
                currency: currency.toLowerCase(),
            },
            images: image_url ? [image_url] : [],
            metadata: {
                // Store the connected account ID to map product to seller
                connected_account_id: user.stripe_account_id,
                trainer_id: user.id,
                trainer_name: user.full_name || user.email,
            },
        });

        // Return product details for frontend to save
        return Response.json({ 
            product_id: product.id,
            price_id: product.default_price,
            name: product.name,
            amount: price,
            currency: currency
        });
    } catch (error) {
        console.error('❌ Failed to create product:', error);
        return Response.json({ 
            error: error.message,
            details: 'Failed to create product. Check that all required fields are provided.'
        }, { status: 500 });
    }
});