import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Moon, Activity, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SleepStressLogger({ userId }) {
  const [hoursSlept, setHoursSlept] = useState([7]);
  const [sleepQuality, setSleepQuality] = useState([3]);
  const [stressLevel, setStressLevel] = useState([5]);
  const [stressors, setStressors] = useState("");
  
  const queryClient = useQueryClient();

  const logMutation = useMutation({
    mutationFn: async () => {
      // Local date — toISOString() would shift to tomorrow's date in the evening (UTC)
      const today = new Date().toLocaleDateString('sv-SE');
      
      // Log Sleep
      await base44.entities.SleepLog.create({
        client_id: userId,
        date: today,
        hours_slept: hoursSlept[0],
        quality_rating: sleepQuality[0]
      });

      // Log Stress
      await base44.entities.StressLog.create({
        client_id: userId,
        date: today,
        stress_level: stressLevel[0],
        stressors: stressors
      });

      // Trigger recovery prescription generation
      await base44.functions.invoke("generateRecoveryPrescription", { client_id: userId, date: today });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["recoveryPrescription"]);
      toast.success("Logs saved! AI is generating your recovery protocol...");
      setStressors("");
    }
  });

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          Daily Readiness Log
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-foreground font-medium flex items-center gap-2"><Moon className="w-4 h-4 text-indigo-400"/> Hours Slept</span>
            <span className="text-indigo-400 font-bold">{hoursSlept[0]} hrs</span>
          </div>
          <Slider value={hoursSlept} onValueChange={setHoursSlept} max={12} min={2} step={0.5} className="[&_[role=slider]]:bg-indigo-500 [&_[role=slider]]:border-indigo-400" />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-foreground font-medium">Sleep Quality (1-5)</span>
            <span className="text-indigo-400 font-bold">{sleepQuality[0]}/5</span>
          </div>
          <Slider value={sleepQuality} onValueChange={setSleepQuality} max={5} min={1} step={1} className="[&_[role=slider]]:bg-indigo-500 [&_[role=slider]]:border-indigo-400" />
        </div>

        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex justify-between items-center text-sm">
            <span className="text-foreground font-medium">Stress Level (1-10)</span>
            <span className="text-red-400 font-bold">{stressLevel[0]}/10</span>
          </div>
          <Slider value={stressLevel} onValueChange={setStressLevel} max={10} min={1} step={1} className="[&_[role=slider]]:bg-red-500 [&_[role=slider]]:border-red-400" />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">What's on your mind? (Stressors)</label>
          <Textarea 
            value={stressors}
            onChange={(e) => setStressors(e.target.value)}
            placeholder="Work deadlines, family, sore muscles..."
            className="bg-background border-border text-foreground min-h-[80px]"
          />
        </div>

        <Button 
          onClick={() => logMutation.mutate()} 
          disabled={logMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold"
        >
          {logMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Log & Get Recovery Plan
        </Button>

      </CardContent>
    </Card>
  );
}