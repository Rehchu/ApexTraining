import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, Clock, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function WorkoutCompletionLogger({ workoutPlan, clientProfile, onComplete }) {
  const [notes, setNotes] = useState("");
  const [difficultyRating, setDifficultyRating] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(7);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const logWorkoutMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkoutLog.create(data),
    onMutate: async (newLog) => {
      await queryClient.cancelQueries({ queryKey: ["workoutLogs"] });
      const previous = queryClient.getQueryData(["workoutLogs"]);
      queryClient.setQueryData(["workoutLogs"], (old) => {
        return [{ id: `temp-${Date.now()}`, ...newLog }, ...(old || [])];
      });
      toast.success("Workout logged successfully!");
      setNotes("");
      onComplete?.();
      return { previous };
    },
    onError: (err, newLog, context) => {
      queryClient.setQueryData(["workoutLogs"], context.previous);
      toast.error("Failed to log workout");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["workoutLogs"] });
    }
  });

  const handleLogCompletion = async () => {
    const workoutData = {
      workout_plan_id: workoutPlan.id,
      client_id: workoutPlan.client_id,
      date: new Date().toLocaleDateString('sv-SE'),
      completed: true,
      notes: notes.trim(),
      difficulty_rating: difficultyRating,
      energy_level: energyLevel,
      trainer_id: workoutPlan.trainer_id
    };

    logWorkoutMutation.mutate(workoutData);

    // Fire AI post-workout analysis in background
    if (clientProfile) {
      setAnalyzing(true);
      try {
        const res = await base44.functions.invoke("aiVoiceCoach", {
          type: "postWorkoutAnalysis",
          workoutData: {
            duration_minutes: 45,
            exercises_completed: workoutPlan.exercises?.length || 0,
            sets_completed: workoutPlan.exercises?.reduce((a, e) => a + (e.sets || 0), 0) || 0,
            difficulty_rating: difficultyRating,
            energy_level: energyLevel
          },
          clientProfile
        });
        if (res.data?.success) {
          setAiAnalysis(res.data.data);
        }
      } catch (e) {
        // non-critical
      } finally {
        setAnalyzing(false);
      }
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <CheckCircle2 className="w-4 h-4" />
          Log Completion
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Workout Completion</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Card className="bg-slate-50 border-0">
            <CardContent className="p-4">
              <h3 className="font-medium text-sm text-slate-900">{workoutPlan.name}</h3>
              <p className="text-xs text-slate-600 mt-1">{workoutPlan.duration_weeks} week plan • {workoutPlan.days_per_week} days/week</p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900">How did the workout go?</label>
            <Textarea
              placeholder="Add notes: exercises completed, how you felt, injuries, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-900">Difficulty: {difficultyRating}/10</label>
              <input type="range" min="1" max="10" value={difficultyRating} onChange={e => setDifficultyRating(Number(e.target.value))} className="w-full" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-900">Energy: {energyLevel}/10</label>
              <input type="range" min="1" max="10" value={energyLevel} onChange={e => setEnergyLevel(Number(e.target.value))} className="w-full" />
            </div>
          </div>

          <Button
            onClick={handleLogCompletion}
            disabled={logWorkoutMutation.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {logWorkoutMutation.isPending ? "Logging..." : "Log Workout"}
          </Button>

          {/* AI Post-Workout Analysis */}
          {analyzing && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Generating AI analysis...
            </div>
          )}
          {aiAnalysis && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-purple-700 flex items-center gap-1"><Sparkles className="w-4 h-4" /> AI Post-Workout Analysis</p>
              <p className="text-sm text-purple-900"><strong>Performance:</strong> {aiAnalysis.performance}</p>
              <p className="text-sm text-purple-900"><strong>Recovery:</strong> {aiAnalysis.recovery}</p>
              <p className="text-sm text-purple-900"><strong>Nutrition Now:</strong> {aiAnalysis.nutrition}</p>
              {aiAnalysis.highlight && <p className="text-sm text-emerald-700 font-medium">⭐ {aiAnalysis.highlight}</p>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}