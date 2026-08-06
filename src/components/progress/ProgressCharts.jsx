import React, { useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";
import { TrendingUp, TrendingDown, Minus, Weight, Ruler, Zap, Activity, Trophy } from "lucide-react";
import { useUnitSystem } from "@/components/hooks/useUnitSystem";

const COLORS = {
  gold: "#d4a017",
  green: "#22c55e",
  red: "#ef4444",
  purple: "#8b5cf6",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  pink: "#ec4899",
};

const nivoTheme = {
  background: "transparent",
  textColor: "#6b7280",
  fontSize: 11,
  axis: {
    domain: { line: { stroke: "rgba(255,255,255,0.08)" } },
    ticks: { line: { stroke: "rgba(255,255,255,0.08)" }, text: { fill: "#6b7280", fontSize: 11 } },
  },
  grid: { line: { stroke: "rgba(255,255,255,0.05)" } },
  crosshair: { line: { stroke: "rgba(255,255,255,0.2)" } },
  legends: { text: { fill: "#9ca3af", fontSize: 11 } },
};

const Tooltip = ({ children }) => (
  <div style={{ background: "rgba(10,10,14,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px", color: "#e5e7eb", fontSize: 12 }}>
    {children}
  </div>
);

function TrendBadge({ value, inverse = false }) {
  if (!value || value === 0) return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Minus className="w-3 h-3" /> No change</span>;
  const isGood = inverse ? value < 0 : value > 0;
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${isGood ? "text-green-400" : "text-red-400"}`}>
      <Icon className="w-3 h-3" />{Math.abs(value)}%
    </span>
  );
}

function StatMini({ label, value, unit, trend, inverse, icon: Icon, color }) {
  return (
    <div className="glass-card rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `rgba(${color},0.15)` }}>
        <Icon className="w-5 h-5" style={{ color: `rgb(${color})` }} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-foreground">{value ?? "—"}</span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
        <TrendBadge value={trend} inverse={inverse} />
      </div>
    </div>
  );
}

const calcTrend = (data, key) => {
  const valid = data.filter(d => d[key] != null);
  if (valid.length < 2) return 0;
  const first = valid[0][key], last = valid[valid.length - 1][key];
  return parseFloat(((last - first) / first * 100).toFixed(1));
};

function LineChart({ series, height = 280 }) {
  return (
    <div style={{ height }}>
      <ResponsiveLine
        data={series}
        theme={nivoTheme}
        margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
        xScale={{ type: "point" }}
        yScale={{ type: "linear", min: "auto", max: "auto" }}
        curve="monotoneX"
        axisBottom={{ tickSize: 0, tickPadding: 10, tickRotation: -20 }}
        axisLeft={{ tickSize: 0, tickPadding: 10 }}
        enableGridX={false}
        colors={d => d.color}
        lineWidth={2.5}
        pointSize={6}
        pointColor={{ from: "color" }}
        pointBorderWidth={2}
        pointBorderColor="#080808"
        useMesh={true}
        legends={[{ anchor: "bottom-right", direction: "column", itemWidth: 100, itemHeight: 16, itemTextColor: "#9ca3af", symbolSize: 8, symbolShape: "circle", translateX: 20, translateY: -10 }]}
        tooltip={({ point }) => (
          <Tooltip><strong style={{ color: point.serieColor }}>{point.serieId}</strong>: {point.data.y}</Tooltip>
        )}
      />
    </div>
  );
}

export default function ProgressCharts({ logs }) {
  const { convertWeightDisplay, convertHeightDisplay, weightUnit, heightUnit } = useUnitSystem();
  const [activeTab, setActiveTab] = useState("weight");

  if (!logs || logs.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <TrendingUp className="w-14 h-14 mx-auto mb-4 text-gray-600" />
        <p className="text-muted-foreground font-medium">No progress data yet.</p>
        <p className="text-gray-600 text-sm mt-1">Log your first entry to start seeing trends!</p>
      </div>
    );
  }

  const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));

  const weightData = sortedLogs.filter(l => l.weight_kg || l.body_fat_percentage).map(l => ({
    date: new Date(l.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    weight: l.weight_kg ? Number(convertWeightDisplay(l.weight_kg)) : null,
    bodyFat: l.body_fat_percentage || null,
  }));

  const measurementsData = sortedLogs.filter(l => l.measurements && Object.values(l.measurements).some(v => v)).map(l => ({
    date: new Date(l.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    chest: l.measurements?.chest ? Number(convertHeightDisplay(l.measurements.chest)) : null,
    waist: l.measurements?.waist ? Number(convertHeightDisplay(l.measurements.waist)) : null,
    hips: l.measurements?.hips ? Number(convertHeightDisplay(l.measurements.hips)) : null,
    biceps: l.measurements?.biceps_left ? Number(convertHeightDisplay(l.measurements.biceps_left)) : null,
    thigh: l.measurements?.thigh_left ? Number(convertHeightDisplay(l.measurements.thigh_left)) : null,
  }));

  const performanceData = sortedLogs.filter(l => l.performance_metrics && Object.values(l.performance_metrics).some(v => v)).map(l => ({
    date: new Date(l.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    bench: l.performance_metrics?.bench_press_kg ? Number(convertWeightDisplay(l.performance_metrics.bench_press_kg)) : null,
    squat: l.performance_metrics?.squat_kg ? Number(convertWeightDisplay(l.performance_metrics.squat_kg)) : null,
    deadlift: l.performance_metrics?.deadlift_kg ? Number(convertWeightDisplay(l.performance_metrics.deadlift_kg)) : null,
    pullups: l.performance_metrics?.max_pullups || null,
    pushups: l.performance_metrics?.max_pushups || null,
    plank: l.performance_metrics?.plank_seconds || null,
  }));

  const biometricsData = sortedLogs.filter(l => l.biometrics && Object.values(l.biometrics).some(v => v)).map(l => ({
    date: new Date(l.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    hrv: l.biometrics?.hrv_ms || null,
    sleep: l.biometrics?.sleep_quality_score || null,
    cns: l.biometrics?.cns_readiness || null,
    glucose: l.biometrics?.fasting_glucose_mgdl || null,
  }));

  const prs = {
    bench: Math.max(...performanceData.map(d => d.bench || 0)),
    squat: Math.max(...performanceData.map(d => d.squat || 0)),
    deadlift: Math.max(...performanceData.map(d => d.deadlift || 0)),
    pullups: Math.max(...performanceData.map(d => d.pullups || 0)),
    pushups: Math.max(...performanceData.map(d => d.pushups || 0)),
    plank: Math.max(...performanceData.map(d => d.plank || 0)),
  };

  // Build Nivo line series
  const toLineSeries = (data, fields) =>
    fields.filter(f => data.some(d => d[f.key] != null)).map(f => ({
      id: f.label,
      color: f.color,
      data: data.filter(d => d[f.key] != null).map(d => ({ x: d.date, y: d[f.key] })),
    }));

  const weightSeries = toLineSeries(weightData, [
    { key: "weight", label: `Weight (${weightUnit})`, color: COLORS.green },
    { key: "bodyFat", label: "Body Fat %", color: COLORS.red },
  ]);

  const measurementSeries = toLineSeries(measurementsData, [
    { key: "chest", label: "Chest", color: COLORS.purple },
    { key: "waist", label: "Waist", color: COLORS.red },
    { key: "hips", label: "Hips", color: COLORS.pink },
    { key: "biceps", label: "Bicep", color: COLORS.green },
    { key: "thigh", label: "Thigh", color: COLORS.cyan },
  ]);

  const strengthSeries = toLineSeries(performanceData, [
    { key: "bench", label: `Bench (${weightUnit})`, color: COLORS.gold },
    { key: "squat", label: `Squat (${weightUnit})`, color: COLORS.green },
    { key: "deadlift", label: `Deadlift (${weightUnit})`, color: COLORS.red },
    { key: "pullups", label: "Pull-ups", color: COLORS.purple },
    { key: "pushups", label: "Push-ups", color: COLORS.cyan },
  ]);

  const biometricsSeries = toLineSeries(biometricsData, [
    { key: "hrv", label: "HRV (ms)", color: COLORS.cyan },
    { key: "sleep", label: "Sleep Score", color: COLORS.purple },
    { key: "cns", label: "CNS Readiness", color: COLORS.green },
    { key: "glucose", label: "Fasting Glucose", color: COLORS.red },
  ]);

  const prBarData = [
    { name: "Bench", value: prs.bench || 0, color: COLORS.gold },
    { name: "Squat", value: prs.squat || 0, color: COLORS.green },
    { name: "Deadlift", value: prs.deadlift || 0, color: COLORS.red },
  ].filter(d => d.value > 0);

  const tabs = [
    { id: "weight", label: "Weight & BF%" },
    { id: "measurements", label: "Measurements" },
    { id: "strength", label: "Strength" },
    { id: "biometrics", label: "Biometrics" },
    { id: "prs", label: "Personal Records" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatMini label="Current Weight" unit={weightUnit} value={weightData.at(-1)?.weight} trend={calcTrend(weightData, "weight")} icon={Weight} color="34,197,94" />
        <StatMini label="Body Fat" unit="%" value={weightData.at(-1)?.bodyFat} trend={calcTrend(weightData, "bodyFat")} inverse icon={Activity} color="239,68,68" />
        <StatMini label="Waist" unit={heightUnit} value={measurementsData.at(-1)?.waist} trend={calcTrend(measurementsData, "waist")} inverse icon={Ruler} color="139,92,246" />
        <StatMini label="Best Deadlift" unit={weightUnit} value={prs.deadlift || null} trend={calcTrend(performanceData, "deadlift")} icon={Zap} color="212,175,55" />
      </div>

      <div className="glass-card rounded-2xl p-5 space-y-5">
        <div className="flex gap-2 flex-wrap">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={activeTab === tab.id
                ? { background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }
                : { background: "rgba(255,255,255,0.04)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.06)" }}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "weight" && (
          weightData.length < 2
            ? <p className="text-gray-600 text-sm text-center py-10">Log at least 2 entries to see trends.</p>
            : <LineChart series={weightSeries} />
        )}

        {activeTab === "measurements" && (
          measurementsData.length < 2
            ? <p className="text-gray-600 text-sm text-center py-10">Log measurements to see trends.</p>
            : <LineChart series={measurementSeries} />
        )}

        {activeTab === "strength" && (
          performanceData.length < 2
            ? <p className="text-gray-600 text-sm text-center py-10">Log performance metrics to see trends.</p>
            : <LineChart series={strengthSeries} />
        )}

        {activeTab === "biometrics" && (
          biometricsData.length < 2
            ? <p className="text-gray-600 text-sm text-center py-10">Log biometrics to see trends.</p>
            : <LineChart series={biometricsSeries} />
        )}

        {activeTab === "prs" && (
          <div className="space-y-5">
            <p className="text-xs text-muted-foreground">Your all-time personal bests</p>
            {prBarData.length > 0 && (
              <div style={{ height: 220 }}>
                <ResponsiveBar
                  data={prBarData}
                  keys={["value"]}
                  indexBy="name"
                  theme={nivoTheme}
                  layout="horizontal"
                  margin={{ top: 10, right: 60, bottom: 30, left: 70 }}
                  padding={0.35}
                  colors={d => d.data.color}
                  borderRadius={4}
                  axisBottom={{ tickSize: 0, tickPadding: 8 }}
                  axisLeft={{ tickSize: 0, tickPadding: 10 }}
                  enableGridY={false}
                  enableLabel={true}
                  label={d => `${d.value} ${weightUnit}`}
                  labelTextColor="#ffffff"
                  labelSkipWidth={40}
                  tooltip={({ indexValue, value }) => (
                    <Tooltip><strong>{indexValue}</strong>: {value} {weightUnit}</Tooltip>
                  )}
                />
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Bench Press", value: prs.bench, unit: weightUnit, color: "212,175,55" },
                { label: "Squat", value: prs.squat, unit: weightUnit, color: "34,197,94" },
                { label: "Deadlift", value: prs.deadlift, unit: weightUnit, color: "239,68,68" },
                { label: "Pull-ups", value: prs.pullups, unit: "reps", color: "139,92,246" },
                { label: "Push-ups", value: prs.pushups, unit: "reps", color: "6,182,212" },
                { label: "Plank", value: prs.plank ? `${prs.plank}s` : null, unit: "", color: "236,72,153" },
              ].map(pr => (
                <div key={pr.label} className="rounded-xl p-3 text-center"
                  style={{ background: `rgba(${pr.color},0.07)`, border: `1px solid rgba(${pr.color},0.2)` }}>
                  <Trophy className="w-4 h-4 mx-auto mb-1" style={{ color: `rgb(${pr.color})` }} />
                  <p className="text-xs text-muted-foreground">{pr.label}</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {pr.value || "—"} <span className="text-xs text-muted-foreground">{pr.value ? pr.unit : ""}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}