import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";

export default function ItemCompletionTracker({ clientId, trainerId, type, itemId, date = new Date().toLocaleDateString('sv-SE'), isTrainer = false }) {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me()
  });

  const { data: allCompletions = [] } = useQuery({
    queryKey: ["dailyCompletion", clientId, date, type],
    queryFn: () => base44.entities.DailyCompletion.filter({ client_id: clientId, date, type }),
    enabled: !!clientId && !!date && !!type,
    staleTime: 60000, // keep fresh for 1 minute to prevent rapid refetches
  });

  const completion = allCompletions.find(c => c.item_id === itemId);
  const isCompleted = completion?.completed || false;

  const toggleMutation = useMutation({
    mutationFn: async (checked) => {
      if (completion) {
        return base44.entities.DailyCompletion.update(completion.id, { completed: checked });
      } else {
        return base44.entities.DailyCompletion.create({
          client_id: clientId,
          client_user_id: !isTrainer && currentUser ? currentUser.id : undefined,
          trainer_id: trainerId,
          date,
          type,
          item_id: itemId,
          completed: checked
        });
      }
    },
    onMutate: async (checked) => {
      await queryClient.cancelQueries({ queryKey: ["dailyCompletion", clientId, date, type] });
      const previous = queryClient.getQueryData(["dailyCompletion", clientId, date, type]);
      
      queryClient.setQueryData(["dailyCompletion", clientId, date, type], (old = []) => {
        const index = old.findIndex(c => c.item_id === itemId);
        if (index >= 0) {
          const newArr = [...old];
          newArr[index] = { ...old[index], completed: checked };
          return newArr;
        }
        return [...old, { id: 'temp-' + Date.now(), client_id: clientId, date, type, item_id: itemId, completed: checked }];
      });
      
      return { previous };
    },
    onError: (err, checked, context) => {
      queryClient.setQueryData(["dailyCompletion", clientId, date, type], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyCompletion"] });
    }
  });

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleMutation.mutate(!isCompleted);
      }}
      className={`flex items-center justify-center w-6 h-6 rounded-md transition-colors focus:outline-none shrink-0`}
      style={{ 
        background: isCompleted ? '#10b981' : 'transparent',
        border: isCompleted ? 'none' : '2px solid rgba(255,255,255,0.3)'
      }}
    >
      {isCompleted && <CheckCircle2 className="w-4 h-4 text-black" />}
    </button>
  );
}