import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, RotateCcw, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function LiveWorkoutMode({ workoutSession, setWorkoutSession, onComplete }) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);

  useEffect(() => {
    let interval;
    if (isResting && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => {
          if (prev <= 1) {
            setIsResting(false);
            toast.success("Rest time is over! Ready for the next set?");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (restTimer === 0) {
      setIsResting(false);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer]);

  const startRest = (seconds) => {
    setRestTimer(seconds);
    setIsResting(true);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!workoutSession || !workoutSession.exercises || workoutSession.exercises.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No exercises found.</div>;
  }

  const currentExercise = workoutSession.exercises[currentExerciseIndex];

  return (
    <div className="flex flex-col h-full">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Live Workout</h2>
        <div className="flex gap-2">
          {workoutSession.exercises.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full ${
                idx === currentExerciseIndex
                  ? "bg-green-500 scale-125"
                  : idx < currentExerciseIndex
                  ? "bg-green-500/40"
                  : "bg-white/20"
              } transition-all`}
            />
          ))}
        </div>
      </div>

      {/* Rest Timer Overlay */}
      {isResting && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex flex-col items-center justify-center">
          <p className="text-red-400 font-bold mb-2 uppercase tracking-wide text-xs">Rest Timer</p>
          <div className="text-4xl font-black text-red-500 font-mono mb-4">{formatTime(restTimer)}</div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResting(false)}
              className="border-red-500/30 text-red-400 hover:bg-red-500/20"
            >
              Skip
            </Button>
            <Button
              size="sm"
              onClick={() => setRestTimer(prev => prev + 30)}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              +30s
            </Button>
          </div>
        </div>
      )}

      {/* Current Exercise */}
      <div className="bg-card border border-border rounded-3xl p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-foreground">{currentExercise.name}</h3>
            <p className="text-muted-foreground mt-1">
              Target: {currentExercise.target_sets} sets × {currentExercise.target_reps}
            </p>
          </div>
        </div>

        {/* Set Logging */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground mb-2 px-2 text-center uppercase tracking-wider">
            <div className="text-left">Set</div>
            <div>Previous</div>
            <div>lbs</div>
            <div>Reps</div>
            <div>Done</div>
          </div>
          
          {Array.from({ length: currentExercise.target_sets }).map((_, setIdx) => {
            const isCompleted = !!currentExercise.reps_completed[setIdx];
            return (
              <div
                key={setIdx}
                className={`grid grid-cols-5 gap-2 items-center p-3 rounded-xl transition-colors ${
                  isCompleted ? "bg-green-500/10 border border-green-500/20" : "bg-secondary border border-transparent"
                }`}
              >
                <div className="text-sm font-bold text-muted-foreground pl-2">{setIdx + 1}</div>
                <div className="text-xs text-muted-foreground flex justify-center">-</div>
                <Input
                  type="number"
                  placeholder="Weight"
                  value={currentExercise.weight_used[setIdx] || ""}
                  onChange={(e) => {
                    const newExercises = [...workoutSession.exercises];
                    newExercises[currentExerciseIndex].weight_used[setIdx] = e.target.value;
                    setWorkoutSession({ ...workoutSession, exercises: newExercises });
                  }}
                  className="h-10 bg-card border-border text-foreground text-center font-bold"
                />
                <Input
                  type="number"
                  placeholder="Reps"
                  value={currentExercise.reps_completed[setIdx] || ""}
                  onChange={(e) => {
                    const newExercises = [...workoutSession.exercises];
                    newExercises[currentExerciseIndex].reps_completed[setIdx] = e.target.value;
                    setWorkoutSession({ ...workoutSession, exercises: newExercises });
                  }}
                  className="h-10 bg-card border-border text-foreground text-center font-bold"
                />
                <Button
                  size="icon"
                  className={`h-10 w-full rounded-lg ${
                    isCompleted
                      ? "bg-green-500 hover:bg-green-600 text-black"
                      : "bg-secondary hover:bg-accent text-foreground"
                  }`}
                  onClick={() => {
                    if (!isCompleted) {
                      // Mark as completed logic
                      if (!currentExercise.reps_completed[setIdx]) {
                        const newExercises = [...workoutSession.exercises];
                        newExercises[currentExerciseIndex].reps_completed[setIdx] = currentExercise.target_reps;
                        setWorkoutSession({ ...workoutSession, exercises: newExercises });
                      }
                      startRest(60); // Default 60s rest
                    }
                  }}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentExerciseIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentExerciseIndex === 0}
          className="bg-secondary border-border text-foreground w-32"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {currentExerciseIndex === workoutSession.exercises.length - 1 ? (
          <Button
            onClick={() => onComplete()}
            className="bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-black font-black w-40"
          >
            Finish Workout
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentExerciseIndex((prev) => Math.min(workoutSession.exercises.length - 1, prev + 1))}
            className="bg-white hover:bg-gray-200 text-black font-bold w-32"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}