import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Curated library of popular fitness recipes with full details
const CURATED_RECIPES = [
  // Breakfast
  {
    name: "Greek Yogurt Protein Bowl",
    category: "breakfast",
    prep_time_minutes: 5,
    cook_time_minutes: 0,
    servings: 1,
    calories_per_serving: 320,
    protein_per_serving: 30,
    carbs_per_serving: 35,
    fat_per_serving: 8,
    tags: ["high-protein", "quick", "no-cook"],
    ingredients: [
      { name: "Greek yogurt", amount: 200, unit: "g" },
      { name: "Protein powder (vanilla)", amount: 30, unit: "g" },
      { name: "Granola", amount: 30, unit: "g" },
      { name: "Mixed berries", amount: 100, unit: "g" },
      { name: "Honey", amount: 1, unit: "tbsp" },
      { name: "Sliced almonds", amount: 15, unit: "g" }
    ],
    instructions: "1. Add Greek yogurt to a bowl\n2. Mix in protein powder until smooth\n3. Top with granola, berries, sliced almonds, and drizzle with honey\n4. Serve immediately"
  },
  {
    name: "Egg White Veggie Scramble",
    category: "breakfast",
    prep_time_minutes: 5,
    cook_time_minutes: 10,
    servings: 1,
    calories_per_serving: 180,
    protein_per_serving: 25,
    carbs_per_serving: 12,
    fat_per_serving: 4,
    tags: ["high-protein", "quick", "low-carb"],
    ingredients: [
      { name: "Egg whites", amount: 200, unit: "ml" },
      { name: "Bell peppers", amount: 50, unit: "g" },
      { name: "Spinach", amount: 50, unit: "g" },
      { name: "Mushrooms", amount: 50, unit: "g" },
      { name: "Onion", amount: 30, unit: "g" },
      { name: "Olive oil spray", amount: 1, unit: "spray" }
    ],
    instructions: "1. Heat a non-stick pan with olive oil spray\n2. Sauté chopped vegetables until soft\n3. Pour in egg whites and scramble until cooked\n4. Season with salt and pepper to taste"
  },
  {
    name: "Protein Pancakes",
    category: "breakfast",
    prep_time_minutes: 5,
    cook_time_minutes: 10,
    servings: 2,
    calories_per_serving: 280,
    protein_per_serving: 28,
    carbs_per_serving: 30,
    fat_per_serving: 6,
    tags: ["high-protein", "quick"],
    ingredients: [
      { name: "Oat flour", amount: 100, unit: "g" },
      { name: "Protein powder (vanilla)", amount: 60, unit: "g" },
      { name: "Egg whites", amount: 120, unit: "ml" },
      { name: "Banana (mashed)", amount: 1, unit: "medium" },
      { name: "Almond milk", amount: 120, unit: "ml" },
      { name: "Baking powder", amount: 1, unit: "tsp" }
    ],
    instructions: "1. Mix all dry ingredients in a bowl\n2. Add wet ingredients and stir until combined\n3. Pour batter onto a heated non-stick pan\n4. Cook until bubbles form, flip, and cook until golden\n5. Serve with berries and sugar-free syrup"
  },
  {
    name: "Overnight Oats with Protein",
    category: "breakfast",
    prep_time_minutes: 5,
    cook_time_minutes: 0,
    servings: 1,
    calories_per_serving: 350,
    protein_per_serving: 25,
    carbs_per_serving: 45,
    fat_per_serving: 8,
    tags: ["high-protein", "make-ahead", "no-cook"],
    ingredients: [
      { name: "Rolled oats", amount: 50, unit: "g" },
      { name: "Protein powder", amount: 30, unit: "g" },
      { name: "Almond milk", amount: 200, unit: "ml" },
      { name: "Chia seeds", amount: 1, unit: "tbsp" },
      { name: "Berries", amount: 80, unit: "g" },
      { name: "Honey", amount: 1, unit: "tsp" }
    ],
    instructions: "1. Combine oats, protein powder, almond milk, and chia seeds in a jar\n2. Stir well and refrigerate overnight\n3. In the morning, top with berries and honey\n4. Enjoy cold or heat if preferred"
  },
  {
    name: "Grilled Chicken Salad",
    category: "lunch",
    prep_time_minutes: 10,
    cook_time_minutes: 15,
    servings: 1,
    calories_per_serving: 350,
    protein_per_serving: 40,
    carbs_per_serving: 25,
    fat_per_serving: 10,
    tags: ["high-protein", "healthy"],
    ingredients: [
      { name: "Chicken breast", amount: 150, unit: "g" },
      { name: "Mixed greens", amount: 100, unit: "g" },
      { name: "Cherry tomatoes", amount: 60, unit: "g" },
      { name: "Cucumber", amount: 50, unit: "g" },
      { name: "Red onion", amount: 20, unit: "g" },
      { name: "Balsamic vinaigrette", amount: 2, unit: "tbsp" }
    ],
    instructions: "1. Season and grill chicken breast until cooked through\n2. Slice chicken and let rest\n3. Combine greens, tomatoes, cucumber, and onion in a bowl\n4. Top with sliced chicken and drizzle with vinaigrette"
  },
  {
    name: "Grilled Salmon with Asparagus",
    category: "dinner",
    prep_time_minutes: 10,
    cook_time_minutes: 20,
    servings: 2,
    calories_per_serving: 380,
    protein_per_serving: 40,
    carbs_per_serving: 15,
    fat_per_serving: 18,
    tags: ["high-protein", "healthy", "omega-3"],
    ingredients: [
      { name: "Salmon fillet", amount: 300, unit: "g" },
      { name: "Asparagus", amount: 300, unit: "g" },
      { name: "Olive oil", amount: 2, unit: "tbsp" },
      { name: "Lemon", amount: 1, unit: "whole" },
      { name: "Garlic", amount: 2, unit: "cloves" },
      { name: "Fresh dill", amount: 2, unit: "tbsp" }
    ],
    instructions: "1. Preheat oven to 200°C (400°F)\n2. Place salmon and asparagus on a baking sheet\n3. Drizzle with olive oil, minced garlic, lemon juice, and dill\n4. Bake for 15-18 minutes until salmon is flaky\n5. Serve with lemon wedges"
  },
  {
    name: "Chicken Breast with Sweet Potato",
    category: "dinner",
    prep_time_minutes: 10,
    cook_time_minutes: 25,
    servings: 1,
    calories_per_serving: 420,
    protein_per_serving: 42,
    carbs_per_serving: 40,
    fat_per_serving: 8,
    tags: ["high-protein", "healthy"],
    ingredients: [
      { name: "Chicken breast", amount: 180, unit: "g" },
      { name: "Sweet potato", amount: 200, unit: "g" },
      { name: "Broccoli", amount: 100, unit: "g" },
      { name: "Olive oil", amount: 1, unit: "tbsp" },
      { name: "Paprika", amount: 1, unit: "tsp" },
      { name: "Garlic powder", amount: 1, unit: "tsp" }
    ],
    instructions: "1. Cut sweet potato into cubes and roast at 200°C for 25 minutes\n2. Season chicken with paprika and garlic powder\n3. Grill or bake chicken for 20 minutes\n4. Steam broccoli for 5 minutes\n5. Serve chicken with sweet potato and broccoli"
  },
  {
    name: "Protein Energy Balls",
    category: "snack",
    prep_time_minutes: 10,
    cook_time_minutes: 0,
    servings: 12,
    calories_per_serving: 120,
    protein_per_serving: 6,
    carbs_per_serving: 15,
    fat_per_serving: 4,
    tags: ["protein", "no-cook", "meal-prep"],
    ingredients: [
      { name: "Oats", amount: 150, unit: "g" },
      { name: "Protein powder", amount: 60, unit: "g" },
      { name: "Peanut butter", amount: 100, unit: "g" },
      { name: "Honey", amount: 60, unit: "ml" },
      { name: "Dark chocolate chips", amount: 50, unit: "g" },
      { name: "Chia seeds", amount: 2, unit: "tbsp" }
    ],
    instructions: "1. Mix all ingredients in a large bowl\n2. Roll mixture into 12 equal balls\n3. Refrigerate for at least 30 minutes\n4. Store in airtight container for up to 1 week"
  },
  {
    name: "Chocolate Protein Smoothie",
    category: "smoothie",
    prep_time_minutes: 5,
    cook_time_minutes: 0,
    servings: 1,
    calories_per_serving: 280,
    protein_per_serving: 30,
    carbs_per_serving: 32,
    fat_per_serving: 5,
    tags: ["high-protein", "quick", "no-cook"],
    ingredients: [
      { name: "Protein powder (chocolate)", amount: 30, unit: "g" },
      { name: "Banana", amount: 1, unit: "medium" },
      { name: "Almond milk", amount: 250, unit: "ml" },
      { name: "Cocoa powder", amount: 1, unit: "tbsp" },
      { name: "Ice cubes", amount: 5, unit: "cubes" },
      { name: "Peanut butter", amount: 1, unit: "tbsp" }
    ],
    instructions: "1. Add all ingredients to a blender\n2. Blend on high until smooth and creamy\n3. Pour into a glass and enjoy immediately"
  },
  {
    name: "Turkey Avocado Wrap",
    category: "lunch",
    prep_time_minutes: 5,
    cook_time_minutes: 0,
    servings: 1,
    calories_per_serving: 380,
    protein_per_serving: 32,
    carbs_per_serving: 30,
    fat_per_serving: 14,
    tags: ["high-protein", "quick", "no-cook"],
    ingredients: [
      { name: "Whole wheat tortilla", amount: 1, unit: "large" },
      { name: "Turkey breast slices", amount: 100, unit: "g" },
      { name: "Avocado", amount: 50, unit: "g" },
      { name: "Lettuce", amount: 30, unit: "g" },
      { name: "Tomato", amount: 50, unit: "g" },
      { name: "Mustard", amount: 1, unit: "tsp" }
    ],
    instructions: "1. Lay tortilla flat and spread mustard\n2. Layer turkey slices, sliced avocado, lettuce, and tomato\n3. Roll tightly and cut in half\n4. Serve immediately or wrap for later"
  }
];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return Response.json({ 
            success: true,
            recipes: CURATED_RECIPES,
            count: CURATED_RECIPES.length
        });
    } catch (error) {
        console.error('❌ Failed to get curated recipes:', error);
        return Response.json({ 
            error: error.message
        }, { status: 500 });
    }
});