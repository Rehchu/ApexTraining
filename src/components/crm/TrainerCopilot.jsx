import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, AlertTriangle, TrendingUp, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function TrainerCopilot({ trainerId }) {
  const [insights, setInsights] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["copilot-clients", trainerId],
    queryFn: () => base44.entities.Client.filter({ trainer_id: trainerId }),
    enabled: !!trainerId
  });

  const { data: recentSessions = [] } = useQuery({
    queryKey: ["copilot-sessions", trainerId],
    queryFn: () => base44.entities.Session.filter({ trainer_id: trainerId }, "-date", 20),
    enabled: !!trainerId
  });

  const generateInsights = async () => {
    setIsAnalyzing(true);
    try {
      const summaryPayload = clients.map(c => {
        const clientSessions = recentSessions.filter(s => s.client_id === c.id || s.client_id === c.user_id);
        const missed = clientSessions.filter(s => s.status === 'no_show' || s.status === 'cancelled').length;
        const completed = clientSessions.filter(s => s.status === 'completed').length;
        return `Client: ${c.full_name}, Missed Sessions: ${missed}, Completed: ${completed}, Goal: ${c.goals || 'N/A'}`;
      }).join("\n");

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI assistant for a personal trainer. Here is a summary of their clients' recent activity:\n${summaryPayload}\n\nReturn a JSON array of insights. Each insight should have:\n- client_name\n- status (enum: "needs_attention", "doing_great", "on_track")\n- message (A brief explanation or suggested action for the trainer to take)`,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  client_name: { type: "string" },
                  status: { type: "string" },
                  message: { type: "string" }
                }
              }
            }
          },
          required: ["insights"]
        }
      });
      
      setInsights(res.insights || []);
      toast.success("AI insights generated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate AI insights.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'needs_attention') return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (status === 'doing_great') return <TrendingUp className="w-5 h-5 text-green-500" />;
    return <CheckCircle className="w-5 h-5 text-blue-500" />;
  };

  return (
    <Card className="glass-card border-purple-500/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl text-purple-400 flex items-center gap-2">
            <Brain className="w-6 h-6" /> AI Trainer Copilot
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Get automated insights on which clients need attention.</p>
        </div>
        <Button 
          onClick={generateInsights} 
          disabled={isAnalyzing || clients.length === 0}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : "Generate Insights"}
        </Button>
      </CardHeader>
      <CardContent>
        {insights ? (
          <div className="space-y-3 mt-4">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-secondary rounded-xl border border-border">
                <div className="mt-1">
                  {getStatusIcon(insight.status)}
                </div>
                <div className="flex-1">
                  <h4 className="text-foreground font-semibold">{insight.client_name}</h4>
                  <p className="text-muted-foreground text-sm mt-1">{insight.message}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">Click generate to scan your clients' recent data.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}