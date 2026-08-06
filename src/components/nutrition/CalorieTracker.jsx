import React from "react";
import { Flame, Beef, Wheat, Droplets } from "lucide-react";

/**
 * CalorieTracker – Inspired by gym-management-system-laravel's meal logging
 * with calorie tracking. Shows daily macro summary with visual ring.
 */
export default function CalorieTracker({ target = {}, actual = {} }) {
  const { calories: tCal = 2000, protein_g: tPro = 150, carbs_g: tCarb = 200, fat_g: tFat = 65 } = target;
  const { calories: aCal = 0, protein_g: aPro = 0, carbs_g: aCarb = 0, fat_g: aFat = 0 } = actual;

  const pct = (a, t) => Math.min(Math.round((a / t) * 100), 100);
  const calPct = pct(aCal, tCal);

  // SVG ring
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - calPct / 100);

  const macros = [
    { label: "Protein", actual: aPro, target: tPro, unit: "g", icon: Beef, color: "#ef4444", rgba: "239,68,68" },
    { label: "Carbs", actual: aCarb, target: tCarb, unit: "g", icon: Wheat, color: "#d4a017", rgba: "212,175,55" },
    { label: "Fat", actual: aFat, target: tFat, unit: "g", icon: Droplets, color: "#8b5cf6", rgba: "139,92,246" },
  ];

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <Flame className="w-4 h-4 text-red-400" />
        </div>
        <h3 className="font-bold text-foreground">Today's Nutrition</h3>
      </div>

      <div className="flex items-center gap-6 mb-5">
        {/* Calorie ring */}
        <div className="relative flex-shrink-0" style={{ width: 128, height: 128 }}>
          <svg width="128" height="128" className="absolute inset-0 -rotate-90">
            <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
            <circle
              cx="64" cy="64" r={r} fill="none"
              stroke={calPct >= 100 ? '#22c55e' : '#ef4444'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-foreground">{aCal}</span>
            <span className="text-xs text-muted-foreground">/ {tCal}</span>
            <span className="text-xs text-gray-600">kcal</span>
          </div>
        </div>

        {/* Macro bars */}
        <div className="flex-1 space-y-3">
          {macros.map(({ label, actual: a, target: t, unit, icon: Icon, color, rgba }) => {
            const p = pct(a, t);
            return (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3 h-3" style={{ color }} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <span className="text-xs font-semibold text-foreground">{a}<span className="text-gray-600">/{t}{unit}</span></span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${p}%`, background: `rgba(${rgba},0.7)` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {macros.map(({ label, actual: a, target: t, rgba }) => {
          const p = pct(a, t);
          return (
            <div key={label} className="rounded-xl p-2 text-center" style={{ background: `rgba(${rgba},0.05)`, border: `1px solid rgba(${rgba},0.12)` }}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-bold" style={{ color: `rgba(${rgba}, 1)` }}>{p}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}