import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mealPlanId } = await req.json();

    if (!mealPlanId) {
      return Response.json({ error: 'mealPlanId is required' }, { status: 400 });
    }

    // Get the meal plan
    const mealPlan = await base44.entities.MealPlan.get(mealPlanId);

    if (!mealPlan) {
      return Response.json({ error: 'Meal plan not found' }, { status: 404 });
    }

    // Check access
    if (mealPlan.trainer_id !== user.id && mealPlan.client_id !== user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Aggregate all foods from daily_meals
    const foodMap = {};
    const dailyMeals = mealPlan.daily_meals || {};

    for (const dayNum in dailyMeals) {
      const dayMeals = dailyMeals[dayNum];
      for (const mealType in dayMeals) {
        const meal = dayMeals[mealType];
        const foods = meal.foods || [];

        for (const food of foods) {
          const key = `${food.fdc_id || food.name}`;
          
          if (foodMap[key]) {
            // Aggregate quantity
            foodMap[key].amount += food.amount || 1;
          } else {
            foodMap[key] = {
              name: food.name,
              fdc_id: food.fdc_id,
              unit: food.unit || 'serving',
              amount: food.amount || 1,
              calories: food.calories || 0,
              protein: food.protein || 0,
              carbs: food.carbs || 0,
              fat: food.fat || 0
            };
          }
        }
      }
    }

    // Convert to array and sort
    const shoppingList = Object.values(foodMap).sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({
      mealPlanName: mealPlan.name,
      shoppingList,
      totalItems: shoppingList.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});