import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ChevronDown, Plus, Activity, Mail, Bell, ChevronLeft, ChevronRight, Eye, GripHorizontal, Sparkles, Bot, FileText, AlertCircle, CheckCircle } from "lucide-react";
import AdminFullDashboard from "@/components/admin/AdminFullDashboard";
import CoachBriefing from "@/components/dashboard/CoachBriefing";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeChart1, setActiveChart1] = useState("revenue");
  const [activeChart2, setActiveChart2] = useState("progress");

  useEffect(() => {
    const checkAuth = async () => {
      const userData = await base44.auth.me();
      if (!userData) return;
      if (userData.role === 'admin') {
        setUser(userData);
        return;
      }
      const isTrainer = userData.user_type === 'trainer' || (!userData.user_type && userData.role === 'trainer');
      if (!isTrainer) {
        navigate(createPageUrl("ClientDashboard"));
        return;
      }
      setUser(userData);
    };
    checkAuth();
  }, [navigate]);

  const { data: clients = [] } = useQuery({ queryKey: ["clients", user?.id], queryFn: () => base44.entities.Client.filter({ trainer_id: user?.id }), enabled: !!user });
  const { data: leads = [] } = useQuery({ queryKey: ["leads", user?.id], queryFn: () => base44.entities.Lead.filter({ trainer_id: user?.id }), enabled: !!user });
  const { data: sessions = [] } = useQuery({ queryKey: ["sessions", user?.id], queryFn: () => base44.entities.Session.filter({ trainer_id: user?.id }), enabled: !!user });
  const { data: contracts = [] } = useQuery({ queryKey: ["contracts", user?.id], queryFn: () => base44.entities.Contract.filter({ trainer_id: user?.id }), enabled: !!user });
  const { data: formChecks = [] } = useQuery({ queryKey: ["formChecks", user?.id], queryFn: () => base44.entities.FormCheck.filter({ trainer_id: user?.id, status: "pending" }), enabled: !!user });

  const pendingContracts = contracts.filter(c => c.status === "sent");

  const totalSessionsCount = sessions.length;
  const activeClientsCount = clients.filter(c => c.status === "active").length;
  const upcomingSessionsCount = sessions.filter(s => new Date(s.date + 'T00:00:00') >= new Date() && s.status === "scheduled").length;

  const adminViewMode = (() => { try { const v = localStorage.getItem('adminViewMode'); return v ? JSON.parse(v) : 'full'; } catch { return localStorage.getItem('adminViewMode') || 'full'; } })();
  const isAdmin = user?.role === 'admin' && adminViewMode !== 'trainer';
  const { data: allUsers = [] } = useQuery({ 
    queryKey: ["allUsers"], 
    queryFn: () => base44.entities.User.filter({}), 
    enabled: isAdmin 
  });
  const { data: allSessionsAdmin = [] } = useQuery({ 
    queryKey: ["allSessionsAdmin"], 
    queryFn: () => base44.entities.Session.filter({}), 
    enabled: isAdmin 
  });

  const adminTrainers = allUsers.filter(u => u.role === 'trainer' || u.user_type === 'trainer');
  const adminClients = allUsers.filter(u => u.role !== 'admin' && u.role !== 'trainer' && u.user_type !== 'trainer');

  if (!user) return <div className="min-h-screen bg-background"></div>;

  if (isAdmin) {
    return (
      <AdminFullDashboard 
        user={user}
        onLogout={() => base44.auth.logout()}
        onToggleView={() => {
          localStorage.setItem('adminViewMode', JSON.stringify('client'));
          window.location.href = createPageUrl('ClientDashboard');
        }}
        onToggleTrainerView={user?.user_type === 'trainer' ? () => {
          localStorage.setItem('adminViewMode', JSON.stringify('trainer'));
          window.location.href = createPageUrl('Dashboard');
        } : undefined}
        allUsers={allUsers}
        trainers={adminTrainers}
        allClients={adminClients}
        allSessions={allSessionsAdmin}
      />
    );
  }

  return (
    <div className="text-foreground font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold tracking-wide">Dashboard</h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => document.dispatchEvent(new CustomEvent('openClientPicker'))}
            className="px-4 py-2 rounded-xl text-sm font-bold border border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-2 transition-all"
          >
            <Eye className="w-4 h-4" />
            Client View
          </button>
        </div>
      </div>

      <CoachBriefing />

      <ResponsiveGridLayout
        className="layout -mx-4 sm:mx-0"
        layouts={{
          lg: [
            { i: "earnings", x: 0, y: 0, w: 1, h: 1 },
            { i: "clients", x: 1, y: 0, w: 1, h: 1 },
            { i: "sessions", x: 2, y: 0, w: 1, h: 1 },
            { i: "chart1", x: 0, y: 1, w: 2, h: 2.2 },
            { i: "calendar", x: 2, y: 1, w: 1, h: 1.6 },
            { i: "action_center", x: 2, y: 2.6, w: 1, h: 1.6 },
            { i: "pipeline", x: 0, y: 3.2, w: 1.5, h: 1.6 },
            { i: "chart2", x: 1.5, y: 3.2, w: 1.5, h: 1.6 },
            { i: "pending_contracts", x: 0, y: 4.8, w: 3, h: 1.6 }
          ],
          md: [
            { i: "earnings", x: 0, y: 0, w: 1, h: 1 },
            { i: "clients", x: 1, y: 0, w: 1, h: 1 },
            { i: "sessions", x: 2, y: 0, w: 1, h: 1 },
            { i: "chart1", x: 0, y: 1, w: 3, h: 2.2 },
            { i: "calendar", x: 0, y: 3.2, w: 1.5, h: 1.6 },
            { i: "action_center", x: 1.5, y: 3.2, w: 1.5, h: 1.6 },
            { i: "pipeline", x: 0, y: 4.8, w: 1.5, h: 1.6 },
            { i: "chart2", x: 1.5, y: 4.8, w: 1.5, h: 1.6 },
            { i: "pending_contracts", x: 0, y: 6.4, w: 3, h: 1.6 }
          ],
          sm: [
            { i: "earnings", x: 0, y: 0, w: 2, h: 1 },
            { i: "clients", x: 0, y: 1, w: 1, h: 1 },
            { i: "sessions", x: 1, y: 1, w: 1, h: 1 },
            { i: "chart1", x: 0, y: 2, w: 2, h: 2.2 },
            { i: "calendar", x: 0, y: 4.2, w: 2, h: 1.6 },
            { i: "action_center", x: 0, y: 5.8, w: 2, h: 1.6 },
            { i: "pipeline", x: 0, y: 7.4, w: 2, h: 1.6 },
            { i: "chart2", x: 0, y: 9.0, w: 2, h: 2.2 },
            { i: "pending_contracts", x: 0, y: 11.2, w: 2, h: 1.6 }
          ],
          xs: [
            { i: "earnings", x: 0, y: 0, w: 1, h: 1 },
            { i: "clients", x: 0, y: 1, w: 1, h: 1 },
            { i: "sessions", x: 0, y: 2, w: 1, h: 1 },
            { i: "chart1", x: 0, y: 3, w: 1, h: 2.2 },
            { i: "calendar", x: 0, y: 5.2, w: 1, h: 1.6 },
            { i: "action_center", x: 0, y: 6.8, w: 1, h: 1.6 },
            { i: "pipeline", x: 0, y: 8.4, w: 1, h: 1.6 },
            { i: "chart2", x: 0, y: 10.0, w: 1, h: 2.2 },
            { i: "pending_contracts", x: 0, y: 12.2, w: 1, h: 1.6 }
          ]
        }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 3, md: 3, sm: 2, xs: 1, xxs: 1 }}
        rowHeight={160}
        containerPadding={[0, 0]}
        margin={[24, 24]}
        isDraggable={true}
        isResizable={true}
        draggableHandle=".drag-handle"
      >
        {/* Earnings */}
        <div key="earnings" className="glass-card-green p-6 relative overflow-hidden flex flex-col justify-between h-full rounded-2xl group">
          
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs font-bold tracking-wide text-primary uppercase">Total sessions</p>
              <GripHorizontal className="w-5 h-5 text-muted-foreground cursor-grab drag-handle hover:text-primary transition-colors" />
            </div>
            <h2 className="text-5xl font-bold mb-1 text-foreground drop-">{totalSessionsCount.toLocaleString()}</h2>
            <p className="text-xs text-muted-foreground mb-2">all time</p>
            <div className="flex items-center gap-1.5 text-[10px] text-green-300 bg-green-500/10 w-max px-2 py-0.5 rounded border border-green-500/20 mb-4">
              <Sparkles className="w-3 h-3" />
              {upcomingSessionsCount} upcoming
            </div>
          </div>
          
          <div className="w-full bg-secondary h-3 rounded-full mt-auto relative overflow-hidden border border-primary/20 backdrop-blur-sm z-10">
            <div className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-[#00E676] to-[#10B981] rounded-full" style={{ width: '65%' }}></div>
          </div>
        </div>

        {/* Active Clients */}
        <div key="clients" className="glass-card-purple p-6 relative overflow-hidden flex justify-between h-full rounded-2xl group">
          <div className="flex flex-col w-full h-full relative z-10">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs font-bold tracking-wide text-[#A855F7] uppercase">Active Clients</p>
              <GripHorizontal className="w-5 h-5 text-muted-foreground cursor-grab drag-handle hover:text-[#A855F7] transition-colors" />
            </div>
            <h2 className="text-5xl font-bold text-foreground drop-">{activeClientsCount}</h2>
            <div className="flex items-end gap-2.5 h-full pt-4 w-full">
              {[40, 70, 30, 90, 50].map((h, i) => (
                <div key={i} className="flex-1 bg-secondary border border-[#A855F7]/20 rounded-t-lg relative overflow-hidden transition-all duration-500 group-hover:bg-[#A855F7]/30" style={{ height: `${h}%` }}>
                  {i === 3 && <div className="absolute top-0 left-0 right-0 h-1 bg-[#A855F7]"></div>}
                  {i === 3 && <div className="absolute inset-0 bg-gradient-to-b from-[#A855F7]/40 to-transparent"></div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div key="sessions" className="glass-card-gold p-6 relative overflow-hidden flex justify-between h-full rounded-2xl group">
          <div className="flex flex-col w-full h-full relative z-10">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs font-bold tracking-wide text-[#FACC15] uppercase">Upcoming Sessions</p>
              <GripHorizontal className="w-5 h-5 text-muted-foreground cursor-grab drag-handle hover:text-[#FACC15] transition-colors" />
            </div>
            <h2 className="text-5xl font-bold text-foreground drop-">{upcomingSessionsCount}</h2>
            <div className="flex items-end gap-2.5 h-full pt-4 w-full">
              {[50, 30, 80, 40, 60].map((h, i) => (
                <div key={i} className="flex-1 bg-secondary border border-[#FACC15]/20 rounded-t-lg relative overflow-hidden transition-all duration-500 group-hover:bg-[#FACC15]/30" style={{ height: `${h}%` }}>
                  {i === 2 && <div className="absolute top-0 left-0 right-0 h-1 bg-[#FACC15]"></div>}
                  {i === 2 && <div className="absolute inset-0 bg-gradient-to-b from-[#FACC15]/40 to-transparent"></div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts */}
        {['chart1', 'chart2'].map(chartId => {
          const activeChart = chartId === 'chart1' ? activeChart1 : activeChart2;
          const setActiveChart = chartId === 'chart1' ? setActiveChart1 : setActiveChart2;
          
          return (
            <div key={chartId} className="glass-card p-6 sm:p-8 h-full flex flex-col hover:border-primary/40 transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] z-0 pointer-events-none"></div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-8 gap-4 relative z-10">
                <h3 className="text-lg sm:text-xl font-bold">
                  {activeChart === 'revenue' ? 'Activity & Performance' : 
                   activeChart === 'progress' ? 'Client Progress Trends' : 
                   'Plans & Engagement'}
                </h3>
                <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
                  <div className="flex bg-secondary rounded-full p-1 border border-border">
                    <button 
                      onClick={() => setActiveChart('revenue')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${activeChart === 'revenue' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Activity
                    </button>
                    <button 
                      onClick={() => setActiveChart('progress')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${activeChart === 'progress' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Progress
                    </button>
                    <button 
                      onClick={() => setActiveChart('engagement')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${activeChart === 'engagement' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Engagement
                    </button>
                  </div>
                  <GripHorizontal className="w-5 h-5 text-muted-foreground cursor-grab drag-handle hover:text-foreground transition-colors flex-shrink-0" />
                </div>
              </div>
              
              <div className="relative flex-1 w-full flex items-end justify-between px-2 sm:px-6">
                {/* Y-axis lines */}
                <div className="absolute left-0 right-0 top-0 h-px bg-secondary border-dashed border-b border-border"></div>
                <div className="absolute left-0 right-0 top-1/4 h-px bg-secondary border-dashed border-b border-border"></div>
                <div className="absolute left-0 right-0 top-2/4 h-px bg-secondary border-dashed border-b border-border"></div>
                <div className="absolute left-0 right-0 top-3/4 h-px bg-secondary border-dashed border-b border-border"></div>
                <div className="absolute left-0 right-0 bottom-0 h-px bg-secondary border-solid border-b border-border"></div>

                {/* Y-axis labels */}
                {activeChart === 'revenue' && (
                  <>
                    <div className="absolute left-0 top-0 -translate-y-1/2 text-[10px] text-muted-foreground">20k</div>
                    <div className="absolute left-0 top-1/4 -translate-y-1/2 text-[10px] text-muted-foreground">15k</div>
                    <div className="absolute left-0 top-2/4 -translate-y-1/2 text-[10px] text-muted-foreground">10k</div>
                    <div className="absolute left-0 top-3/4 -translate-y-1/2 text-[10px] text-muted-foreground">5k</div>
                  </>
                )}
                {activeChart === 'progress' && (
                  <>
                    <div className="absolute left-0 top-0 -translate-y-1/2 text-[10px] text-muted-foreground">100%</div>
                    <div className="absolute left-0 top-1/4 -translate-y-1/2 text-[10px] text-muted-foreground">75%</div>
                    <div className="absolute left-0 top-2/4 -translate-y-1/2 text-[10px] text-muted-foreground">50%</div>
                    <div className="absolute left-0 top-3/4 -translate-y-1/2 text-[10px] text-muted-foreground">25%</div>
                  </>
                )}
                 {activeChart === 'engagement' && (
                  <>
                    <div className="absolute left-0 top-0 -translate-y-1/2 text-[10px] text-muted-foreground">150</div>
                    <div className="absolute left-0 top-1/4 -translate-y-1/2 text-[10px] text-muted-foreground">100</div>
                    <div className="absolute left-0 top-2/4 -translate-y-1/2 text-[10px] text-muted-foreground">50</div>
                    <div className="absolute left-0 top-3/4 -translate-y-1/2 text-[10px] text-muted-foreground">25</div>
                  </>
                )}
                <div className="absolute left-0 bottom-0 translate-y-1/2 text-[10px] text-muted-foreground">0</div>

                {/* Bars */}
                {activeChart === 'revenue' && [
                  { label: 'Workouts', rev: 40, perf: 60 },
                  { label: 'Meals', rev: 75, perf: 45 },
                  { label: 'Habits', rev: 55, perf: 80 },
                  { label: 'Resources', rev: 85, perf: 35 },
                  { label: 'Sessions', rev: 95, perf: 65 },
                  { label: 'Progress', rev: 60, perf: 75 },
                ].map((col, idx) => (
                  <div key={idx} className="relative z-10 flex flex-col items-center group h-full justify-end w-[14%] pb-6">
                    <div className="flex items-end justify-center gap-1.5 sm:gap-3 w-full h-[90%]">
                      <div className="w-3 sm:w-5 bg-gradient-to-t from-[#00E676]/60 to-[#00E676] rounded-t-full transition-all duration-300 group-hover:" style={{ height: `${col.rev}%` }}></div>
                      <div className="w-3 sm:w-5 bg-gradient-to-t from-orange-400/60 to-orange-400 rounded-t-full transition-all duration-300 group-hover:" style={{ height: `${col.perf}%` }}></div>
                    </div>
                    <span className="absolute bottom-0 text-[9px] sm:text-[10px] text-muted-foreground font-medium whitespace-nowrap">{col.label}</span>
                  </div>
                ))}

                {activeChart === 'progress' && [
                  { label: 'Week 1', val1: 30, val2: 20 },
                  { label: 'Week 2', val1: 45, val2: 35 },
                  { label: 'Week 3', val1: 60, val2: 50 },
                  { label: 'Week 4', val1: 75, val2: 65 },
                  { label: 'Week 5', val1: 85, val2: 80 },
                  { label: 'Week 6', val1: 95, val2: 90 },
                ].map((col, idx) => (
                  <div key={idx} className="relative z-10 flex flex-col items-center group h-full justify-end w-[14%] pb-6">
                    <div className="flex items-end justify-center gap-1.5 sm:gap-3 w-full h-[90%]">
                      <div className="w-3 sm:w-5 bg-gradient-to-t from-blue-500/60 to-blue-500 rounded-t-full transition-all duration-300 group-hover:" style={{ height: `${col.val1}%` }} title="Goal Completion"></div>
                      <div className="w-3 sm:w-5 bg-gradient-to-t from-purple-500/60 to-purple-500 rounded-t-full transition-all duration-300 group-hover:" style={{ height: `${col.val2}%` }} title="Check-in Rate"></div>
                    </div>
                    <span className="absolute bottom-0 text-[9px] sm:text-[10px] text-muted-foreground font-medium whitespace-nowrap">{col.label}</span>
                  </div>
                ))}

                 {activeChart === 'engagement' && [
                  { label: 'Mon', val1: 40 },
                  { label: 'Tue', val1: 65 },
                  { label: 'Wed', val1: 85 },
                  { label: 'Thu', val1: 55 },
                  { label: 'Fri', val1: 95 },
                  { label: 'Sat', val1: 30 },
                ].map((col, idx) => (
                  <div key={idx} className="relative z-10 flex flex-col items-center group h-full justify-end w-[14%] pb-6">
                    <div className="flex items-end justify-center gap-1.5 sm:gap-3 w-full h-[90%]">
                      <div className="w-3 sm:w-5 bg-gradient-to-t from-pink-500/60 to-pink-500 rounded-t-full transition-all duration-300 group-hover:" style={{ height: `${col.val1}%` }} title="Active Sessions"></div>
                    </div>
                    <span className="absolute bottom-0 text-[9px] sm:text-[10px] text-muted-foreground font-medium whitespace-nowrap">{col.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-border">
                 {activeChart === 'revenue' && (
                    <>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#00E676]"></div><span className="text-xs text-muted-foreground">Activity</span></div>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400"></div><span className="text-xs text-muted-foreground">Performance</span></div>
                    </>
                 )}
                 {activeChart === 'progress' && (
                    <>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-xs text-muted-foreground">Goal Completion</span></div>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div><span className="text-xs text-muted-foreground">Check-in Rate</span></div>
                    </>
                 )}
                  {activeChart === 'engagement' && (
                    <>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-pink-500"></div><span className="text-xs text-muted-foreground">Active Sessions</span></div>
                    </>
                 )}
              </div>
            </div>
          );
        })}

        {/* Calendar Block */}
        <div key="calendar" className="glass-card p-6 h-full flex flex-col hover:border-primary/40 transition-all duration-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] z-0 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">Select Date</h3>
            <div className="flex gap-2 items-center">
              <div className="flex gap-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-secondary flex items-center justify-center border border-border cursor-pointer hover:bg-accent transition"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-secondary flex items-center justify-center border border-border cursor-pointer hover:bg-accent transition"><ChevronRight className="w-4 h-4 text-muted-foreground" /></div>
              </div>
              <GripHorizontal className="w-5 h-5 text-muted-foreground cursor-grab drag-handle hover:text-foreground transition-colors ml-2" />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-xs mb-3 font-semibold text-muted-foreground">
              <div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div><div>Su</div>
            </div>
            <div className="grid grid-cols-7 gap-y-2 sm:gap-y-3 text-center text-xs sm:text-sm font-medium">
              {[28,29,30,1,2,3,4, 5,6,7,8,9,10,11, 12,13,14,15,16,17,18, 19,20,21,22,23,24,25, 26,27,28,29,30,31,1].map((d, i) => {
                const isSelected = d === 16 && i > 14 && i < 21;
                const isCurrent = d === 5 && i < 14;
                return (
                  <div key={i} className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto flex items-center justify-center rounded-full cursor-pointer transition-colors
                    ${isSelected ? 'bg-[#00E676] text-black' : 
                      isCurrent ? 'bg-primary/20 text-primary border border-primary/50' : 
                      (i < 3 || i > 33) ? 'text-gray-600' : 'text-muted-foreground hover:bg-accent hover:'}`}
                  >
                    {d}
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </div>

        {/* Action Center */}
        <div key="action_center" className="glass-card-red p-6 h-full flex flex-col hover:border-red-500/40 transition-all duration-500 relative overflow-hidden group">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-red-500">Needs Attention</h3>
              </div>
              <GripHorizontal className="w-5 h-5 text-muted-foreground cursor-grab drag-handle hover:text-foreground transition-colors" />
            </div>
            <div className="flex-1 flex flex-col gap-3 justify-center">
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-red-500/20 p-2 rounded-lg"><Activity className="w-4 h-4 text-red-400" /></div>
                  <span className="text-sm font-medium text-foreground">Missed Sessions</span>
                </div>
                <span className="font-black text-red-500">{sessions.filter(s => s.status === "missed" || s.status === "no_show").length}</span>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/20 p-2 rounded-lg"><CheckCircle className="w-4 h-4 text-orange-400" /></div>
                  <span className="text-sm font-medium text-foreground">Pending Form Checks</span>
                </div>
                <span className="font-black text-orange-500">{formChecks.length}</span>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 p-2 rounded-lg"><Mail className="w-4 h-4 text-blue-400" /></div>
                  <span className="text-sm font-medium text-foreground">Lead Follow-ups Due</span>
                </div>
                <span className="font-black text-blue-500">{leads.filter(l => l.status === "contacted").length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Pipeline */}
        <div key="pipeline" className="glass-card-purple p-6 h-full flex flex-col justify-between hover:border-[#A855F7]/40 transition-all duration-500 relative overflow-hidden group">
          <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="font-bold">Client Pipeline</h3>
              <GripHorizontal className="w-5 h-5 text-muted-foreground cursor-grab drag-handle hover:text-foreground transition-colors" />
            </div>
            <div className="flex flex-col items-center gap-2 max-w-[200px] mx-auto">
              <div className="w-full h-8 sm:h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-between px-4 shadow-[0_5px_20px_rgba(59,130,246,0.4)]">
                <span className="text-foreground font-bold text-xs sm:text-sm">Leads</span>
                <span className="text-foreground font-bold text-xs sm:text-sm">{leads.filter(l => l.status !== "won" && l.status !== "lost").length}</span>
              </div>
              <div className="w-[90%] h-8 sm:h-10 bg-gradient-to-r from-[#00E676] to-[#00A859] rounded-full flex items-center justify-between px-4 shadow-[0_5px_20px_rgba(0,230,118,0.4)]">
                <span className="text-black font-bold text-xs sm:text-sm">Active</span>
                <span className="text-black font-bold text-xs sm:text-sm">{clients.filter(c => c.status === "active").length}</span>
              </div>
              <div className="w-[80%] h-8 sm:h-10 bg-gradient-to-r from-[#00E676]/80 to-[#00A859]/80 rounded-full flex items-center justify-between px-4 shadow-[0_5px_15px_rgba(0,230,118,0.2)]">
                <span className="text-black font-bold text-xs sm:text-sm">Paused</span>
                <span className="text-black font-bold text-xs sm:text-sm">{clients.filter(c => c.status === "paused").length}</span>
              </div>
            </div>
            {leads.filter(l => l.status !== "won" && l.status !== "lost").length > 0 && (
              <div className="mt-4 flex items-center gap-2 text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg justify-center w-max mx-auto">
                <Bot className="w-3.5 h-3.5" />
                AI is auto-following up with {leads.filter(l => l.status !== "won" && l.status !== "lost").length} leads
              </div>
            )}
          </div>
          
          <div className="mt-4 flex flex-col sm:flex-row justify-center gap-2">
            <Link to={createPageUrl("Workouts")} className="w-full sm:w-auto">
              <button className="w-full justify-center px-4 py-2 sm:px-4 sm:py-2.5 bg-card backdrop-blur-md border border-[#A855F7]/30 rounded-full text-xs font-semibold hover:bg-[#A855F7]/20 hover:border-[#A855F7]/50 hover: transition-all duration-300 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#A855F7]" /> Add Workout
              </button>
            </Link>
            <Link to={createPageUrl("Meals")} className="w-full sm:w-auto">
              <button className="w-full justify-center px-4 py-2 sm:px-4 sm:py-2.5 bg-card backdrop-blur-md border border-[#A855F7]/30 rounded-full text-xs font-semibold hover:bg-[#A855F7]/20 hover:border-[#A855F7]/50 hover: transition-all duration-300 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#A855F7]" /> Add Meal Plan
              </button>
            </Link>
          </div>
          </div>
        </div>

        {/* Pending Contracts Widget */}
        <div key="pending_contracts" className="glass-card p-6 h-full flex flex-col hover:border-amber-500/40 transition-all duration-500 relative overflow-hidden group">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold">Outstanding Contracts & Forms</h3>
                {pendingContracts.length > 0 && (
                  <span className="bg-amber-500/20 text-amber-500 text-xs px-2 py-0.5 rounded-full font-bold">
                    {pendingContracts.length} Pending
                  </span>
                )}
              </div>
              <GripHorizontal className="w-5 h-5 text-muted-foreground cursor-grab drag-handle hover:text-foreground transition-colors" />
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {pendingContracts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground pt-4">
                  <CheckCircle className="w-8 h-8 mb-2 opacity-50" />
                  <p>All clients are up to date on their forms!</p>
                </div>
              ) : (
                pendingContracts.map(contract => {
                  const needsUpload = contract.type === "medical_release" || contract.type === "waiver" || contract.title.toLowerCase().includes("medical release") || contract.title.toLowerCase().includes("liability waiver");
                  return (
                    <div key={contract.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary border border-border hover:bg-accent transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
                          <AlertCircle className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground font-medium truncate">{contract.client_name || "Unknown Client"}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {contract.title} - <span className="text-amber-400/80">{needsUpload ? "Waiting for Upload" : "Needs E-Signature"}</span>
                          </p>
                        </div>
                      </div>
                      <Link to={createPageUrl("Contracts")}>
                        <button className="px-3 py-1.5 bg-secondary hover:bg-accent text-foreground text-xs font-medium rounded-lg transition-colors whitespace-nowrap ml-2">
                          View Details
                        </button>
                      </Link>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}