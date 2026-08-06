import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, BrainCircuit, HeartPulse, RefreshCw, Thermometer, Wind, ScanFace } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function ReadinessAnalyzer({ client, progressLogs }) {
  // Mock data based on progress logs or generate some for the preview
  const recentLog = progressLogs?.[0]?.biometrics || {
    hrv_ms: 68,
    sleep_quality_score: 72,
    cns_readiness: 65,
    injury_risk_flag: true,
    core_temperature: 36.8,
    respiratory_rate: 15
  };

  const getReadinessColor = (score) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getProgressColor = (score) => {
    if (score >= 80) return "[&>div]:bg-emerald-500";
    if (score >= 60) return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-red-500";
  };

  return (
    <Card className="glass-card border-border relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl text-foreground flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-blue-400" />
              AI Predictive Readiness
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Next-gen biometric analysis mapping CNS fatigue & injury vectors.
            </CardDescription>
          </div>
          {recentLog.injury_risk_flag ? (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              <AlertTriangle className="w-3 h-3 mr-1" /> High Injury Risk
            </Badge>
          ) : (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <Activity className="w-3 h-3 mr-1" /> Cleared for Max Effort
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-secondary p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">CNS Readiness</div>
            <div className={`text-2xl font-bold ${getReadinessColor(recentLog.cns_readiness)}`}>
              {recentLog.cns_readiness}%
            </div>
            <Progress value={recentLog.cns_readiness} className={`h-1.5 mt-2 bg-secondary ${getProgressColor(recentLog.cns_readiness)}`} />
          </div>
          
          <div className="bg-secondary p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Sleep Quality</div>
            <div className={`text-2xl font-bold ${getReadinessColor(recentLog.sleep_quality_score)}`}>
              {recentLog.sleep_quality_score}%
            </div>
            <Progress value={recentLog.sleep_quality_score} className={`h-1.5 mt-2 bg-secondary ${getProgressColor(recentLog.sleep_quality_score)}`} />
          </div>

          <div className="bg-secondary p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">HRV Baseline</div>
            <div className="text-2xl font-bold text-foreground flex items-center gap-2">
              {recentLog.hrv_ms} <span className="text-xs text-muted-foreground font-normal">ms</span>
            </div>
            <HeartPulse className="w-4 h-4 text-blue-400 mt-1 opacity-50" />
          </div>

          <div className="bg-secondary p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Auto-Adapt</div>
            <div className="text-sm font-medium text-foreground mt-1">
              {recentLog.injury_risk_flag ? "Volume reduced by 30%" : "No adaptation needed"}
            </div>
            <RefreshCw className="w-4 h-4 text-purple-400 mt-2 opacity-50" />
          </div>

          {/* New Metrics */}
          <div className="bg-secondary p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Core Temp</div>
            <div className="text-2xl font-bold text-foreground flex items-center gap-2">
              {recentLog.core_temperature || 36.8}°C
            </div>
            <Thermometer className="w-4 h-4 text-orange-400 mt-1 opacity-50" />
          </div>

          <div className="bg-secondary p-4 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Resp Rate</div>
            <div className="text-2xl font-bold text-foreground flex items-center gap-2">
              {recentLog.respiratory_rate || 14} <span className="text-xs text-muted-foreground font-normal">bpm</span>
            </div>
            <Wind className="w-4 h-4 text-cyan-400 mt-1 opacity-50" />
          </div>
        </div>

        {recentLog.injury_risk_flag && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <h4 className="text-sm font-bold text-red-400 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" /> AI Intervention Applied
            </h4>
            <p className="text-xs text-red-200/70">
              Low HRV combined with poor sleep efficiency indicates significant central nervous system fatigue. Lower body compound movements have been dynamically swapped to isolation exercises, and total training volume is reduced by 30% to prevent muscular tear.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}