import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveLine } from "@nivo/line";
import { DollarSign } from "lucide-react";

const nivoTheme = {
  background: "transparent",
  textColor: "#94a3b8",
  fontSize: 11,
  axis: {
    domain: { line: { stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 } },
    ticks: { line: { stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }, text: { fill: "#94a3b8", fontSize: 11 } },
    legend: { text: { fill: "#94a3b8", fontSize: 12 } },
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
  crosshair: { line: { stroke: "rgba(255,255,255,0.2)", strokeWidth: 1 } },
};

export default function RevenueChart({ payments }) {
  const monthlyRevenue = payments.reduce((acc, payment) => {
    if (payment.status === "completed") {
      const date = new Date(payment.paid_date || payment.updated_date || payment.created_date || new Date());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!acc[monthKey]) acc[monthKey] = { month: monthKey, revenue: 0 };
      acc[monthKey].revenue += payment.amount || 0;
    }
    return acc;
  }, {});

  const rawData = Object.values(monthlyRevenue)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map(item => ({
      x: new Date(item.month + "-01").toLocaleDateString("en-US", { month: "short" }),
      y: item.revenue,
    }));

  const totalRevenue = payments.filter(p => p.status === "completed").reduce((sum, p) => sum + (p.amount || 0), 0);
  const thisMonthRevenue = payments
    .filter(p => {
      if (p.status !== "completed") return false;
      const date = new Date(p.paid_date || p.updated_date || p.created_date || new Date());
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const lineData = [{ id: "Revenue", color: "#10b981", data: rawData }];

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          Revenue Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-emerald-500/10 rounded-lg">
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="text-2xl font-bold text-emerald-400">${totalRevenue.toFixed(2)}</div>
          </div>
          <div className="p-4 bg-blue-500/10 rounded-lg">
            <div className="text-sm text-muted-foreground">This Month</div>
            <div className="text-2xl font-bold text-blue-400">${thisMonthRevenue.toFixed(2)}</div>
          </div>
        </div>

        {rawData.length > 0 && (
          <div style={{ height: 250 }}>
            <ResponsiveLine
              data={lineData}
              theme={nivoTheme}
              margin={{ top: 10, right: 20, bottom: 40, left: 55 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: "auto", max: "auto" }}
              curve="monotoneX"
              axisBottom={{ tickSize: 5, tickPadding: 8 }}
              axisLeft={{ tickSize: 5, tickPadding: 8, format: v => `$${v}` }}
              enableGridX={false}
              colors={["#10b981"]}
              lineWidth={3}
              pointSize={8}
              pointColor="#10b981"
              pointBorderWidth={2}
              pointBorderColor="#080808"
              enableArea={true}
              areaOpacity={0.15}
              useMesh={true}
              tooltip={({ point }) => (
                <div style={{ background: "#0d0d0f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#e5e7eb", fontSize: 12 }}>
                  <strong>{point.data.xFormatted}</strong>: ${Number(point.data.y).toFixed(2)}
                </div>
              )}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}