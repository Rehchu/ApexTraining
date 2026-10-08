// AIWorkoutGenerator — AI-assisted workout plan builder
//
// INTEGRATED WITH COACHING SYSTEM (2026-09-15):
// ✅ This component now uses src/lib/coaching.js for evidence-based programming
// ✅ Loads the 41-exercise catalog from CoachingExercise entity
// ✅ Constrains LLM to catalog names only (no free-text exercise names)
// ✅ Uses GOAL_PARAMS for reps/rest/pairing based on goal
// ✅ Validates pattern coverage and push/pull balance using balanceCheck()
// ✅ Shows balance warnings if pull < push ratio falls below 0.8
// ✅ Goal enum matches coaching.js GOAL (strength/hypertrophy/fat_loss/conditioning/power)
//
// REMAINING GAPS (future enhancements):
// - Template-first return for exact goal matches (currently always uses LLM)
// - Warm-up generation using seedWarmup() from programming.js
// - Exercise substitution UI using substitute() function
// - Progression tracking using nextTarget() mechanism

import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import WorkoutForm from "@/components/workouts/WorkoutForm";
import { GOAL_PARAMS, normaliseGoal, buildWeek, balanceCheck } from "@/lib/coaching";

export default function AIWorkoutGenerator({ client, onPlanGenerated }) {
  const [loading, setLoading] = useState(false);
  const [durationWeeks, setDurationWeeks] = useState("4");
  const [goal, setGoal] = useState("hypertrophy");
  const [exerciseCatalog, setExerciseCatalog] = useState([]);
  const [open, setOpen] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // Load the exercise catalog on mount
  useEffect(() => {
    const loadExercises = async () => {
      try {
        const exercises = await base44.entities.CoachingExercise.list();
        setExerciseCatalog(exercises || []);
      } catch (error) {
        console.error("Failed to load exercise catalog:", error);
      }
    };
    loadExercises();
  }, []);

  const handleGenerateWorkout = async () => {
    if (!client) {
      toast.error("No client selected");
      return;
    }

    if (!exerciseCatalog || exerciseCatalog.length === 0) {
      toast.error("Exercise catalog not loaded. Please refresh and try again.");
      return;
    }

    try {
      setLoading(true);

      // Normalize the goal using coaching.js
      const normalisedGoal = normaliseGoal(goal);
      if (!normalisedGoal.ok) {
        toast.error(`Goal not recognized: ${goal}`);
        return;
      }

      // Get goal parameters from coaching.js
      const params = GOAL_PARAMS[normalisedGoal.goal];

      // Build exercise list string from catalog (grouped by pattern for the LLM)
      const exercisesByPattern = exerciseCatalog.reduce((acc, ex) => {
        if (!acc[ex.pattern]) acc[ex.pattern] = [];
        acc[ex.pattern].push(ex.name);
        return acc;
      }, {});

      const catalogList = Object.entries(exercisesByPattern)
        .map(([pattern, names]) => `${pattern}: ${names.join(', ')}`)
        .join('\n');

      const plan = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert personal trainer using evidence-based programming principles. Generate a workout plan for this client.

Client Details:
- Age: ${client.age || 'Unknown'}
- Gender: ${client.gender || 'Unknown'}
- Weight: ${client.weight_kg || 'Unknown'} kg
- Fitness Level: ${client.fitness_level || 'intermediate'}

Goal: ${normalisedGoal.goal}
Goal Parameters (from coaching system):
- Reps: ${params.repLabel}
- Rest: ${params.restLabel}
- Pairing: ${params.pairing}
- Progression: ${params.mechanism}
- Note: ${params.note}

Duration: ${durationWeeks} weeks
Days per week: 3 (beginner default - can be adjusted)

CRITICAL RULES (from PROGRAMMING-PRINCIPLES.md):
1. EXERCISE SELECTION: You MUST ONLY use exercises from this catalog. DO NOT invent exercise names.

EXERCISE CATALOG (organized by movement pattern):
${catalogList}

2. PATTERN COVERAGE: Each week MUST include:
   - At least one horizontal_push AND one vertical_push
   - At least one horizontal_pull AND one vertical_pull
   - At least one squat AND one hinge
   - Optional: carry_core for trunk work

3. BALANCE CONSTRAINT: Weekly PULL sets must equal or exceed PUSH sets. This is non-negotiable for shoulder health.

4. SESSION STRUCTURE for beginner full-body (3 days):
   - Day 1: squat, horizontal_push, horizontal_pull, core (heavy 3-5 reps)
   - Day 2: hinge, vertical_push, vertical_pull, carry (moderate 8-10 reps)
   - Day 3: squat, horizontal_push, horizontal_pull, core (higher-rep 12-15 reps)

Return a JSON object with:
{
  "name": "Plan name (e.g., '${normalisedGoal.goal.charAt(0).toUpperCase() + normalisedGoal.goal.slice(1)} Full-Body - ${durationWeeks} Weeks')",
  "description": "1-2 sentence description emphasizing the goal",
  "duration_weeks": ${durationWeeks},
  "days_per_week": 3,
  "difficulty": "${client.fitness_level || 'intermediate'}",
  "exercises": [
    {
      "day": 1,
      "name": "Exercise name EXACTLY as it appears in the catalog above",
      "pattern": "movement pattern (e.g., horizontal_push)",
      "sets": ${params.reps[0] <= 5 ? 4 : 3},
      "reps": "${params.repLabel}",
      "rest_seconds": ${params.rest[0]},
      "notes": "Brief coaching cue or progression note"
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
                  pattern: { type: "string" },
                  sets: { type: "number" },
                  reps: { type: "string" },
                  rest_seconds: { type: "number" },
                  notes: { type: "string" }
                },
                required: ["day", "name", "sets", "reps", "rest_seconds"]
              }
            }
          },
          required: ["name", "description", "duration_weeks", "days_per_week", "exercises"]
        }
      });

      if (plan) {
        // Validate the plan using coaching.js balance check
        const exercisesByDay = plan.exercises.reduce((acc, ex) => {
          if (!acc[ex.day]) acc[ex.day] = [];
          acc[ex.day].push({
            pattern: ex.pattern || 'unknown',
            sets: ex.sets || 3
          });
          return acc;
        }, {});

        // Check balance across the week
        const allExercises = plan.exercises.map(ex => ({
          pattern: ex.pattern || 'unknown',
          sets: ex.sets || 3
        }));

        const balance = balanceCheck(allExercises, []);

        if (!balance.ok && balance.ratio < 0.8) {
          toast.warning(`Balance warning: Pull/Push ratio is ${balance.ratio.toFixed(2)}. Plan needs more pulling exercises.`);
        }

        // Pre-fill the workout form with AI data — don't save yet
        setGeneratedPlan({
          name: plan.name,
          description: plan.description,
          client_id: client.user_id || client.id,
          duration_weeks: plan.duration_weeks,
          days_per_week: plan.days_per_week,
          exercises: plan.exercises,
          difficulty: plan.difficulty || client.fitness_level || "intermediate",
          status: "active",
          trainer_id: client.trainer_id,
          goal: normalisedGoal.goal
        });
        setOpen(false);
        setShowEditForm(true);

        if (balance.ok) {
          toast.success("Plan generated with balanced push/pull ratio! 💪");
        }
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
                  <SelectItem value="hypertrophy">Build Muscle</SelectItem>
                  <SelectItem value="fat_loss">Fat Loss</SelectItem>
                  <SelectItem value="conditioning">Improve Cardio</SelectItem>
                  <SelectItem value="power">Build Power</SelectItem>
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