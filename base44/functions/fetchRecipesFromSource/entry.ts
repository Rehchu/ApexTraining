import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parse } from "npm:node-html-parser@6.1.13";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { source_url } = await req.json();
        
        if (!source_url) {
            return Response.json({ error: 'source_url is required' }, { status: 400 });
        }

        // Fetch the webpage HTML
        const response = await fetch(source_url);
        const html = await response.text();
        const root = parse(html);

        // Extract all text content from the page
        const pageText = root.textContent.slice(0, 80000);
        
        // Extract all headings and list items
        const headings = root.querySelectorAll('h1, h2, h3, h4, h5, li, strong, b').map(el => el.textContent.trim()).filter(t => t.length > 0 && t.length < 200);
        const allText = headings.join('\n').slice(0, 50000);

        // STEP 1: Extract just recipe NAMES first
        const recipeNames = await base44.integrations.Core.InvokeLLM({
            prompt: `Extract EVERY recipe name or meal title mentioned in this text. This is from a fitness recipe website.

TEXT:
${allText}

FULL PAGE CONTENT:
${pageText}

Extract all recipe names, meal titles, or food items mentioned. Look for:
- Numbered lists (1. Recipe Name, 2. Another Recipe)
- Bulleted lists
- Headings that are recipe names
- Any food/meal names mentioned

Return a simple list of recipe names. If the page says "70 recipes" or "100 recipes", extract ALL of them.
Just the names, nothing else. Include EVERY single recipe mentioned, even if it's just a title.`,
            response_json_schema: {
                type: "object",
                properties: {
                    recipe_names: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        // STEP 2: Convert names to full recipe objects
        const recipes = (recipeNames.recipe_names || []).map(name => {
            // Infer category from name
            let category = "dinner";
            const lowerName = name.toLowerCase();
            if (lowerName.includes("breakfast") || lowerName.includes("pancake") || lowerName.includes("oatmeal") || lowerName.includes("egg")) {
                category = "breakfast";
            } else if (lowerName.includes("smoothie") || lowerName.includes("shake")) {
                category = "smoothie";
            } else if (lowerName.includes("snack") || lowerName.includes("bar") || lowerName.includes("bites")) {
                category = "snack";
            } else if (lowerName.includes("salad") || lowerName.includes("bowl") || lowerName.includes("wrap") || lowerName.includes("sandwich")) {
                category = "lunch";
            }

            // Estimate macros based on category
            let calories = 400, protein = 30, carbs = 35, fat = 15;
            if (category === "breakfast") {
                calories = 350; protein = 25; carbs = 40; fat = 12;
            } else if (category === "smoothie") {
                calories = 250; protein = 20; carbs = 30; fat = 8;
            } else if (category === "snack") {
                calories = 200; protein = 15; carbs = 20; fat = 8;
            }

            // Generate basic ingredients from name
            const ingredients = [];
            if (lowerName.includes("chicken")) ingredients.push({ name: "Chicken breast", amount: 200, unit: "g" });
            if (lowerName.includes("beef")) ingredients.push({ name: "Lean beef", amount: 200, unit: "g" });
            if (lowerName.includes("fish") || lowerName.includes("salmon") || lowerName.includes("tuna")) {
                ingredients.push({ name: "Fish fillet", amount: 200, unit: "g" });
            }
            if (lowerName.includes("rice")) ingredients.push({ name: "Rice", amount: 100, unit: "g" });
            if (lowerName.includes("pasta")) ingredients.push({ name: "Pasta", amount: 100, unit: "g" });
            if (lowerName.includes("egg")) ingredients.push({ name: "Eggs", amount: 2, unit: "whole" });
            
            // Add default ingredients if none detected
            if (ingredients.length === 0) {
                ingredients.push({ name: "Main ingredient", amount: 200, unit: "g" });
                ingredients.push({ name: "Vegetables", amount: 100, unit: "g" });
            }

            // Generate tags
            const tags = ["quick"];
            if (protein >= 25) tags.push("high-protein");
            if (lowerName.includes("healthy")) tags.push("healthy");
            if (lowerName.includes("low-carb") || carbs < 20) tags.push("low-carb");
            if (lowerName.includes("vegan")) tags.push("vegan");

            return {
                name: name,
                description: `A delicious ${category} recipe featuring ${name.toLowerCase()}`,
                category: category,
                prep_time_minutes: 10,
                cook_time_minutes: 15,
                servings: 2,
                ingredients: ingredients,
                instructions: `1. Prepare ingredients\n2. Cook main components\n3. Combine and season\n4. Serve and enjoy`,
                calories_per_serving: calories,
                protein_per_serving: protein,
                carbs_per_serving: carbs,
                fat_per_serving: fat,
                tags: tags
            };
        });

        return Response.json({ 
            success: true,
            recipes: recipes,
            source_url: source_url,
            source_name: new URL(source_url).hostname
        });
    } catch (error) {
        console.error('❌ Failed to fetch recipes:', error);
        return Response.json({ 
            error: error.message,
            details: 'Failed to fetch recipes from source.'
        }, { status: 500 });
    }
});