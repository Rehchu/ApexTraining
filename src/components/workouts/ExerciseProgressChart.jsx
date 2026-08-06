import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/**
 * Charts a single exercise's progression (top set weight and total volume)
 * across workout logs. `logs` is the client's WorkoutLog list; each log has
 * an `exercises` array of { name, sets?, reps?, weight? } entries.
 */
export default function ExerciseProgressChart({ exerciseName, logs = [] }) {
  const points = logs
    .filter((log) => (log.exercises || []).some((e) => e.name === exerciseName))
    .map((log) => {
      const entries = (log.exercises || []).filter((e) => e.name === exerciseName);
      const topWeight = Math.max(0, ...entries.map((e) => Number(e.weight) || 0));
      const volume = entries.reduce(
        (sum, e) => sum + (Number(e.weight) || 0) * (Number(e.reps) || 0) * (Number(e.sets) || 1),
        0
      );
      return {
        date: log.date || (log.created_date || "").split("T")[0],
        weight: topWeight,
        volume: Math.round(volume),
      };
    })
    .filter((p) => p.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No logged data for this exercise yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        <Line type="monotone" dataKey="weight" name="Top weight" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="volume" name="Volume" stroke="#38BDF8" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
