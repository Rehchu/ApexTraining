import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay,
  addWeeks,
  subWeeks,
  isToday
} from "date-fns";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  MoreVertical,
  Check,
  X,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SessionForm from "@/components/sessions/SessionForm";
import VideoCallRoom from "@/components/video/VideoCallRoom";
import { cn } from "@/lib/utils";

const statusStyles = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  no_show: "bg-red-100 text-red-700 border-red-200"
};

const typeColors = {
  personal_training: "border-l-emerald-500",
  group_class: "border-l-blue-500",
  assessment: "border-l-purple-500",
  consultation: "border-l-amber-500",
  video_call: "border-l-yellow-500"
};

export default function Schedule() {
  const [user, setUser] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: () => base44.entities.Client.filter({ trainer_id: user?.id }),
    enabled: !!user,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions", user?.id],
    queryFn: () => base44.entities.Session.filter({ trainer_id: user?.id }, "-date"),
    enabled: !!user,
  });

  const updateSessionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Session.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const createSessionMutation = useMutation({
    mutationFn: (data) => base44.entities.Session.create({ ...data, trainer_id: user?.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getSessionsForDay = (day) => {
    return sessions.filter(s => isSameDay(new Date(s.date + 'T00:00:00'), day))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const getClientById = (clientId) => clients.find(c => (c.user_id || c.id) === clientId);

  const handleCreateSession = async (data) => {
    const selectedClient = clients.find(c => (c.user_id || c.id) === data.client_id);
    await createSessionMutation.mutateAsync({
      ...data,
      client_name: selectedClient?.full_name || ""
    });
    setSelectedDate(null);
    setEditingSession(null);
  };

  const handleUpdateSession = async (data) => {
    await updateSessionMutation.mutateAsync({ id: editingSession.id, data });
    setEditingSession(null);
  };

  const handleStatusChange = async (session, newStatus) => {
    await updateSessionMutation.mutateAsync({ id: session.id, data: { status: newStatus } });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Schedule</h1>
          <p className="text-muted-foreground mt-1">Manage your training sessions</p>
        </div>
        <Button 
          onClick={() => { setEditingSession(null); setSelectedDate(null); setShowSessionForm(true); }}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Session
        </Button>
      </div>

      {/* Week Navigation */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <h2 className="text-sm sm:text-lg font-semibold text-foreground text-center">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </h2>
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
            Today
          </Button>
        </div>

        {/* Mobile: List view */}
        <div className="block sm:hidden space-y-3">
          {weekDays.map((day) => {
            const daySessions = getSessionsForDay(day);
            return (
              <div key={day.toISOString()} className={cn("rounded-xl overflow-hidden", isToday(day) ? "ring-1 ring-emerald-500/40" : "")}>
                <div className={cn("flex items-center justify-between px-3 py-2", isToday(day) ? "bg-emerald-500/15" : "bg-secondary")}>
                  <div className="flex items-center gap-3">
                    <p className={cn("text-base font-bold", isToday(day) ? "text-emerald-400" : "text-foreground")}>{format(day, "d")}</p>
                    <p className="text-sm text-muted-foreground">{format(day, "EEEE")}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setSelectedDate(format(day, "yyyy-MM-dd")); setShowSessionForm(true); }}>
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>
                {daySessions.length > 0 ? (
                  <div className="divide-y divide-white/5 bg-white/[0.02]">
                    {daySessions.map((session) => {
                      const client = getClientById(session.client_id);
                      return (
                        <div key={session.id} className={cn("flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-accent", "border-l-4", typeColors[session.type] || typeColors.personal_training)}
                          onClick={() => { setEditingSession(session); setShowSessionForm(true); }}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{client?.full_name || session.client_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{session.start_time} · {session.type?.replace(/_/g, ' ')}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={cn("text-[10px]", statusStyles[session.status])}>{session.status}</Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="w-3 h-3" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(session, "completed"); }}><Check className="w-4 h-4 mr-2 text-emerald-600" /> Complete</DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(session, "cancelled"); }}><X className="w-4 h-4 mr-2 text-slate-500" /> Cancel</DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(session, "no_show"); }}><AlertCircle className="w-4 h-4 mr-2 text-red-500" /> No Show</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-600 bg-white/[0.02]">No sessions</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop: Week Grid */}
        <div className="hidden sm:grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="text-center pb-2 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground">{format(day, "EEE")}</p>
              <p className={cn("text-lg font-semibold mt-1", isToday(day) ? "text-emerald-400" : "text-foreground")}>{format(day, "d")}</p>
            </div>
          ))}
          {weekDays.map((day) => {
            const daySessions = getSessionsForDay(day);
            return (
              <div key={day.toISOString()} className={cn("min-h-[300px] p-2 rounded-xl transition-colors", isToday(day) ? "bg-emerald-500/10" : "bg-secondary", "hover:bg-accent")}>
                {daySessions.map((session) => {
                  const client = getClientById(session.client_id);
                  return (
                    <div key={session.id} className={cn("mb-2 p-2.5 bg-card rounded-lg border-l-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer", typeColors[session.type] || typeColors.personal_training)}
                      onClick={() => { setEditingSession(session); setShowSessionForm(true); }}>
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-muted-foreground">{session.start_time}</p>
                          <p className="font-medium text-sm text-foreground truncate">{client?.full_name || session.client_name || "Unknown"}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1"><MoreVertical className="w-3 h-3" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(session, "completed"); }}><Check className="w-4 h-4 mr-2 text-emerald-600" /> Complete</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(session, "cancelled"); }}><X className="w-4 h-4 mr-2 text-slate-500" /> Cancel</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(session, "no_show"); }}><AlertCircle className="w-4 h-4 mr-2 text-red-500" /> No Show</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <Badge className={cn("text-[10px]", statusStyles[session.status])}>{session.status}</Badge>
                        {session.type === 'video_call' && session.video_room_id && (
                          <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px] bg-yellow-600 hover:bg-yellow-700 text-foreground"
                            onClick={(e) => { e.stopPropagation(); setActiveRoomId(session.video_room_id); setVideoCallOpen(true); }}>Join</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <Button variant="ghost" size="sm" className="w-full mt-1 text-xs text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                  onClick={() => { setSelectedDate(format(day, "yyyy-MM-dd")); setShowSessionForm(true); }}>
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-muted-foreground">Session types:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-muted-foreground">Personal Training</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-muted-foreground">Group Class</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span className="text-muted-foreground">Assessment</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-muted-foreground">Consultation</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span className="text-muted-foreground">Video Call</span>
        </div>
      </div>

      <SessionForm
        open={showSessionForm}
        onOpenChange={(open) => { setShowSessionForm(open); if (!open) { setEditingSession(null); setSelectedDate(null); } }}
        session={editingSession || (selectedDate ? { date: selectedDate } : null)}
        clients={clients}
        onSubmit={editingSession ? handleUpdateSession : handleCreateSession}
      />

      {videoCallOpen && activeRoomId && (
        <VideoCallRoom
          open={videoCallOpen}
          onOpenChange={setVideoCallOpen}
          roomId={activeRoomId}
          userName={user?.data?.full_name || user?.full_name || "Trainer"}
        />
      )}
    </div>
  );
}