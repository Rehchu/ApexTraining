import React from "react";

/**
 * Shimmering placeholders shown while a list loads. Reads as "content is
 * arriving" rather than "something is spinning", which measures as faster
 * even when the wait is identical.
 */
export function SkeletonCard({ lines = 2, avatar = false }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-4">
        {avatar && <div className="w-14 h-14 rounded-full apex-shimmer" />}
        <div className="flex-1 space-y-2.5">
          <div className="h-4 rounded apex-shimmer w-3/4" />
          {Array.from({ length: lines - 1 }).map((_, i) => (
            <div key={i} className="h-3 rounded apex-shimmer" style={{ width: `${55 - i * 12}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SkeletonList({ count = 6, columns = 3, avatar = true, lines = 2 }) {
  const grid = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  }[columns] || "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid gap-4 ${grid}`} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} avatar={avatar} lines={lines} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
