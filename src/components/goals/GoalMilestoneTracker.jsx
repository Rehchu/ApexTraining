import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function GoalMilestoneTracker({ goal }) {
  if (!goal.milestones || goal.milestones.length === 0) return null;

  const completedCount = (goal.milestones || []).filter(m => m.achieved).length;
  const progressPercent = (completedCount / goal.milestones.length) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" />
            Milestones
          </CardTitle>
          <span className="text-sm text-slate-500">{completedCount}/{goal.milestones.length}</span>
        </div>
        <Progress value={progressPercent} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-2">
        {(goal.milestones || []).map((milestone, idx) => (
          <div key={idx} className="flex items-start gap-3 p-2 rounded hover:bg-slate-50">
            {milestone.achieved ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm", milestone.achieved && "line-through text-muted-foreground")}>
                {milestone.title}
              </p>
              {milestone.value && (
                <p className="text-xs text-slate-500">Target: {milestone.value} {goal.unit}</p>
              )}
              {milestone.achieved && milestone.achieved_date && (
                <p className="text-xs text-emerald-600 mt-1">
                  Completed {new Date(milestone.achieved_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}