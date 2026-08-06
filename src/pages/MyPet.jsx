import React from "react";
import { Sparkles, Dumbbell, Target, Trophy } from "lucide-react";

/**
 * Companion / gamification — temporarily disabled while the 3D pet models and
 * the full quest/journey system are being finished. Shows a "coming soon"
 * placeholder so the feature has a home in the nav without shipping half of it.
 */
export default function MyPet() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-card p-8 sm:p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
          Coming soon
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Your companion is in the works</h1>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          Earn an evolving 3D companion by training consistently. Complete workouts and quests to help it grow
          from an egg all the way to a legendary beast. We're putting the finishing touches on it — check back
          soon.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="rounded-xl border border-border bg-secondary/50 p-4">
            <Dumbbell className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm font-semibold text-foreground">Train to hatch</p>
            <p className="text-xs text-muted-foreground">Consistent workouts unlock your companion.</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/50 p-4">
            <Target className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm font-semibold text-foreground">Complete quests</p>
            <p className="text-xs text-muted-foreground">Trainer-assigned goals speed up its growth.</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/50 p-4">
            <Trophy className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm font-semibold text-foreground">Evolve & collect</p>
            <p className="text-xs text-muted-foreground">Watch it evolve through six stages.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
