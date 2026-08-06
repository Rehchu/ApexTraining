import React from "react";
import { cn } from "@/lib/utils";

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendUp
}) {
  return (
    <div className="relative overflow-hidden bg-secondary backdrop-blur-2xl border border-primary/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),_0_8px_32px_rgba(0,0,0,0.4)] rounded-3xl p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),_0_8px_32px_rgba(0,0,0,0.4),_0_0_20px_rgba(0,230,118,0.2)] group">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[inset_0_0_20px_rgba(0,230,118,0.1)]" />
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
        <Icon className="w-24 h-24 text-primary blur-[2px]" />
      </div>
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground drop-shadow-md">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "mt-2 inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border",
              trendUp ? "bg-primary/10 text-primary border-primary/30" : "bg-red-500/10 text-red-400 border-red-500/20"
            )}>
              <span>{trendUp ? "↑" : "↓"}</span>
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );
}