import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Video } from
"lucide-react";
import VideoCallRoom from "@/components/video/VideoCallRoom";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isPast } from "date-fns";

const sessionTypeColors = {
  personal_training: "bg-blue-100 text-blue-700 border-blue-200",
  group_class: "bg-purple-100 text-purple-700 border-purple-200",
  assessment: "bg-orange-100 text-orange-700 border-orange-200",
  consultation: "bg-teal-100 text-teal-700 border-teal-200",
  video_call: "bg-yellow-100 text-yellow-700 border-yellow-200"
};

const statusColors = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-amber-100 text-amber-700"
};

const statusIcons = {
  scheduled: Clock,
  completed: CheckCircle2,
  cancelled: XCircle,
  no_show: AlertCircle
};

export default function ClientSchedule() {
  const [user, setUser] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState(null);

  const handleJoinCall = (roomId) => {
    setActiveRoomId(roomId);
    setVideoCallOpen(true);
  };

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      let profile = null;
      try {
        const byEmail = await base44.entities.Client.filter({ email: userData.email });
        if (byEmail.length > 0) profile = byEmail[0];
      } catch (e) {}
      if (!profile) {
        try {
          const byUserId = await base44.entities.Client.filter({ user_id: userData.id });
          if (byUserId.length > 0) profile = byUserId[0];
        } catch (e) {}
      }
      if (profile && !profile.user_id) {
        try { await base44.entities.Client.update(profile.id, { user_id: userData.id }); } catch (e) {}
        profile = { ...profile, user_id: userData.id };
      }
      setClientProfile(profile || null);
    };
    loadUser();
  }, []);

  const { data: sessions = [] } = useQuery({
    queryKey: ["clientSessions", user?.id, clientProfile?.id],
    queryFn: async () => {
      const p1 = await base44.entities.Session.filter({ client_id: user.id }).catch(()=>[]);
      const p2 = clientProfile ? await base44.entities.Session.filter({ client_id: clientProfile.id }).catch(()=>[]) : [];
      const combined = [...p1, ...p2];
      return combined.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
    },
    enabled: !!user
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSessionsForDate = (date) => {
    return sessions.filter((s) =>
    isSameDay(new Date(s.date + 'T00:00:00'), date)
    );
  };

  const selectedDateSessions = getSessionsForDate(selectedDate);
  const upcomingSessions = sessions.filter((s) => {
    const sessionDate = new Date(s.date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return s.status === 'scheduled' && sessionDate >= today;
  }).slice(0, 5);

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-3xl font-bold">My Schedule</h1>
          <p className="text-foreground mt-1">View your upcoming training sessions</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Total Sessions</p>
          <p className="text-2xl font-bold text-blue-600">{sessions.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card className="glass-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">{format(currentMonth, 'MMMM yyyy')}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={previousMonth} className="border-border text-foreground hover:bg-accent">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={nextMonth} className="border-border text-foreground hover:bg-accent">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) =>
                <div key={day} className="text-center text-sm font-medium text-muted-foreground pb-2">
                    {day}
                  </div>
                )}
                {daysInMonth.map((day) => {
                  const daySessions = getSessionsForDate(day);
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentDay = isToday(day);

                  return (
                    <button
                      key={day.toString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        aspect-square p-2 rounded-lg text-sm transition-all relative
                        ${!isSameMonth(day, currentMonth) ? 'text-gray-600' : 'text-foreground'}
                        ${isSelected ? 'bg-blue-600 text-foreground' : 'hover:bg-accent'}
                        ${isCurrentDay && !isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent' : ''}
                      `}>

                      <span className="font-medium">{format(day, 'd')}</span>
                      {daySessions.length > 0 &&
                      <div className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5`}>
                          {daySessions.slice(0, 3).map((_, idx) =>
                        <div
                          key={idx}
                          className={`h-1 w-1 rounded-full ${
                          isSelected ? 'bg-white' : 'bg-blue-400'}`
                          } />

                        )}
                        </div>
                      }
                    </button>);

                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Sessions Sidebar */}
        <div>
          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="text-base text-foreground">Upcoming Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingSessions.length > 0 ?
              upcomingSessions.map((session) => {
                const StatusIcon = statusIcons[session.status] || Clock;
                return (
                  <div
                    key={session.id}
                    className="p-3 rounded-lg bg-secondary hover:bg-accent transition-colors border border-border">

                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      sessionTypeColors[session.type] || 'bg-secondary text-muted-foreground'}`
                      }>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate capitalize">
                            {session.type?.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(session.date + 'T00:00:00'), 'MMM d')} • {session.start_time}
                          </p>
                          {session.type === 'video_call' && session.video_room_id && (
                            <Button 
                              size="sm" 
                              onClick={() => handleJoinCall(session.video_room_id)}
                              className="mt-2 h-7 text-xs bg-yellow-600 hover:bg-yellow-700 text-foreground w-full"
                            >
                              <Video className="w-3 h-3 mr-1" /> Join Call
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>);

              }) :

              <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No upcoming sessions</p>
                </div>
              }
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selected Date Sessions */}
      <Card className="glass-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">
            {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateSessions.length > 0 ?
          <div className="space-y-4">
              {selectedDateSessions.map((session) => {
              const StatusIcon = statusIcons[session.status] || Clock;
              return (
                <div key={session.id} className="flex items-start gap-4 p-4 rounded-xl bg-secondary hover:bg-accent transition-colors border border-border">
                    <div className={`h-14 w-14 rounded-xl flex items-center justify-center border-2 ${
                  sessionTypeColors[session.type] || 'bg-secondary text-muted-foreground border-border'}`
                  }>
                      <StatusIcon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground capitalize">
                            {session.type?.replace('_', ' ')}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {session.start_time} - {session.end_time}
                            </div>
                            {session.client_name &&
                          <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {session.client_name}
                              </div>
                          }
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={statusColors[session.status]}>
                            {session.status?.replace('_', ' ')}
                          </Badge>
                          {session.type === 'video_call' && session.video_room_id && (
                            <Button 
                              size="sm" 
                              onClick={() => handleJoinCall(session.video_room_id)}
                              className="h-8 text-xs bg-yellow-600 hover:bg-yellow-700 text-foreground"
                            >
                              <Video className="w-3 h-3 mr-1" /> Join Call
                            </Button>
                          )}
                        </div>
                      </div>
                      {session.notes &&
                    <p className="text-sm text-muted-foreground mt-2 p-3 bg-secondary rounded-lg">
                          {session.notes}
                        </p>
                    }
                    </div>
                  </div>);

            })}
            </div> :

          <div className="text-center py-12">
              <CalendarIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No sessions scheduled</h3>
              <p className="text-muted-foreground mt-2">You have no sessions on this date</p>
            </div>
          }
        </CardContent>
      </Card>

      {videoCallOpen && activeRoomId && (
        <VideoCallRoom
          open={videoCallOpen}
          onOpenChange={setVideoCallOpen}
          roomId={activeRoomId}
          userName={clientProfile?.full_name || user?.full_name}
        />
      )}
    </div>);

}