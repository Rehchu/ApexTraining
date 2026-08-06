import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Dumbbell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ClientProgressOverview({ clients, progressLogs }) {
  // Calculate progress for each client
  const clientProgress = clients.map(client => {
    const logs = progressLogs
      .filter(log => log.client_id === client.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (logs.length < 2) return null;

    const latest = logs[0];
    const oldest = logs[logs.length - 1];

    const weightChange = latest.weight_kg && oldest.weight_kg 
      ? latest.weight_kg - oldest.weight_kg 
      : null;

    const bodyFatChange = latest.body_fat_percentage && oldest.body_fat_percentage
      ? latest.body_fat_percentage - oldest.body_fat_percentage
      : null;

    // Calculate strength gains (bench press as example)
    const latestBench = latest.performance_metrics?.bench_press_kg;
    const oldestBench = oldest.performance_metrics?.bench_press_kg;
    const strengthGain = latestBench && oldestBench 
      ? latestBench - oldestBench 
      : null;

    return {
      client,
      weightChange,
      bodyFatChange,
      strengthGain,
      hasProgress: weightChange !== null || bodyFatChange !== null || strengthGain !== null
    };
  }).filter(p => p?.hasProgress);

  // Sort by most impressive results
  const topPerformers = clientProgress
    .sort((a, b) => {
      const scoreA = Math.abs(a.weightChange || 0) + Math.abs(a.bodyFatChange || 0) * 2 + (a.strengthGain || 0);
      const scoreB = Math.abs(b.weightChange || 0) + Math.abs(b.bodyFatChange || 0) * 2 + (b.strengthGain || 0);
      return scoreB - scoreA;
    })
    .slice(0, 5);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Dumbbell className="w-5 h-5 text-amber-500" />
          Top Client Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topPerformers.length > 0 ? (
          <div className="space-y-4">
            {topPerformers.map((progress, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 bg-secondary rounded-lg border border-border">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={progress.client.avatar_url} />
                  <AvatarFallback className="bg-emerald-500/20 text-emerald-400">
                    {progress.client.full_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {progress.client.full_name}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs">
                    {progress.weightChange !== null && (
                      <span className={`flex items-center gap-1 ${
                        progress.weightChange < 0 ? 'text-green-400' : 'text-amber-400'
                      }`}>
                        {progress.weightChange < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <TrendingUp className="w-3 h-3" />
                        )}
                        {Math.abs(progress.weightChange).toFixed(1)} kg
                      </span>
                    )}
                    {progress.bodyFatChange !== null && (
                      <span className={`flex items-center gap-1 ${
                        progress.bodyFatChange < 0 ? 'text-green-400' : 'text-amber-400'
                      }`}>
                        {progress.bodyFatChange < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <TrendingUp className="w-3 h-3" />
                        )}
                        {Math.abs(progress.bodyFatChange).toFixed(1)}% BF
                      </span>
                    )}
                    {progress.strengthGain !== null && progress.strengthGain > 0 && (
                      <span className="flex items-center gap-1 text-blue-400">
                        <TrendingUp className="w-3 h-3" />
                        +{progress.strengthGain.toFixed(1)} kg bench
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No progress data yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}