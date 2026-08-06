import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { query, pageSize = 25 } = await req.json();

        if (!query) {
            return Response.json({ error: 'Query parameter is required' }, { status: 400 });
        }

        const apiKey = Deno.env.get("USDA_FOOD_SEARCH_API_KEY");
        // Search across branded, SR Legacy, and Foundation foods for better coverage
        const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=${pageSize}&dataType=Branded,SR%20Legacy,Foundation&api_key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        const getCalories = (nutrients) => {
            return nutrients?.find(n => n.nutrientName === "Energy" && n.unitName === "KCAL")?.value
                || nutrients?.find(n => n.nutrientName === "Energy")?.value
                || 0;
        };

        const foods = data.foods?.map(food => ({
            fdc_id: food.fdcId,
            name: food.description + (food.brandName ? ` (${food.brandName})` : ''),
            brand: food.brandName || food.brandOwner,
            calories: getCalories(food.foodNutrients),
            protein: food.foodNutrients?.find(n => n.nutrientName === "Protein")?.value || 0,
            carbs: food.foodNutrients?.find(n => n.nutrientName === "Carbohydrate, by difference")?.value || 0,
            fat: food.foodNutrients?.find(n => n.nutrientName === "Total lipid (fat)")?.value || 0,
            serving_size: food.servingSize || 100,
            serving_unit: food.servingSizeUnit || "g"
        })) || [];

        return Response.json({ foods });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});