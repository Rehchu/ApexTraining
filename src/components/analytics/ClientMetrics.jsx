import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Award, Calendar } from "lucide-react";

export default function ClientMetrics({ clients, sessions, progressLogs }) {
  const activeClients = clients.filter(c => c.status === "active").length;
  const totalClients = clients.length;
  const retentionRate = totalClients > 0 ? ((activeClients / totalClients) * 100).toFixed(1) : 0;

  // Calculate session completion rate
  const completedSessions = sessions.filter(s => s.status === "completed").length;
  const totalScheduledSessions = sessions.filter(s => 
    s.status === "completed" || s.status === "scheduled" || s.status === "no_show"
  ).length;
  const completionRate = totalScheduledSessions > 0 
    ? ((completedSessions / totalScheduledSessions) * 100).toFixed(1) 
    : 0;

  // Calculate average progress
  const clientsWithProgress = progressLogs.reduce((acc, log) => {
    if (!acc[log.client_id]) {
      acc[log.client_id] = [];
    }
    acc[log.client_id].push(log);
    return acc;
  }, {});

  const clientsShowingProgress = Object.keys(clientsWithProgress).length;
  const progressRate = totalClients > 0 
    ? ((clientsShowingProgress / totalClients) * 100).toFixed(1) 
    : 0;

  const metrics = [
    {
      label: "Active Clients",
      value: activeClients,
      total: totalClients,
      icon: Users,
      textColor: "text-green-400",
      iconColor: "text-green-500"
    },
    {
      label: "Client Retention",
      value: `${retentionRate}%`,
      icon: TrendingUp,
      textColor: "text-yellow-400",
      iconColor: "text-yellow-500"
    },
    {
      label: "Session Completion",
      value: `${completionRate}%`,
      icon: Calendar,
      textColor: "text-purple-400",
      iconColor: "text-purple-500"
    },
    {
      label: "Tracking Progress",
      value: `${progressRate}%`,
      icon: Award,
      textColor: "text-red-400",
      iconColor: "text-red-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, idx) => (
        <Card key={idx} className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{metric.label}</p>
                <p className={`text-3xl font-bold ${metric.textColor} mt-1 drop-shadow-md`}>
                  {metric.value}
                </p>
                {metric.total && (
                  <p className="text-xs text-muted-foreground mt-1 font-medium">of {metric.total} total</p>
                )}
              </div>
              <metric.icon className={`w-10 h-10 ${metric.iconColor} opacity-20`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}