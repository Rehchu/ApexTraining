import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export default function AIRecoveryPlan({ clientId, clientProfile, workoutLogs }) {
  const [loading, setLoading] = useState(false);
  const [recovery, setRecovery] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const handleGenerateRecovery = async () => {
    if (!clientProfile) {
      toast.error("No client profile");
      return;
    }

    try {
      setLoading(true);
      const response = await base44.functions.invoke("aiPersonalizedPlans", {
        type: "generateRecovery",
        clientProfile,
        workoutLogs: workoutLogs || []
      });

      if (response.data?.success) {
        setRecovery(response.data.data);
        toast.success("Recovery plan generated! 💪");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate recovery plan");
    } finally {
      setLoading(false);
    }
  };

  if (!recovery) {
    return (
      <Card className="glass-card border-cyan-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-400">
            <Zap className="w-5 h-5" />
            AI Recovery Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGenerateRecovery}
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Generate Recovery Plan
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sections = [
    { key: "sleep_optimization", title: "Sleep Optimization", icon: "😴" },
    { key: "nutrition_timing", title: "Nutrition Timing", icon: "🍽️" },
    { key: "stress_management", title: "Stress Management", icon: "🧘" },
    { key: "active_recovery_days", title: "Active Recovery", icon: "🚶" },
    { key: "deload_schedule", title: "Deload Schedule", icon: "📅" }
  ];

  return (
    <div className="space-y-4">
      <Card className="glass-card border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-400">Recovery Protocol</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sections.map((section) => (
            <div
              key={section.key}
              className="border border-cyan-500/20 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpanded(expanded === section.key ? null : section.key)}
                className="w-full flex items-center justify-between p-3 hover:bg-accent transition-colors"
              >
                <span className="font-medium flex items-center gap-2">
                  <span>{section.icon}</span>
                  {section.title}
                </span>
                {expanded === section.key ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {expanded === section.key && (
                <div className="bg-cyan-500/10 p-4 border-t border-cyan-500/20">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {recovery[section.key]}
                  </p>
                </div>
              )}
            </div>
          ))}

          {recovery.expected_outcomes && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mt-4">
              <p className="font-semibold text-emerald-400 mb-2">Expected Outcomes:</p>
              <p className="text-sm text-muted-foreground">{recovery.expected_outcomes}</p>
            </div>
          )}

          <Button
            onClick={handleGenerateRecovery}
            disabled={loading}
            variant="outline"
            className="w-full mt-4"
          >
            <Zap className="w-4 h-4 mr-2" />
            Regenerate Plan
          </Button>
        </CardContent>
      </Card>

      {recovery.mobility_routine && recovery.mobility_routine.length > 0 && (
        <Card className="glass-card border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-purple-400">Daily Mobility Routine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recovery.mobility_routine.map((exercise, idx) => (
              <div key={idx} className="bg-secondary p-3 rounded-lg">
                <p className="font-medium text-foreground">{exercise.exercise}</p>
                <p className="text-sm text-muted-foreground mt-1">{exercise.description}</p>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{exercise.duration_minutes} min</span>
                  <span>{exercise.frequency}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}