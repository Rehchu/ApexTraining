import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recipe_url } = await req.json();
        
        if (!recipe_url || recipe_url.trim().length < 10) {
            return Response.json({ error: 'Please provide recipe URL' }, { status: 400 });
        }

        // Fetch the webpage content
        const response = await fetch(recipe_url);
        const html = await response.text();

        // Use AI to parse the recipe from the webpage with internet context
        const recipe = await base44.integrations.Core.InvokeLLM({
            prompt: `Parse this recipe webpage and extract all information into a structured format.

Extract the recipe from this page: ${recipe_url}

HTML CONTENT:
${html.substring(0, 50000)}

Extract:
- Recipe name
- Description (create a brief, appealing description if not provided)
- Category (breakfast, lunch, dinner, snack, smoothie, or dessert)
- Prep time in minutes
- Cook time in minutes
- Number of servings
- Ingredients list with amount and unit (e.g., "200g chicken breast", "2 eggs")
- Step-by-step instructions
- Nutritional info per serving: calories, protein, carbs, fat (estimate if not provided based on ingredients)
- Tags (e.g., high-protein, quick, healthy, vegan, low-carb, etc.)

If nutritional information is missing, make reasonable estimates based on the ingredients.`,
            response_json_schema: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    category: { 
                        type: "string",
                        enum: ["breakfast", "lunch", "dinner", "snack", "dessert", "smoothie"]
                    },
                    prep_time_minutes: { type: "number" },
                    cook_time_minutes: { type: "number" },
                    servings: { type: "number" },
                    ingredients: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                amount: { type: "number" },
                                unit: { type: "string" }
                            }
                        }
                    },
                    instructions: { type: "string" },
                    calories_per_serving: { type: "number" },
                    protein_per_serving: { type: "number" },
                    carbs_per_serving: { type: "number" },
                    fat_per_serving: { type: "number" },
                    tags: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        return Response.json({ 
            success: true,
            recipe: recipe
        });
    } catch (error) {
        console.error('❌ Failed to parse recipe:', error);
        return Response.json({ 
            error: error.message,
            details: 'Failed to parse recipe text.'
        }, { status: 500 });
    }
});