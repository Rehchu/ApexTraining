import React, { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";
import { format, parseISO } from "date-fns";

const nivoTheme = {
  background: "transparent",
  textColor: "#94a3b8",
  fontSize: 11,
  axis: {
    domain: { line: { stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 } },
    ticks: { line: { stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }, text: { fill: "#94a3b8", fontSize: 11 } },
  },
  grid: { line: { stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 } },
  tooltip: {
    container: {
      background: "#0d0d0f",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "10px",
      color: "#e5e7eb",
      fontSize: "12px",
    },
  },
};

export default function VolumeChart({ logs }) {
  const chartData = useMemo(() => {
    if (!logs || logs.length === 0) return [];
    const dateGroups = logs.reduce((acc, log) => {
      const dateStr = log.date;
      if (!acc[dateStr]) {
        acc[dateStr] = { date: dateStr, timestamp: new Date(dateStr).getTime(), displayDate: format(parseISO(dateStr), "MMM d"), totalVolume: 0, avgRir: 0, rirCount: 0 };
      }
      const volume = log.total_volume_load || log.exercises?.reduce((sum, ex) => sum + (ex.volume_load || 0), 0) || 0;
      acc[dateStr].totalVolume += volume;
      log.exercises?.forEach(ex => {
        if (ex.rir_completed && Array.isArray(ex.rir_completed)) {
          ex.rir_completed.forEach(rir => {
            if (rir !== null && rir !== undefined && rir !== "") {
              acc[dateStr].avgRir += Number(rir);
              acc[dateStr].rirCount += 1;
            }
          });
        }
      });
      return acc;
    }, {});

    return Object.values(dateGroups)
      .map(d => ({ ...d, avgRir: d.rirCount > 0 ? Number((d.avgRir / d.rirCount).toFixed(1)) : null }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [logs]);

  if (chartData.length === 0) return null;

  const volumeLineData = [{ id: "Volume", color: "#8b5cf6", data: chartData.map(d => ({ x: d.displayDate, y: d.totalVolume })) }];
  const rirBarData = chartData.filter(d => d.avgRir !== null).map(d => ({ date: d.displayDate, "Avg RIR": d.avgRir }));

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Total Volume Load</h4>
        <div style={{ height: 256 }}>
          <ResponsiveLine
            data={volumeLineData}
            theme={nivoTheme}
            margin={{ top: 10, right: 20, bottom: 40, left: 50 }}
            xScale={{ type: "point" }}
            yScale={{ type: "linear", min: "auto", max: "auto" }}
            curve="monotoneX"
            axisBottom={{ tickSize: 5, tickPadding: 8 }}
            axisLeft={{ tickSize: 5, tickPadding: 8, format: v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v }}
            enableGridX={false}
            colors={["#8b5cf6"]}
            lineWidth={3}
            pointSize={7}
            pointColor="#8b5cf6"
            pointBorderWidth={2}
            pointBorderColor="#080808"
            enableArea={true}
            areaOpacity={0.2}
            useMesh={true}
            tooltip={({ point }) => (
              <div style={{ background: "#0d0d0f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#e5e7eb", fontSize: 12 }}>
                <strong>{point.data.xFormatted}</strong>: {point.data.y} vol
              </div>
            )}
          />
        </div>
      </div>

      {rirBarData.length > 0 && (
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Average Reps in Reserve (RIR)</h4>
          <div style={{ height: 192 }}>
            <ResponsiveBar
              data={rirBarData}
              keys={["Avg RIR"]}
              indexBy="date"
              theme={nivoTheme}
              margin={{ top: 10, right: 20, bottom: 40, left: 40 }}
              padding={0.4}
              maxValue={5}
              colors={["#10b981"]}
              borderRadius={4}
              axisBottom={{ tickSize: 5, tickPadding: 8 }}
              axisLeft={{ tickSize: 5, tickPadding: 8 }}
              enableGridX={false}
              enableLabel={false}
              tooltip={({ id, value, indexValue }) => (
                <div style={{ background: "#0d0d0f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#e5e7eb", fontSize: 12 }}>
                  <strong>{indexValue}</strong>: {value} RIR
                </div>
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}