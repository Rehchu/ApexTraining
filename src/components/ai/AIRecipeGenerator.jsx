import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Wand2, ChefHat } from "lucide-react";
import { toast } from "sonner";

export default function AIRecipeGenerator({ onRecipeGenerated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [goal, setGoal] = useState("high_protein");
  const [category, setCategory] = useState("dinner");
  const [dietary, setDietary] = useState("none");
  const [prompt, setPrompt] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional chef and nutritionist. Generate a single healthy fitness recipe.

Category: ${category}
Nutritional Goal: ${goal.replace("_", " ")}
Dietary Preference: ${dietary === "none" ? "No restriction" : dietary}
${prompt ? `Special Request: ${prompt}` : ""}

Create a practical, delicious recipe that supports the nutritional goal. Use common ingredients.

Return ONLY valid JSON (no markdown):
{
  "name": "Recipe name",
  "description": "1-2 sentence description",
  "meal_type": "${category}",
  "prep_time_minutes": 10,
  "cook_time_minutes": 20,
  "servings": 2,
  "ingredients": [
    { "name": "ingredient", "quantity": "200g" }
  ],
  "instructions": ["Step 1", "Step 2", "Step 3"],
  "calories": 450,
  "macros": {
    "protein": 40,
    "carbs": 35,
    "fat": 15
  },
  "tags": ["high-protein", "quick"]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            meal_type: { type: "string" },
            prep_time_minutes: { type: "number" },
            cook_time_minutes: { type: "number" },
            servings: { type: "number" },
            ingredients: { type: "array" },
            instructions: { type: "array" },
            calories: { type: "number" },
            macros: { type: "object" },
            tags: { type: "array" }
          }
        }
      });

      // Save to Recipe entity
      const saved = await base44.entities.Recipe.create({
        name: response.name,
        description: response.description,
        meal_type: response.meal_type,
        calories: response.calories,
        macros: response.macros,
        ingredients: response.ingredients,
        instructions: response.instructions,
        tags: response.tags || []
      });

      toast.success(`AI generated "${response.name}"! 🍽️`);
      onRecipeGenerated?.(saved);
      setOpen(false);
      setPrompt("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate recipe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
      >
        <Wand2 className="w-4 h-4 mr-2" />
        AI Generate Recipe
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-purple-500" />
              AI Recipe Generator
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                  <SelectItem value="smoothie">Smoothie</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nutritional Goal</label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high_protein">High Protein</SelectItem>
                  <SelectItem value="low_carb">Low Carb</SelectItem>
                  <SelectItem value="weight_loss">Weight Loss</SelectItem>
                  <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="pre_workout">Pre-Workout Fuel</SelectItem>
                  <SelectItem value="post_workout">Post-Workout Recovery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Dietary Preference</label>
              <Select value={dietary} onValueChange={setDietary}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Restriction</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                  <SelectItem value="vegetarian">Vegetarian</SelectItem>
                  <SelectItem value="keto">Keto</SelectItem>
                  <SelectItem value="paleo">Paleo</SelectItem>
                  <SelectItem value="gluten_free">Gluten-Free</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Special Request (optional)</label>
              <Input
                placeholder="e.g. quick 15-min meal, uses chicken..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Recipe...</>
              ) : (
                <><Wand2 className="w-4 h-4 mr-2" /> Generate Recipe</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}