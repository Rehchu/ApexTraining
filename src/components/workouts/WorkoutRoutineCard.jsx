import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Dumbbell, Clock, RotateCcw, CheckCircle2, Circle } from "lucide-react";
import ItemCompletionTracker from "@/components/ItemCompletionTracker";

/**
 * WorkoutRoutineCard – Inspired by gym-management-system-laravel's workout routine structure.
 * Displays a day's exercises in a structured format with set/rep tracking.
 */
export default function WorkoutRoutineCard({ day, exercises, onComplete, clientId, trainerId, isTrainer }) {
  const [expanded, setExpanded] = useState(false);
  const [completedSets, setCompletedSets] = useState({});

  const toggleSet = (exerciseIdx, setIdx) => {
    const key = `${exerciseIdx}-${setIdx}`;
    setCompletedSets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalSets = exercises.reduce((sum, e) => sum + (e.sets || 0), 0);
  const completedSetCount = Object.values(completedSets).filter(Boolean).length;
  const allDone = completedSetCount === totalSets && totalSets > 0;

  return (
    <div className="glass-card rounded-xl overflow-hidden" style={{ background: 'rgba(20,20,20,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent transition-colors"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.2)' }}>
          <span className="text-sm font-black text-green-400">D{day}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">Day {day}</p>
          <p className="text-xs text-muted-foreground">{exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · {totalSets} sets total</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {allDone && <Badge style={{ background: 'rgba(0,255,157,0.15)', color: '#00ff9d', border: '1px solid rgba(0,255,157,0.3)' }} className="hidden sm:inline-flex">Done ✓</Badge>}
          {completedSetCount > 0 && !allDone && (
            <span className="text-xs text-yellow-400 font-medium">{completedSetCount}/{totalSets}</span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border divide-y divide-white/5">
          {exercises.map((exercise, eIdx) => (
            <div key={eIdx} className="p-4 bg-secondary">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(159,122,234,0.1)', border: '1px solid rgba(159,122,234,0.2)' }}>
                  <Dumbbell className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground text-sm">{exercise.name}</p>
                    {clientId && (
                      <ItemCompletionTracker 
                        clientId={clientId}
                        trainerId={trainerId}
                        type="workout"
                        itemId={`D${day}-${exercise.name}`}
                        isTrainer={isTrainer}
                      />
                    )}
                  </div>
                  <div className="flex gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground font-medium">{exercise.sets} × {exercise.reps}</span>
                    {exercise.rest_seconds && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{exercise.rest_seconds}s rest
                      </span>
                    )}
                    {exercise.target_rir !== undefined && (
                      <span className="text-xs text-purple-400 flex items-center gap-1 font-medium bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                        Target RIR: {exercise.target_rir}
                      </span>
                    )}
                  </div>
                  {exercise.notes && <p className="text-xs text-muted-foreground mt-1 italic">{exercise.notes}</p>}
                </div>
              </div>

              {/* Set trackers */}
              <div className="flex gap-2 flex-wrap ml-11">
                {Array.from({ length: exercise.sets || 0 }).map((_, sIdx) => {
                  const key = `${eIdx}-${sIdx}`;
                  const done = !!completedSets[key];
                  return (
                    <button
                      key={sIdx}
                      onClick={() => toggleSet(eIdx, sIdx)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all font-medium"
                      style={done ? {
                        background: 'rgba(0,255,157,0.15)', color: '#00ff9d', border: '1px solid rgba(0,255,157,0.3)', boxShadow: '0 0 10px rgba(0,255,157,0.1)'
                      } : {
                        background: 'rgba(255,255,255,0.02)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      {done ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                      Set {sIdx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {allDone && (
            <div className="p-4 bg-card">
              <Button
                className="w-full font-bold text-black border-none transition-all hover:"
                style={{ background: 'linear-gradient(135deg, #00ff9d, #059669)' }}
                onClick={() => onComplete?.({ day, exercises })}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Log Day {day} Complete
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}