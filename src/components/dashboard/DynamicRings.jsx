import React, { useEffect, useState } from "react";

export default function DynamicRings({ calories = 0, calTarget = 2500, workoutStr = "0%", macrosStr = "0%" }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const size = 160;
  const strokeWidth = 14;
  const center = size / 2;

  // Calculate percentages
  const calPercent = Math.min(100, Math.max(0, (calories / calTarget) * 100));
  const workPercent = parseInt(workoutStr.replace("%", "")) || 0;
  const macroPercent = parseInt(macrosStr.replace("%", "")) || 0;

  const createRing = (radius, percentage, color, bg) => {
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = mounted ? circumference - (percentage / 100) * circumference : circumference;
    return (
      <g style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}>
        {/* Background Ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={bg}
          strokeWidth={strokeWidth}
        />
        {/* Progress Ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </g>
    );
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width={size} height={size} className="drop-shadow-xl">
        {/* Outer Ring - Calories (Red/Pink) */}
        {createRing(size / 2 - strokeWidth, calPercent, "#ef4444", "rgba(239, 68, 68, 0.2)")}
        {/* Middle Ring - Workout (Green) */}
        {createRing(size / 2 - strokeWidth * 2.2, workPercent, "#22c55e", "rgba(34, 197, 94, 0.2)")}
        {/* Inner Ring - Macros (Blue/Cyan) */}
        {createRing(size / 2 - strokeWidth * 3.4, macroPercent, "#06b6d4", "rgba(6, 182, 212, 0.2)")}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-foreground font-black text-xl">{calPercent.toFixed(0)}%</span>
      </div>
      
      <div className="flex gap-4 mt-6">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Move</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Exercise</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Macros</span>
        </div>
      </div>
    </div>
  );
}