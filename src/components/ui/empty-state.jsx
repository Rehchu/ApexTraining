import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

/**
 * Empty state that teaches rather than just reporting emptiness.
 * `hints` are short "here's how this works" lines shown under the action —
 * the first thing a new user reads on a screen they've never used.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  hints = [],
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus,
  secondaryLabel,
  onSecondary,
  filtered = false,
  onClearFilters,
}) {
  if (filtered) {
    return (
      <div className="text-center py-16 glass-card rounded-2xl">
        {Icon && <Icon className="w-12 h-12 mx-auto text-muted-foreground/50" />}
        <h3 className="mt-4 text-lg font-semibold text-foreground">No matches</h3>
        <p className="mt-2 text-muted-foreground text-sm">
          Nothing here fits your current search or filters.
        </p>
        {onClearFilters && (
          <Button variant="outline" className="mt-5" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-14 px-6 glass-card rounded-2xl">
      {Icon && (
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon className="w-7 h-7 text-primary" />
        </div>
      )}
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">{description}</p>
      )}

      {(actionLabel || secondaryLabel) && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          {actionLabel && (
            <Button onClick={onAction} className="gap-2">
              <ActionIcon className="w-4 h-4" />
              {actionLabel}
            </Button>
          )}
          {secondaryLabel && (
            <Button variant="outline" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}

      {hints.length > 0 && (
        <ul className="mt-8 mx-auto max-w-md text-left space-y-2 border-t border-border pt-6">
          {hints.map((hint, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-secondary text-foreground text-[11px] font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <span>{hint}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
