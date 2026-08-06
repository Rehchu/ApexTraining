import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Lock, Target, CheckCircle2, Circle, Flame, ChevronRight, Plus, Trash2, Trophy } from "lucide-react";
import { format } from "date-fns";

/**
 * LockInGoal – Inspired by lockin26's "One Year. One Goal." philosophy.
 * Clients lock into a single primary goal with milestones they track along
 * a visual "war path" journey. Celebrates wins, calls out drift.
 */
export default function LockInGoal({ goals = [], clientId, trainerId, readOnly = false }) {
  const queryClient = useQueryClient();
  const [showSetup, setShowSetup] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: "", description: "", target_date: "", milestones: [] });
  const [newMilestone, setNewMilestone] = useState("");

  // The single "locked in" goal = first active goal with milestones, or first active
  const lockedGoal = goals.find(g => g.status === "active" && g.milestones?.length > 0)
    || goals.find(g => g.status === "active");

  const completedGoals = goals.filter(g => g.status === "completed");

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Goal.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clientGoals"] }),
  });

  const createGoalMutation = useMutation({
    mutationFn: (data) => base44.entities.Goal.create({
      ...data,
      client_id: clientId,
      trainer_id: trainerId,
      category: "other",
      status: "active",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientGoals"] });
      setShowSetup(false);
      setNewGoal({ title: "", description: "", target_date: "", milestones: [] });
    },
  });

  const toggleMilestone = (goal, milestoneIdx) => {
    const updatedMilestones = (goal.milestones || []).map((m, i) =>
      i === milestoneIdx
        ? { ...m, achieved: !m.achieved, achieved_date: !m.achieved ? new Date().toISOString().split("T")[0] : null }
        : m
    );
    const allDone = updatedMilestones.every(m => m.achieved);
    updateGoalMutation.mutate({
      id: goal.id,
      data: { milestones: updatedMilestones, status: allDone ? "completed" : "active" }
    });
  };

  const addMilestone = () => {
    if (!newMilestone.trim()) return;
    setNewGoal(prev => ({
      ...prev,
      milestones: [...prev.milestones, { title: newMilestone.trim(), value: prev.milestones.length + 1, achieved: false }]
    }));
    setNewMilestone("");
  };

  const removeMilestone = (idx) => {
    setNewGoal(prev => ({ ...prev, milestones: prev.milestones.filter((_, i) => i !== idx) }));
  };

  const achievedCount = lockedGoal?.milestones?.filter(m => m.achieved).length || 0;
  const totalMilestones = lockedGoal?.milestones?.length || 0;
  const progress = totalMilestones > 0 ? Math.round((achievedCount / totalMilestones) * 100) : 0;

  if (showSetup) {
    return (
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Lock className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-black text-foreground text-lg">Lock In Your Goal</h3>
            <p className="text-xs text-muted-foreground">One goal. Full focus. No drift.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Goal</label>
            <Input
              value={newGoal.title}
              onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Lose 20 lbs by summer"
              className="mt-1 input-frosted"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Why This Matters</label>
            <Textarea
              value={newGoal.description}
              onChange={e => setNewGoal(p => ({ ...p, description: e.target.value }))}
              placeholder="Write the reason this goal matters to you..."
              className="mt-1 input-frosted"
              rows={2}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Target Date</label>
            <Input
              type="date"
              value={newGoal.target_date}
              onChange={e => setNewGoal(p => ({ ...p, target_date: e.target.value }))}
              className="mt-1 input-frosted"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Milestones (War Path)</label>
            <div className="space-y-2 mb-2">
              {newGoal.milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <ChevronRight className="w-3 h-3 text-red-400 flex-shrink-0" />
                  <span className="flex-1 text-sm text-muted-foreground">{m.title}</span>
                  <button onClick={() => removeMilestone(i)} className="text-gray-600 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newMilestone}
                onChange={e => setNewMilestone(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addMilestone()}
                placeholder="Add a milestone..."
                className="input-frosted"
              />
              <Button size="sm" onClick={addMilestone} style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" className="text-muted-foreground" onClick={() => setShowSetup(false)}>Cancel</Button>
          <Button
            disabled={!newGoal.title || createGoalMutation.isPending}
            onClick={() => createGoalMutation.mutate(newGoal)}
            className="flex-1 font-bold text-black"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
          >
            <Lock className="w-4 h-4 mr-2" /> Lock It In
          </Button>
        </div>
      </div>
    );
  }

  if (!lockedGoal) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <Lock className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="font-black text-foreground text-xl mb-2">No Goal Locked In</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
          You've tried every plan. <br />Lock into <strong className="text-red-400">one goal</strong> and the app holds you accountable.
        </p>
        {!readOnly && (
          <Button onClick={() => setShowSetup(true)} style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }} className="font-bold text-foreground">
            <Lock className="w-4 h-4 mr-2" /> Lock In My Goal
          </Button>
        )}
        {completedGoals.length > 0 && (
          <p className="text-xs text-gray-600 mt-4">{completedGoals.length} goal{completedGoals.length > 1 ? 's' : ''} completed 🎉</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Locked Goal Card */}
      <div className="rounded-2xl p-5 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, rgba(20,6,6,0.95), rgba(8,8,14,0.95))',
        border: '1px solid rgba(239,68,68,0.25)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 30px rgba(239,68,68,0.06)'
      }}>
        <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(ellipse at 0% 0%, #ef4444 0%, transparent 60%)' }} />
        <div className="relative">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <Lock className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-red-400/70 uppercase mb-1">🔒 Locked In</p>
                <h3 className="font-black text-foreground text-lg leading-tight">{lockedGoal.title}</h3>
                {lockedGoal.description && (
                  <p className="text-sm text-muted-foreground mt-1 italic">"{lockedGoal.description}"</p>
                )}
              </div>
            </div>
            <Badge style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', whiteSpace: 'nowrap' }}>
              {progress}%
            </Badge>
          </div>

          {/* Progress bar */}
          {totalMilestones > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{achievedCount} of {totalMilestones} milestones</span>
                {lockedGoal.target_date && <span>Target: {format(new Date(lockedGoal.target_date), 'MMM d, yyyy')}</span>}
              </div>
              <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: progress === 100 ? 'linear-gradient(90deg, #22c55e, #4ade80)' : 'linear-gradient(90deg, #ef4444, #f97316)' }}
                />
              </div>
            </div>
          )}

          {/* War Path / Milestones */}
          {totalMilestones > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">War Path</p>
              {lockedGoal.milestones.map((m, i) => (
                <button
                  key={i}
                  onClick={() => !readOnly && toggleMilestone(lockedGoal, i)}
                  disabled={readOnly}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:opacity-80"
                  style={{
                    background: m.achieved ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${m.achieved ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`
                  }}
                >
                  {m.achieved
                    ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    : <Circle className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  }
                  <span className={`text-sm flex-1 ${m.achieved ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>{m.title}</span>
                  {m.achieved && m.achieved_date && (
                    <span className="text-xs text-green-500">{format(new Date(m.achieved_date), 'MMM d')}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {progress === 100 && (
            <div className="mt-4 p-3 rounded-xl text-center" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <p className="text-green-400 font-bold text-sm">Goal Crushed! 🎉</p>
            </div>
          )}
        </div>
      </div>

      {!readOnly && (
        <button onClick={() => setShowSetup(true)} className="text-xs text-gray-600 hover:text-muted-foreground transition-colors flex items-center gap-1">
          <Plus className="w-3 h-3" /> Set a new goal
        </button>
      )}
    </div>
  );
}