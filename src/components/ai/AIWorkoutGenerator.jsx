import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import WorkoutForm from "@/components/workouts/WorkoutForm";

export default function AIWorkoutGenerator({ client, onPlanGenerated }) {
  const [loading, setLoading] = useState(false);
  const [durationWeeks, setDurationWeeks] = useState("4");
  const [goal, setGoal] = useState("balanced");
  const [open, setOpen] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const handleGenerateWorkout = async () => {
    if (!client) {
      toast.error("No client selected");
      return;
    }
    try {
      setLoading(true);
      const plan = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert personal trainer. Generate a personalized workout plan for a client.
Client Details:
Age: ${client.age || 'Unknown'}
Gender: ${client.gender || 'Unknown'}
Weight: ${client.weight_kg || 'Unknown'} kg
Fitness Level: ${client.fitness_level || 'intermediate'}
Goals: ${goal}
Duration: ${durationWeeks} weeks

Return a JSON object with the following structure:
{
  "name": "Plan Name",
  "description": "Short description",
  "duration_weeks": ${durationWeeks},
  "days_per_week": 3,
  "difficulty": "intermediate",
  "exercises": [
    {
      "day": 1,
      "name": "Exercise Name",
      "sets": 3,
      "reps": "10-12",
      "rest_seconds": 60,
      "notes": "Tips"
    }
  ]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            duration_weeks: { type: "number" },
            days_per_week: { type: "number" },
            difficulty: { type: "string" },
            exercises: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" },
                  name: { type: "string" },
                  sets: { type: "number" },
                  reps: { type: "string" },
                  rest_seconds: { type: "number" },
                  notes: { type: "string" }
                }
              }
            }
          },
          required: ["name", "description", "duration_weeks", "days_per_week", "exercises"]
        }
      });

      if (plan) {
        // Pre-fill the workout form with AI data — don't save yet
        setGeneratedPlan({
          name: plan.name,
          description: plan.description,
          client_id: client.user_id || client.id,
          duration_weeks: plan.duration_weeks,
          days_per_week: plan.days_per_week,
          exercises: plan.exercises,
          difficulty: plan.difficulty || "intermediate",
          status: "active",
          trainer_id: client.trainer_id
        });
        setOpen(false);
        setShowEditForm(true);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate workout plan");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async (data) => {
    const created = await base44.entities.WorkoutPlan.create({ ...data, trainer_id: client.trainer_id || data.trainer_id });
    toast.success("AI Workout Plan Saved! 🎯");
    setShowEditForm(false);
    setGeneratedPlan(null);
    onPlanGenerated?.(created);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
      >
        <Wand2 className="w-4 h-4 mr-2" />
        AI Workout Plan
      </Button>

      {/* Generator Options Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Wand2 className="w-5 h-5 text-purple-400" />
              AI Workout Generator
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <span className="flex-shrink-0 mt-0.5">⚠️</span>
              <span><strong>NASM/ISSA Scope of Practice:</strong> AI-generated plans are a starting point only. Always review, modify, and approve before assigning. Do not prescribe exercise for medical conditions — refer to licensed professionals when indicated.</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Duration</label>
              <Select value={durationWeeks} onValueChange={setDurationWeeks}>
                <SelectTrigger className="bg-card border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Weeks</SelectItem>
                  <SelectItem value="4">4 Weeks</SelectItem>
                  <SelectItem value="8">8 Weeks</SelectItem>
                  <SelectItem value="12">12 Weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Goal</label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger className="bg-card border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="strength">Build Strength</SelectItem>
                  <SelectItem value="muscle">Build Muscle</SelectItem>
                  <SelectItem value="cardio">Improve Cardio</SelectItem>
                  <SelectItem value="balanced">Balanced Fitness</SelectItem>
                  <SelectItem value="fat_loss">Fat Loss</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateWorkout} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Wand2 className="w-4 h-4 mr-2" />Generate & Edit Plan</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit generated plan using existing WorkoutForm */}
      {showEditForm && generatedPlan && (
        <WorkoutForm
          open={showEditForm}
          onOpenChange={(v) => { setShowEditForm(v); if (!v) setGeneratedPlan(null); }}
          workout={generatedPlan}
          clients={client ? [client] : []}
          onSubmit={handleSavePlan}
        />
      )}
    </>
  );
}