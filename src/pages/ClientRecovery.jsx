import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeartPulse, Loader2, Sparkles } from "lucide-react";
import SleepStressLogger from "@/components/logging/SleepStressLogger";
import AIRecoveryPlan from "@/components/ai/AIRecoveryPlan";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

export default function ClientRecovery() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const today = format(new Date(), 'yyyy-MM-dd'); // local date, not UTC

  const { data: prescriptionNote, isLoading } = useQuery({
    queryKey: ["recoveryPrescription", user?.id, today],
    queryFn: async () => {
      const notes = await base44.entities.ClientNote.filter({ 
        client_id: user?.id, 
        trainer_id: "AI_SYSTEM"
      }, "-created_date", 10);
      
      // Match today's protocol; fall back to one generated in the last 24h
      // (guards against timezone drift between client and server dates).
      return (
        notes.find(n => n.note.includes(today)) ||
        notes.find(n => Date.now() - new Date(n.created_date).getTime() < 86400000) ||
        null
      );
    },
    enabled: !!user?.id
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-500/20 rounded-xl">
          <HeartPulse className="w-8 h-8 text-blue-500" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-foreground">Recovery & Readiness</h1>
          <p className="text-muted-foreground">Log your daily metrics to receive an AI-generated recovery protocol.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
          {user && <SleepStressLogger userId={user.id} />}

          {/* Today's AI recovery protocol (generated after logging readiness) */}
          <Card className="glass-card border-blue-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                Today's Recovery Protocol
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-3 text-muted-foreground py-6 justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" /> Checking today's protocol...
                </div>
              ) : prescriptionNote ? (
                <div className="text-sm leading-relaxed [&_p]:my-2 [&_p]:text-muted-foreground [&_strong]:text-foreground [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2 [&_li]:my-1 [&_li]:text-muted-foreground [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-semibold">
                  <ReactMarkdown>{prescriptionNote.note.replace(/^Recovery Protocol — [\d-]+\n\n/, '')}</ReactMarkdown>
                  <p className="text-xs text-muted-foreground/70 mt-4 not-prose">
                    Generated {format(new Date(prescriptionNote.created_date), 'MMM d, h:mm a')} · AI guidance, not medical advice.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  Log your sleep and stress above — your personalized recovery protocol for today will appear here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <AIRecoveryPlan
            clientId={user?.id}
            clientProfile={user}
            workoutLogs={[]}
          />
        </div>
      </div>
    </div>
  );
}