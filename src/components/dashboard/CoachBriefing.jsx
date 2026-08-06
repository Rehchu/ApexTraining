import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, TrendingUp, AlertCircle, RefreshCw, Loader2 } from "lucide-react";

/**
 * Coach's Briefing — a daily AI triage of the trainer's roster.
 * Generated on the backend from real activity data and cached per day.
 */
export default function CoachBriefing() {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["coachBriefing"],
    queryFn: async () => {
      const { data } = await base44.functions.invoke("coachBriefing", {});
      return data;
    },
    staleTime: 1000 * 60 * 60, // it's cached server-side per day anyway
    retry: 1,
  });

  const regenerate = async () => {
    await base44.functions.invoke("coachBriefing", { force: true });
    queryClient.invalidateQueries({ queryKey: ["coachBriefing"] });
    refetch();
  };

  if (isLoading) {
    return (
      <div className="glass-card p-5 mb-6 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Preparing your briefing…</span>
      </div>
    );
  }

  const briefing = data?.briefing;
  if (!briefing) return null; // no clients yet, or AI unavailable — stay quiet

  return (
    <div className="glass-card p-5 sm:p-6 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground leading-tight">Coach's briefing</h2>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
        <button
          onClick={regenerate}
          disabled={isFetching}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition disabled:opacity-50"
          title="Regenerate"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <p className="text-sm text-foreground mb-4">{briefing.headline}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {briefing.wins?.length > 0 && (
          <div className="rounded-xl border border-border bg-secondary/50 p-4">
            <p className="text-xs font-semibold text-primary flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5" /> Going strong
            </p>
            <ul className="space-y-1.5">
              {briefing.wins.slice(0, 3).map((w, i) => (
                <li key={i} className="text-sm text-foreground">
                  <span className="font-medium">{w.client}</span>
                  <span className="text-muted-foreground"> — {w.note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {briefing.needs_attention?.length > 0 && (
          <div className="rounded-xl border border-border bg-secondary/50 p-4">
            <p className="text-xs font-semibold text-amber-600 flex items-center gap-1.5 mb-2">
              <AlertCircle className="w-3.5 h-3.5" /> Needs attention
            </p>
            <ul className="space-y-1.5">
              {briefing.needs_attention.slice(0, 3).map((n, i) => (
                <li key={i} className="text-sm text-foreground">
                  <span className="font-medium">{n.client}</span>
                  <span className="text-muted-foreground"> — {n.reason}. </span>
                  <span className="text-foreground">{n.suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {briefing.focus_tip && (
        <p className="text-sm text-muted-foreground mt-4 pt-3 border-t border-border">
          <span className="font-medium text-foreground">Today's focus:</span> {briefing.focus_tip}
        </p>
      )}
    </div>
  );
}
