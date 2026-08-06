import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, addDays, startOfWeek } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Flame, Trophy, Star, ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import confetti from "canvas-confetti";

// ── Icon picker symbols ──────────────────────────────────────────────────
const ICONS = [
  "💧","🌙","👣","🏃","💊","🧘","🤸","⚡","📚","🥗","💪","🎯",
  "🧠","❤️","🌿","☀️","🎵","✍️","🛌","🚴","🏋️","🍎","🧘‍♀️","🔥"
];

// ── Benchmark thresholds ─────────────────────────────────────────────────────
function getMedal(progress) {
  if (progress >= 1.0) return { label: "Optimal", color: "#FFD700", glow: "rgba(255,215,0,0.5)" };
  if (progress >= 0.66) return { label: "On Track", color: "#C0C0C0", glow: "rgba(192,192,192,0.4)" };
  if (progress >= 0.33) return { label: "Needs Work", color: "#CD7F32", glow: "rgba(205,127,50,0.4)" };
  return null;
}

// ── Week calendar strip ───────────────────────────────────────────────────
function WeekStrip({ selectedDate, onSelect }) {
  const [weekStart, setWeekStart] = useState(startOfWeek(selectedDate, { weekStartsOn: 1 }));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex items-center gap-1 justify-center">
      <button onClick={() => setWeekStart(d => subDays(d, 7))} className="p-1 text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="flex gap-1">
        {days.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const isSelected = key === format(selectedDate, "yyyy-MM-dd");
          const isToday = key === today;
          return (
            <button
              key={key}
              onClick={() => onSelect(day)}
              className={`flex flex-col items-center px-2 py-1.5 rounded-xl transition-all text-xs font-medium ${
                isSelected
                  ? "bg-white text-black"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <span className="text-[10px] uppercase">{format(day, "EEE")}</span>
              <span className={`text-sm font-bold mt-0.5 ${isToday && !isSelected ? "text-yellow-400" : ""}`}>
                {format(day, "d")}
              </span>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setWeekStart(d => addDays(d, 7))}
        disabled={addDays(weekStart, 6) >= new Date()}
        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Trophy medal progress ring ────────────────────────────────────────────
function MedalProgress({ progress, trueCount, total }) {
  const medal = getMedal(progress);
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - progress);
  const trackColor = medal ? medal.color : "rgba(255,255,255,0.15)";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <motion.circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke={trackColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ filter: medal ? `drop-shadow(0 0 6px ${medal.glow})` : "none" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {medal ? (
            <>
              <span className="text-3xl">{medal.label === "Optimal" ? "🏆" : medal.label === "On Track" ? "🎯" : "⭐"}</span>
              <span className="text-xs font-bold mt-0.5" style={{ color: medal.color }}>{medal.label}</span>
            </>
          ) : (
            <>
              <Trophy className="w-8 h-8 text-gray-600" />
              <span className="text-xs text-muted-foreground mt-1">Pending</span>
            </>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="text-foreground font-bold">{trueCount}</span> / {total} habits done
      </p>
    </div>
  );
}

// ── Individual habit card ────────────────────────────────────────────────
function HabitCard({ habit, dateKey, isCompleted, logNotes, onToggle, onDelete, readOnly }) {
  const [pressed, setPressed] = useState(false);
  const streak = habit.streak || 0;

  const handleTap = () => {
    if (readOnly) return;
    if (pressed) return;
    setPressed(true);
    onToggle();
    setTimeout(() => setPressed(false), 400);
  };

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.94 }}
      className="relative flex flex-col items-center justify-center rounded-2xl cursor-pointer select-none"
      style={{
        aspectRatio: "107.5/145",
        background: isCompleted ? "rgba(255,255,255,0.04)" : "rgba(30,30,32,0.9)",
        border: isCompleted ? "1.5px solid rgba(255,255,255,0.15)" : "1.5px solid rgba(255,255,255,0.06)",
        boxShadow: isCompleted ? "0 0 0 0 transparent" : "none",
        transition: "all 0.25s ease"
      }}
      onClick={handleTap}
    >
      {/* Delete button – trainer only */}
      {!readOnly && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/50 transition-all z-10"
        >
          <X className="w-3 h-3 text-red-400" />
        </button>
      )}

      {/* Icon */}
      <span
        className="text-4xl mb-1 transition-all duration-300"
        style={{ opacity: isCompleted ? 0.45 : 1, filter: isCompleted ? "grayscale(0.5)" : "none" }}
      >
        {habit.icon || "⭐"}
      </span>

      {/* Name */}
      <div className="flex flex-col items-center px-2">
        <p
          className="text-center text-xs font-semibold leading-tight transition-all"
          style={{
            color: isCompleted ? "rgba(255,255,255,0.4)" : "white",
            textDecoration: isCompleted ? "line-through" : "none",
            maxWidth: "90px",
            wordBreak: "break-word"
          }}
        >
          {habit.name}
        </p>
        {isCompleted && logNotes && (
          <p className="text-[10px] text-emerald-400 mt-1.5 font-medium text-center leading-tight bg-emerald-500/10 px-1.5 py-0.5 rounded">
            {logNotes}
          </p>
        )}
      </div>

      {/* Streak badge */}
      {streak > 0 && (
        <div className="flex items-center gap-0.5 mt-2">
          <Flame className="w-3 h-3 text-orange-400" />
          <span className="text-[10px] text-orange-400 font-bold">{streak}</span>
        </div>
      )}

      {/* Check overlay */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute top-2 left-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
          >
            <Check className="w-3 h-3 text-black" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Add Habit Card ────────────────────────────────────────────────────────
function AddHabitCard({ onClick }) {
  return (
    <motion.div
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="flex flex-col items-center justify-center rounded-2xl cursor-pointer border-dashed border-2 border-border hover:border-white/25 transition-all"
      style={{ aspectRatio: "107.5/145", background: "rgba(20,20,22,0.5)" }}
    >
      <Plus className="w-8 h-8 text-gray-600" />
    </motion.div>
  );
}

// ── Main TrophyHabitTracker ───────────────────────────────────────────────
export default function TrophyHabitTracker({ clientId, trainerId, readOnly = false }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("⭐");
  const [allDoneTriggered, setAllDoneTriggered] = useState(false);
  const [completionHabit, setCompletionHabit] = useState(null);
  const [completionData, setCompletionData] = useState({ time: "", meals: [] });

  const queryClient = useQueryClient();
  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const isToday = dateKey === format(new Date(), "yyyy-MM-dd");

  // Fetch habits
  const { data: habits = [] } = useQuery({
    queryKey: ["trophyHabits", clientId],
    queryFn: () => base44.entities.Habit.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  // Fetch logs
  const { data: habitLogs = [] } = useQuery({
    queryKey: ["trophyHabitLogs", clientId],
    queryFn: () => base44.entities.HabitLog.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  // Computed
  const completedIds = new Set(
    habitLogs.filter(l => l.date === dateKey && l.completed).map(l => l.habit_id)
  );
  const trueCount = completedIds.size;
  const total = habits.length;
  const progress = total > 0 ? trueCount / total : 0;
  const allCompleted = total > 0 && trueCount === total;

  // Confetti on all done
  useEffect(() => {
    if (allCompleted && isToday && !allDoneTriggered) {
      setAllDoneTriggered(true);
      confetti({ particleCount: 80, spread: 90, colors: ["#FFD700", "#C0C0C0", "#CD7F32", "#ffffff"] });
    }
    if (!allCompleted) setAllDoneTriggered(false);
  }, [allCompleted, isToday]);

  // Create habit
  const createHabit = useMutation({
    mutationFn: (data) => base44.entities.Habit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trophyHabits", clientId] });
      setAddOpen(false);
      setNewName("");
      setNewIcon("⭐");
    },
  });

  // Delete habit
  const deleteHabit = useMutation({
    mutationFn: (id) => base44.entities.Habit.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trophyHabits", clientId] }),
  });

  // Toggle habit log
  const executeToggleLog = async (habit, existing, extraData = null) => {
    let notes = "";
    if (extraData) {
      if (extraData.time) notes = extraData.time;
      if (extraData.meals && extraData.meals.length > 0) notes = `Meals: ${extraData.meals.join(", ")}`;
    }

    if (existing) {
      const newVal = !existing.completed;
      queryClient.setQueryData(["trophyHabitLogs", clientId], old =>
        (old || []).map(l => l.id === existing.id ? { ...l, completed: newVal, notes: newVal ? notes : "" } : l)
      );
      await base44.entities.HabitLog.update(existing.id, { completed: newVal, notes: newVal ? notes : "" });
      // Update streak
      if (newVal) {
        const newStreak = (habit.streak || 0) + 1;
        await base44.entities.Habit.update(habit.id, { streak: newStreak });
        queryClient.invalidateQueries({ queryKey: ["trophyHabits", clientId] });
      }
    } else {
      const newLog = { habit_id: habit.id, client_id: clientId, date: dateKey, completed: true, value: 1, notes };
      queryClient.setQueryData(["trophyHabitLogs", clientId], old => [...(old || []), { id: `tmp-${Date.now()}`, ...newLog }]);
      await base44.entities.HabitLog.create(newLog);
      const newStreak = (habit.streak || 0) + 1;
      await base44.entities.Habit.update(habit.id, { streak: newStreak });
      queryClient.invalidateQueries({ queryKey: ["trophyHabits", clientId] });
    }
    queryClient.invalidateQueries({ queryKey: ["trophyHabitLogs", clientId] });
    setCompletionHabit(null);
  };

  const handleAttemptToggle = (habit) => {
    if (readOnly) return;
    const existing = habitLogs.find(l => l.habit_id === habit.id && l.date === dateKey);
    if (existing && existing.completed) {
      executeToggleLog(habit, existing, null);
    } else {
      const name = habit.name.toLowerCase();
      const isSleep = name.includes("sleep");
      const isGym = name.includes("gym") || name.includes("workout");
      const isNutrition = name.includes("nutrition") || name.includes("meal");
      
      if (isSleep || isGym || isNutrition) {
        setCompletionHabit(habit);
        setCompletionData({ time: "", meals: [] });
      } else {
        executeToggleLog(habit, existing, null);
      }
    }
  };

  const handleAddHabit = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createHabit.mutate({
      name: newName.trim(),
      icon: newIcon,
      type: "custom",
      target_value: 1,
      unit: "times",
      frequency: "daily",
      client_id: clientId,
      trainer_id: trainerId,
      streak: 0,
      is_active: true,
    });
  };

  return (
    <div className="space-y-5">
      {/* Week strip */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "rgba(15,15,18,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <WeekStrip selectedDate={selectedDate} onSelect={setSelectedDate} />
      </div>

      {/* Medal progress */}
      {total > 0 && (
        <div
          className="rounded-2xl p-5 flex flex-col items-center"
          style={{ background: "rgba(15,15,18,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <MedalProgress progress={progress} trueCount={trueCount} total={total} />
        </div>
      )}

      {/* Habit grid */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "rgba(10,10,12,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {total === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tracking tasks assigned yet.</p>
            {!readOnly && <p className="text-xs mt-1">Add core tasks to track adherence scores.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 group">
            {habits.map(habit => {
              const log = habitLogs.find(l => l.habit_id === habit.id && l.date === dateKey);
              return (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  dateKey={dateKey}
                  isCompleted={completedIds.has(habit.id)}
                  logNotes={log?.notes}
                  onToggle={() => handleAttemptToggle(habit)}
                  onDelete={() => deleteHabit.mutate(habit.id)}
                  readOnly={readOnly}
                />
              );
            })}
            {!readOnly && habits.length < 6 && (
              <AddHabitCard onClick={() => setAddOpen(true)} />
            )}
          </div>
        )}

        {!readOnly && habits.length === 0 && (
          <div className="flex flex-col items-center gap-3 mt-4">
            <Button
              size="sm"
              onClick={async () => {
                const pillars = [
                  { name: "Sleep (8 Hours)", icon: "🛌" },
                  { name: "Nutrition Plan", icon: "🥗" },
                  { name: "Gym / Workout", icon: "🏋️" }
                ];
                for (const p of pillars) {
                  await createHabit.mutateAsync({
                    name: p.name,
                    icon: p.icon,
                    type: "custom",
                    target_value: 1,
                    unit: "times",
                    frequency: "daily",
                    client_id: clientId,
                    trainer_id: trainerId,
                    streak: 0,
                    is_active: true,
                  });
                }
              }}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-foreground border-none"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Core Pillars (Sleep, Nutrition, Gym)
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAddOpen(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              Or add a custom habit
            </Button>
          </div>
        )}
      </div>

      {/* Completion Modal */}
      <Dialog open={!!completionHabit} onOpenChange={(open) => !open && setCompletionHabit(null)}>
        <DialogContent className="max-w-sm" style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.1)" }}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Complete {completionHabit?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {(completionHabit?.name.toLowerCase().includes("sleep") || completionHabit?.name.toLowerCase().includes("gym") || completionHabit?.name.toLowerCase().includes("workout")) && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Enter Time (e.g. 2 hours, 45 mins)</label>
                <Input
                  value={completionData.time}
                  onChange={e => setCompletionData({ ...completionData, time: e.target.value })}
                  placeholder="Duration..."
                  className="bg-secondary border-border text-foreground"
                  autoFocus
                />
              </div>
            )}
            {(completionHabit?.name.toLowerCase().includes("nutrition") || completionHabit?.name.toLowerCase().includes("meal")) && (
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Meals Checked Off</label>
                <div className="flex flex-col gap-2">
                  {["Breakfast", "Lunch", "Dinner", "Snack"].map(meal => (
                    <label key={meal} className="flex items-center gap-2 text-sm text-foreground">
                      <input 
                        type="checkbox" 
                        className="rounded border-border bg-secondary text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                        checked={completionData.meals.includes(meal)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCompletionData({ ...completionData, meals: [...completionData.meals, meal] });
                          } else {
                            setCompletionData({ ...completionData, meals: completionData.meals.filter(m => m !== meal) });
                          }
                        }}
                      />
                      {meal}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-foreground border-none mt-2"
              onClick={() => {
                const existing = habitLogs.find(l => l.habit_id === completionHabit.id && l.date === dateKey);
                executeToggleLog(completionHabit, existing, completionData);
              }}
            >
              Save & Complete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add habit dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm" style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.1)" }}>
          <DialogHeader>
            <DialogTitle className="text-foreground">New Habit</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddHabit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Habit Name</label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Drink water"
                className="bg-secondary border-border text-foreground placeholder:text-gray-600"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Pick an Icon</label>
              <div className="grid grid-cols-8 gap-1.5">
                {ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewIcon(icon)}
                    className={`text-xl w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                      newIcon === icon ? "bg-white/20 ring-2 ring-white/50 scale-110" : "bg-secondary hover:bg-accent"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
              <span className="text-3xl">{newIcon}</span>
              <span className="text-foreground font-medium">{newName || "Habit name"}</span>
            </div>
            <Button type="submit" className="w-full" disabled={createHabit.isPending}>
              {createHabit.isPending ? "Adding..." : "Add Habit"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}