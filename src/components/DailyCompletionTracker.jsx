import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { CheckCircle2, Circle } from "lucide-react";

export default function DailyCompletionTracker({ clientId, trainerId, type, date = new Date().toLocaleDateString('sv-SE'), isTrainer = false }) {
  const queryClient = useQueryClient();

  const { data: completions = [] } = useQuery({
    queryKey: ["dailyCompletion", clientId, date, type],
    queryFn: () => base44.entities.DailyCompletion.filter({ client_id: clientId, date, type }),
    enabled: !!clientId && !!date && !!type,
  });

  const completion = completions.find(c => c.item_id === 'all' || !c.item_id);
  const isCompleted = completion?.completed || false;

  const toggleMutation = useMutation({
    mutationFn: async (checked) => {
      if (completion) {
        return base44.entities.DailyCompletion.update(completion.id, { completed: checked });
      } else {
        return base44.entities.DailyCompletion.create({
          client_id: clientId,
          trainer_id: trainerId,
          date,
          type,
          completed: checked
        });
      }
    },
    onMutate: async (checked) => {
      await queryClient.cancelQueries({ queryKey: ["dailyCompletion", clientId, date, type] });
      const previous = queryClient.getQueryData(["dailyCompletion", clientId, date, type]);
      
      queryClient.setQueryData(["dailyCompletion", clientId, date, type], (old = []) => {
        const index = old.findIndex(c => c.item_id === 'all' || !c.item_id);
        if (index >= 0) {
          const newArr = [...old];
          newArr[index] = { ...old[index], completed: checked };
          return newArr;
        }
        return [...old, { id: 'temp-' + Date.now(), client_id: clientId, date, type, item_id: 'all', completed: checked }];
      });
      
      return { previous };
    },
    onError: (err, checked, context) => {
      queryClient.setQueryData(["dailyCompletion", clientId, date, type], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyCompletion", clientId, date, type] });
    }
  });

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl glass-card" style={{ background: isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)', border: isCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)' }}>
      <button
        onClick={() => toggleMutation.mutate(!isCompleted)}
        className="flex items-center justify-center w-6 h-6 rounded-md transition-colors focus:outline-none"
        style={{ 
          background: isCompleted ? '#10b981' : 'transparent',
          border: isCompleted ? 'none' : '2px solid rgba(255,255,255,0.3)'
        }}
      >
        {isCompleted && <CheckCircle2 className="w-4 h-4 text-black" />}
      </button>
      <div className="flex flex-col">
        <Label className={`text-sm font-semibold cursor-pointer ${isCompleted ? 'text-emerald-400' : 'text-foreground'}`} onClick={() => toggleMutation.mutate(!isCompleted)}>
          {isTrainer ? `${type === 'workout' ? 'Workout' : 'Meal'} Completed on ${date}` : `Mark ${type} as completed for today`}
        </Label>
        <span className="text-xs text-muted-foreground">
          {isCompleted ? "Great job! You've marked this as completed." : "Don't forget to check this off when you're done!"}
        </span>
      </div>
    </div>
  );
}