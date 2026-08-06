import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowRight, LogOut, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TrainerManagement from "./TrainerManagement";

export default function AdminFullDashboard({ 
  user, 
  onLogout, 
  onToggleView,
  onToggleTrainerView,
  allUsers,
  trainers,
  allClients,
  allSessions
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const stats = [
    { label: "Total Users", value: allUsers.length, color: "#00E676", path: "Clients" },
    { label: "Trainers", value: trainers.length, color: "#FF6B00", path: "TrainerCommunity" },
    { label: "Clients", value: allClients.length, color: "#3b82f6", path: "Clients" },
    { label: "Sessions", value: allSessions.length, color: "#a855f7", path: "Schedule" }
  ];

  const adminActions = [
    { label: "Admin Journey", path: "AdminJourney", desc: "View platform growth" },
    { label: "Manage Users", path: "Clients", desc: "View and manage all users" },
    { label: "Trainers", path: "TrainerCommunity", desc: "Manage trainer community" },
    { label: "Messages", path: "Messages", desc: "View system messages" },
    { label: "Resources", path: "Resources", desc: "Manage resources" },
    { label: "Contracts", path: "Contracts", desc: "View contracts" }
  ];

  return (
    <div className="text-foreground font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl font-bold tracking-wide">Admin overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Everything happening across ApexCoach</p>
        </div>
        <div className="flex items-center gap-2">
          {onToggleTrainerView && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleTrainerView}
              className="text-primary border-primary/30 hover:bg-primary/10"
            >
              Trainer View
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleView}
            className="text-primary border-primary/30 hover:bg-primary/10"
          >
            <Monitor className="w-4 h-4 mr-2" />
            Client View
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const glowClass = stat.color === '#00E676' ? 'glass-card-green' : 
                              stat.color === '#FF6B00' ? 'glass-card-gold' : 
                              stat.color === '#3b82f6' ? 'glass-card' : 'glass-card-purple';
            return (
            <Link key={stat.label} to={createPageUrl(stat.path)}>
              <div className={`${glowClass} p-6 rounded-2xl cursor-pointer group transition-all duration-500 h-full relative overflow-hidden`}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-[40px] opacity-20 group-hover:opacity-50 transition-opacity duration-500" style={{ background: stat.color }}></div>
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-xs font-bold tracking-wide uppercase mb-1" style={{ color: stat.color }}>{stat.label}</p>
                    <p className="text-4xl font-bold text-foreground drop-">{stat.value}</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-border backdrop-blur-md shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" style={{ background: `${stat.color}15` }}>
                    <div className="w-6 h-6 rounded-full animate-pulse" style={{ background: stat.color, opacity: 0.8, boxShadow: `0 0 15px ${stat.color}` }} />
                  </div>
                </div>
              </div>
            </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-bold tracking-wide uppercase text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminActions.map((action) => (
              <Link key={action.path} to={createPageUrl(action.path)}>
                <div className="glass-card p-5 rounded-2xl hover:border-primary/40 transition-all duration-500 group cursor-pointer relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00E676]/0 to-[#00E676]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="flex items-center justify-between mb-2 relative z-10">
                    <h3 className="font-bold text-foreground group-hover:text-primary group-hover:drop- transition-all">{action.label}</h3>
                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm text-muted-foreground relative z-10">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] z-0 pointer-events-none"></div>
          <div className="relative z-10">
            <h2 className="text-lg font-bold tracking-wide uppercase text-foreground mb-6">System information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-secondary p-4 rounded-2xl border border-border hover:border-primary/30 transition-all duration-300">
                <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase mb-1">Active users</p>
                <p className="text-3xl font-bold text-primary drop-">{allUsers.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{trainers.length} trainers</p>
              </div>
              <div className="bg-secondary p-4 rounded-2xl border border-border hover:border-[#FF6B00]/30 transition-all duration-300">
                <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase mb-1">Total clients</p>
                <p className="text-3xl font-bold text-[#FF6B00] drop-">{allClients.length}</p>
                <p className="text-xs text-muted-foreground mt-1">across all trainers</p>
              </div>
              <div className="bg-secondary p-4 rounded-2xl border border-border hover:border-border transition-all duration-300">
                <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase mb-1">Total sessions</p>
                <p className="text-3xl font-bold text-[#3b82f6] drop-">{allSessions.length}</p>
                <p className="text-xs text-muted-foreground mt-1">all time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trainer Management */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl relative overflow-hidden">
          <div className="relative z-10">
            <TrainerManagement 
              key={`trainers-${refreshKey}`}
              trainers={trainers} 
              onRefresh={() => setRefreshKey(k => k + 1)}
              title="Manage Trainers"
              emptyMessage="No trainers found"
              entityType="trainer"
            />
          </div>
        </div>

        {/* Client Management */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl relative overflow-hidden">
          <div className="relative z-10">
            <TrainerManagement 
              key={`clients-${refreshKey}`}
              trainers={allClients} 
              onRefresh={() => setRefreshKey(k => k + 1)}
              title="Manage Client Users"
              emptyMessage="No clients found"
              entityType="client"
            />
          </div>
        </div>
      </div>
    </div>
  );
}