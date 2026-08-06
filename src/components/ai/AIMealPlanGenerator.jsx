import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Utensils } from "lucide-react";
import { toast } from "sonner";
import MealPlanForm from "@/components/meals/MealPlanForm";

export default function AIMealPlanGenerator({ client, clients, onPlanGenerated }) {
  const [loading, setLoading] = useState(false);
  const [goal, setGoal] = useState("maintenance");
  const [calorieTarget, setCalorieTarget] = useState("2000");
  const [proteinTarget, setProteinTarget] = useState("150");
  const [open, setOpen] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const handleGenerateMealPlan = async () => {
    if (!client) {
      toast.error("No client selected");
      return;
    }
    try {
      setLoading(true);
      const plan = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert nutritionist. Generate a 7-day personalized meal plan for a client.
Client Details:
Age: ${client.age || 'Unknown'}
Gender: ${client.gender || 'Unknown'}
Weight: ${client.weight_kg || 'Unknown'} kg
Dietary Preference: ${client.dietary_preference || 'none'}
Goal: ${goal}
Daily Targets: ${calorieTarget} kcal, ${proteinTarget}g protein, ${Math.round((parseInt(calorieTarget) * 0.45) / 4)}g carbs, ${Math.round((parseInt(calorieTarget) * 0.25) / 9)}g fat.

Return a JSON object with the following structure:
{
  "name": "Plan Name",
  "description": "Short description",
  "meals": [
    {
      "day": 1,
      "meal_type": "breakfast",
      "name": "Meal Name",
      "instructions": "How to prepare",
      "foods": [
        {
          "name": "Food Item",
          "amount": 100,
          "unit": "g",
          "calories": 150,
          "protein": 10,
          "carbs": 20,
          "fat": 5
        }
      ]
    }
  ]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            meals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" },
                  meal_type: { type: "string" },
                  name: { type: "string" },
                  instructions: { type: "string" },
                  foods: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        amount: { type: "number" },
                        unit: { type: "string" },
                        calories: { type: "number" },
                        protein: { type: "number" },
                        carbs: { type: "number" },
                        fat: { type: "number" }
                      }
                    }
                  }
                }
              }
            }
          },
          required: ["name", "description", "meals"]
        }
      });

      if (plan) {
        // Pre-fill the meal form with AI data — don't save yet
        setGeneratedPlan({
          name: plan.name,
          description: plan.description,
          client_id: client.user_id || client.id,
          duration_days: 7,
          calories_target: parseInt(calorieTarget),
          protein_target_g: parseInt(proteinTarget),
          carbs_target_g: Math.round((parseInt(calorieTarget) * 0.45) / 4),
          fat_target_g: Math.round((parseInt(calorieTarget) * 0.25) / 9),
          meals: plan.meals,
          status: "active",
          trainer_id: client.trainer_id
        });
        setOpen(false);
        setShowEditForm(true);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate meal plan");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async (data) => {
    const created = await base44.entities.MealPlan.create({ ...data, trainer_id: client.trainer_id || data.trainer_id });
    toast.success("AI Meal Plan Saved! 🍽️");
    setShowEditForm(false);
    setGeneratedPlan(null);
    onPlanGenerated?.(created);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
      >
        <Utensils className="w-4 h-4 mr-2" />
        AI Meal Plan
      </Button>

      {/* Generator Options Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Utensils className="w-5 h-5 text-green-400" />
              AI Meal Plan Generator
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <span className="flex-shrink-0 mt-0.5">⚠️</span>
              <span><strong>NASM/ISSA Nutrition Scope:</strong> As a CPT, provide general healthy eating guidance only. Clinical or therapeutic dietary plans require an RD/RDN credential. AI plans are a starting point — always review before assigning.</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Goal</label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger className="bg-card border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight_loss">Weight Loss</SelectItem>
                  <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="performance">Athletic Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Daily Calories</label>
                <Input type="number" value={calorieTarget} onChange={(e) => setCalorieTarget(e.target.value)} className="bg-card border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Protein (g)</label>
                <Input type="number" value={proteinTarget} onChange={(e) => setProteinTarget(e.target.value)} className="bg-card border-border text-foreground" />
              </div>
            </div>
            <Button onClick={handleGenerateMealPlan} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Utensils className="w-4 h-4 mr-2" />Generate & Edit Plan</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit generated plan using existing MealPlanForm */}
      {showEditForm && generatedPlan && (
        <MealPlanForm
          open={showEditForm}
          onOpenChange={(v) => { setShowEditForm(v); if (!v) setGeneratedPlan(null); }}
          plan={generatedPlan}
          clients={clients || (client ? [client] : [])}
          onSubmit={handleSavePlan}
        />
      )}
    </>
  );
}