import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Import Recipes from External Sources
 * 
 * This function scrapes recipe websites and imports recipes into the database.
 * It uses web scraping and AI to extract recipe information from popular fitness recipe sites.
 */

const RECIPE_SOURCES = [
  'https://www.trainerize.com/blog/70-high-protein-meals-in-10-minutes-for-trainers-and-nutrition-coaches/',
  'https://healthyfitnessmeals.com/',
  'https://fitnesstogether.com/tysons/blog/27-healthy-recipes',
  'https://truecoach.co/blog/100-macro-friendly-recipes-every-fitness-coach-should-use/',
  'https://www.fitbudd.com/post/10-personal-trainer-food-recipe-ideas-for-mass-building',
  'https://www.puregym.com/blog/recipes/',
  'https://www.getgoingpt.com.au/learning-hub/recipes/'
];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { source_url } = await req.json();
        
        // If no source URL provided, show available sources
        if (!source_url) {
            return Response.json({ 
                available_sources: RECIPE_SOURCES,
                message: 'Provide a source_url to import recipes from'
            });
        }

        /**
         * Use AI to extract recipes from the webpage
         * 
         * We'll fetch the page content and use InvokeLLM with web search
         * to extract structured recipe data
         */
        const recipeData = await base44.integrations.Core.InvokeLLM({
            prompt: `Extract all recipes from this URL: ${source_url}
            
            For each recipe, extract:
            - name: Recipe name
            - description: Brief description
            - category: breakfast, lunch, dinner, snack, or dessert
            - prep_time_minutes: Preparation time
            - cook_time_minutes: Cooking time
            - servings: Number of servings
            - ingredients: Array of ingredient objects with name, amount, unit
            - instructions: Cooking instructions
            - calories_per_serving: Calories per serving
            - protein_per_serving: Protein in grams
            - carbs_per_serving: Carbs in grams
            - fat_per_serving: Fat in grams
            - tags: Array of tags (e.g., "high-protein", "quick", "vegan", etc.)
            
            Return an array of recipe objects.`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    recipes: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                description: { type: "string" },
                                category: { type: "string" },
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
                    }
                }
            }
        });

        // Import recipes into database
        const importedRecipes = [];
        for (const recipe of recipeData.recipes || []) {
            const created = await base44.asServiceRole.entities.Recipe.create({
                ...recipe,
                trainer_id: user.id,
                // Store source information
                source_url: source_url,
                source_name: new URL(source_url).hostname
            });
            importedRecipes.push(created);
        }

        return Response.json({ 
            success: true,
            imported_count: importedRecipes.length,
            recipes: importedRecipes
        });
    } catch (error) {
        console.error('❌ Failed to import recipes:', error);
        return Response.json({ 
            error: error.message,
            details: 'Failed to import recipes from source. The URL may be invalid or the content could not be parsed.'
        }, { status: 500 });
    }
});