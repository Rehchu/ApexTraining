import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ChevronRight,
  Dumbbell,
  Utensils,
  Flame,
  Camera,
  Loader2,
  Upload,
  PlaySquare,
  CalendarDays,
  MessageCircle,
  BookOpen,
  CheckCircle2,
  Circle,
  TrendingUp,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const todayStr = () => new Date().toISOString().split("T")[0];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function ProgressRing({ value, max, size = 120, stroke = 10, color = "#10B981", label, sublabel }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="apex-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-foreground leading-none">{label}</span>
        {sublabel && <span className="text-[10px] text-muted-foreground mt-1">{sublabel}</span>}
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showTimelapse, setShowTimelapse] = useState(false);
  const [timelapseIndex, setTimelapseIndex] = useState(0);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
  });

  const { data: clientProfile } = useQuery({
    queryKey: ["clientProfile", user?.email, localStorage.getItem("adminViewMode"), localStorage.getItem("clientPreviewEmail")],
    queryFn: async () => {
      const emailToFind =
        localStorage.getItem("adminViewMode") === '"client"'
          ? localStorage.getItem("clientPreviewEmail") || user.email
          : user.email;
      const byEmail = await base44.entities.Client.filter({ email: emailToFind });
      return byEmail.length > 0 ? byEmail[0] : null;
    },
    enabled: !!user?.email,
    staleTime: 300000,
  });

  useEffect(() => {
    if (clientProfile && clientProfile.trainer_id === null) {
      navigate("/IndependentDashboard");
    }
  }, [clientProfile, navigate]);

  const clientId = clientProfile?.id;

  const { data: workoutPlans = [] } = useQuery({
    queryKey: ["clientWorkouts", clientId],
    queryFn: () => base44.entities.WorkoutPlan.filter({ client_id: clientId }),
    enabled: !!clientId,
  });
  const { data: mealPlans = [] } = useQuery({
    queryKey: ["clientMeals", clientId],
    queryFn: () => base44.entities.MealPlan.filter({ client_id: clientId }),
    enabled: !!clientId,
  });
  const { data: progressLogs = [] } = useQuery({
    queryKey: ["progressLogs", clientId],
    queryFn: () => base44.entities.ProgressLog.filter({ client_id: clientId }, "-date"),
    enabled: !!clientId,
  });
  const { data: habits = [] } = useQuery({
    queryKey: ["habits", clientId],
    queryFn: () => base44.entities.Habit.filter({ client_id: clientId }),
    enabled: !!clientId,
  });
  const { data: habitLogs = [] } = useQuery({
    queryKey: ["habitLogs", clientId],
    queryFn: () => base44.entities.HabitLog.filter({ client_id: clientId }),
    enabled: !!clientId,
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ["clientSessions", clientId],
    queryFn: () => base44.entities.Session.filter({ client_id: clientId }),
    enabled: !!clientId,
  });
  const { data: workoutLogs = [] } = useQuery({
    queryKey: ["clientWorkoutLogs", clientId],
    queryFn: () => base44.entities.WorkoutLog.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  // ---- derived ----
  const today = todayStr();
  const activePlan =
    workoutPlans.find((p) => p.status === "active") || workoutPlans[0] || null;
  const activeMealPlan =
    mealPlans.find((p) => p.status === "active") || mealPlans[0] || null;

  const habitsDoneToday = habits.filter((h) =>
    habitLogs.some((l) => l.habit_id === h.id && l.date === today && l.completed)
  ).length;

  const workoutsThisWeek = workoutLogs.filter((l) => {
    const d = new Date(l.date || l.created_date);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
    weekStart.setHours(0, 0, 0, 0);
    return d >= weekStart;
  }).length;
  const weeklyTarget = clientProfile?.weekly_workout_target || 4;

  const nextSession = sessions
    .filter((s) => s.status === "scheduled" && s.date >= today)
    .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")))[0];

  const streak = clientProfile?.current_streak || 0;

  const allPhotos = progressLogs
    .filter((log) => log.photo_urls && log.photo_urls.length > 0)
    .flatMap((log) => log.photo_urls.map((url) => ({ url, date: log.date })))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  useEffect(() => {
    let interval;
    if (showTimelapse && allPhotos.length > 0) {
      interval = setInterval(() => setTimelapseIndex((p) => (p + 1) % allPhotos.length), 1000);
    }
    return () => clearInterval(interval);
  }, [showTimelapse, allPhotos.length]);

  const toggleHabit = async (habit) => {
    const existing = habitLogs.find((l) => l.habit_id === habit.id && l.date === today);
    try {
      if (existing) {
        await base44.entities.HabitLog.update(existing.id, { completed: !existing.completed });
      } else {
        await base44.entities.HabitLog.create({
          habit_id: habit.id,
          client_id: clientId,
          date: today,
          completed: true,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["habitLogs", clientId] });
    } catch (e) {
      console.error("Habit toggle failed", e);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !clientProfile) return;
    setIsUploadingPhoto(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      let log = progressLogs.find((l) => l.date === today);
      if (log) {
        await base44.entities.ProgressLog.update(log.id, {
          photo_urls: [...(log.photo_urls || []), data.file_url],
        });
      } else {
        await base44.entities.ProgressLog.create({
          client_id: clientProfile.id,
          date: today,
          photo_urls: [data.file_url],
          trainer_id: clientProfile.trainer_id,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["progressLogs"] });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!user || !clientProfile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const firstName = (clientProfile.full_name || user.full_name || "").split(" ")[0];

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-6">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between pt-1 px-1">
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {greeting()}, {firstName}
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-2.5">
          <Flame className={`w-5 h-5 ${streak > 0 ? "text-orange-400" : "text-muted-foreground"}`} />
          <div className="leading-tight">
            <p className="text-lg font-bold text-foreground">{streak}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">day streak</p>
          </div>
        </div>
      </div>

      {/* ---- Today's Workout hero ---- */}
      <div className="glass-card-green p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
          <Dumbbell className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase mb-0.5">Today's Workout</p>
          {activePlan ? (
            <>
              <h2 className="text-lg font-bold text-foreground truncate">{activePlan.name || activePlan.title || "Workout Plan"}</h2>
              <p className="text-sm text-muted-foreground">
                {workoutsThisWeek}/{weeklyTarget} workouts this week
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-foreground">No plan assigned yet</h2>
              <p className="text-sm text-muted-foreground">Your trainer will set one up — check back soon.</p>
            </>
          )}
        </div>
        <Link
          to={createPageUrl("ClientWorkouts")}
          className="shrink-0 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold rounded-xl px-6 py-3 hover:opacity-90 transition"
        >
          {activePlan ? "Start" : "View"} <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* ---- Rings row: activity / habits / nutrition ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 flex flex-col items-center gap-3">
          <ProgressRing
            value={workoutsThisWeek}
            max={weeklyTarget}
            label={`${workoutsThisWeek}/${weeklyTarget}`}
            sublabel="workouts"
            color="#10B981"
          />
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" /> This week
          </p>
        </div>

        <div className="glass-card p-5 flex flex-col items-center gap-3">
          <ProgressRing
            value={habitsDoneToday}
            max={Math.max(habits.length, 1)}
            label={`${habitsDoneToday}/${habits.length || 0}`}
            sublabel="habits"
            color="#38BDF8"
          />
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Today
          </p>
        </div>

        <Link to={createPageUrl("ClientMeals")} className="glass-card p-5 flex flex-col items-center gap-3 hover:border-primary/40">
          <div className="w-[120px] h-[120px] rounded-full bg-secondary flex flex-col items-center justify-center">
            <Utensils className="w-7 h-7 text-amber-400 mb-1" />
            <span className="text-sm font-semibold text-foreground">{activeMealPlan ? "View plan" : "No plan"}</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Nutrition</p>
        </Link>
      </div>

      {/* ---- Habit checklist ---- */}
      {habits.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground">Today's habits</h3>
            <Link to={createPageUrl("ClientHabits")} className="text-sm text-primary hover:underline">
              All habits
            </Link>
          </div>
          <div className="space-y-2">
            {habits.slice(0, 5).map((habit) => {
              const done = habitLogs.some((l) => l.habit_id === habit.id && l.date === today && l.completed);
              return (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit)}
                  className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    done
                      ? "border-primary/40 bg-primary/10"
                      : "border-border bg-secondary/40 hover:border-primary/30"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                  <span className={`text-sm font-medium ${done ? "text-foreground line-through opacity-70" : "text-foreground"}`}>
                    {habit.name || habit.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Next session + quick actions ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" /> Next session
          </h3>
          {nextSession ? (
            <div>
              <p className="text-lg font-semibold text-foreground">
                {new Date(nextSession.date + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p className="text-sm text-muted-foreground">
                {nextSession.time || "Time TBD"} · {nextSession.type || nextSession.title || "Training session"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing scheduled. Message your trainer to book.</p>
          )}
          <Link to={createPageUrl("ClientSchedule")} className="mt-3 inline-flex items-center text-sm text-primary hover:underline">
            View schedule <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-bold text-foreground mb-3">Quick actions</h3>
          <div className="grid grid-cols-3 gap-2">
            <Link
              to={createPageUrl("Messages")}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-secondary/60 border border-border py-3 hover:border-primary/40 transition"
            >
              <MessageCircle className="w-5 h-5 text-sky-400" />
              <span className="text-xs text-muted-foreground">Message</span>
            </Link>
            <Link
              to={createPageUrl("ClientJournal")}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-secondary/60 border border-border py-3 hover:border-primary/40 transition"
            >
              <BookOpen className="w-5 h-5 text-violet-400" />
              <span className="text-xs text-muted-foreground">Journal</span>
            </Link>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-secondary/60 border border-border py-3 hover:border-primary/40 transition disabled:opacity-50"
            >
              {isUploadingPhoto ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <Camera className="w-5 h-5 text-primary" />
              )}
              <span className="text-xs text-muted-foreground">Photo</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
        </div>
      </div>

      {/* ---- Progress photos ---- */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" /> Progress photos
          </h3>
          <div className="flex gap-2">
            {allPhotos.length > 2 && (
              <button
                onClick={() => setShowTimelapse(true)}
                className="p-2 rounded-lg bg-secondary hover:bg-accent transition"
                title="View timelapse"
              >
                <PlaySquare className="w-4 h-4 text-primary" />
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="p-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition disabled:opacity-50"
            >
              {isUploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {allPhotos.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {allPhotos.slice(0, 12).map((photo, i) => (
              <div key={i} className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-border bg-secondary">
                <img src={photo.url} className="w-full h-full object-cover" alt={`Progress ${i}`} />
                <div className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5">
                  <p className="text-[9px] text-center text-gray-300">
                    {new Date(photo.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Camera className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No photos yet — upload your first!</p>
          </div>
        )}
      </div>

      <Dialog open={showTimelapse} onOpenChange={setShowTimelapse}>
        <DialogContent className="max-w-2xl bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Progress Timelapse</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-square sm:aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center">
            {allPhotos.length > 0 && (
              <>
                <img src={allPhotos[timelapseIndex].url} className="w-full h-full object-contain" alt="Timelapse frame" />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full backdrop-blur-md">
                  <p className="text-white font-bold tracking-wide text-sm">
                    {new Date(allPhotos[timelapseIndex].date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
