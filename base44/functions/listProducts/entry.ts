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

        /**
         * List All Products from Platform
         * 
         * This retrieves all products created at the platform level.
         * Products contain metadata with the connected account ID, allowing us to
         * identify which seller owns each product.
         * 
         * The products are expanded to include:
         * - default_price: The pricing information
         * 
         * This is used to display a marketplace/storefront of all available products.
         */
        const products = await stripeClient.products.list({
            active: true, // Only show active products
            expand: ['data.default_price'], // Include price details
            limit: 100, // Adjust as needed
        });

        // Transform products to include seller information from metadata
        const productsWithSellers = products.data.map(product => ({
            id: product.id,
            name: product.name,
            description: product.description,
            images: product.images,
            price: product.default_price?.unit_amount / 100, // Convert cents to dollars
            currency: product.default_price?.currency,
            price_id: product.default_price?.id,
            // Seller information from metadata
            seller: {
                account_id: product.metadata?.connected_account_id,
                trainer_id: product.metadata?.trainer_id,
                trainer_name: product.metadata?.trainer_name,
            },
        }));

        return Response.json({ 
            products: productsWithSellers,
            count: productsWithSellers.length
        });
    } catch (error) {
        console.error('❌ Failed to list products:', error);
        return Response.json({ 
            error: error.message,
            details: 'Failed to retrieve products from Stripe.'
        }, { status: 500 });
    }
});