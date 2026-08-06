import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HabitStreakDisplay({ habit }) {
  const isOnStreak = habit.current_streak > 0;
  
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className={cn(isOnStreak && "border-orange-200 bg-orange-50")}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className={cn("w-4 h-4", isOnStreak ? "text-orange-500" : "text-muted-foreground")} />
            <span className="text-xs font-semibold text-slate-600">Current Streak</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{habit.current_streak}</div>
          <p className="text-xs text-slate-500 mt-1">{habit.unit || "days"}</p>
        </CardContent>
      </Card>

      <Card className={cn(habit.longest_streak > 0 && "border-emerald-200 bg-emerald-50")}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className={cn("w-4 h-4", habit.longest_streak > 0 ? "text-emerald-600" : "text-muted-foreground")} />
            <span className="text-xs font-semibold text-slate-600">Best Streak</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{habit.longest_streak}</div>
          <p className="text-xs text-slate-500 mt-1">{habit.unit || "days"}</p>
        </CardContent>
      </Card>
    </div>
  );
}