import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Dumbbell, Apple, CalendarDays, PartyPopper } from "lucide-react";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

export default function PlanCalendar({ workoutPlans = [], mealPlans = [], sessions = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getHolidaysForDate = (date) => {
    const d = date.getDate();
    const m = date.getMonth(); // 0-indexed
    const y = date.getFullYear();
    const holidays = [];
    if (m === 0 && d === 1) holidays.push({ name: "New Year's Day" });
    if (m === 1 && d === 14) holidays.push({ name: "Valentine's Day" });
    if (m === 6 && d === 4) holidays.push({ name: "Independence Day" });
    if (m === 9 && d === 31) holidays.push({ name: "Halloween" });
    if (m === 11 && d === 25) holidays.push({ name: "Christmas Day" });
    if (m === 11 && d === 31) holidays.push({ name: "New Year's Eve" });
    
    // Thanksgiving (4th Thursday of Nov)
    if (m === 10) {
      const firstDay = new Date(y, 10, 1).getDay();
      const offset = firstDay <= 4 ? 4 - firstDay : 11 - firstDay;
      const thanksgivingDate = 1 + offset + 21;
      if (d === thanksgivingDate) holidays.push({ name: "Thanksgiving" });
    }
    return holidays;
  };

  // Group plans by date
  const safeDateParse = (d) => {
    if (!d) return new Date();
    let str = d;
    if (typeof str === 'string') {
      str = str.replace(' ', 'T');
      if (!str.endsWith('Z') && !str.includes('+') && str.length > 10) {
        str += 'Z';
      }
    }
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  // Group plans by date
  const getPlansForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");

    const workouts = (workoutPlans || []).filter(p => {
      if (p.workout_dates) {
        return Object.values(p.workout_dates).includes(dateStr);
      }
      if (!p.exercises || !Array.isArray(p.exercises)) return false;
      
      const startDate = p.created_date ? safeDateParse(p.created_date) : new Date();
      startDate.setHours(0, 0, 0, 0);
      
      const diffTime = date.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // day 1 is start date
      
      return p.exercises.some(e => e.day === diffDays);
    });

    const meals = (mealPlans || []).filter(p => {
      if (p.meal_dates) {
        return Object.values(p.meal_dates).includes(dateStr);
      }
      if (!p.meals || !Array.isArray(p.meals)) return false;
      
      const startDate = p.created_date ? safeDateParse(p.created_date) : new Date();
      startDate.setHours(0, 0, 0, 0);
      
      const diffTime = date.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      return p.meals.some(m => m.day === diffDays);
    });

    const daySessions = (sessions || []).filter(s => s.date === dateStr);
    const holidays = getHolidaysForDate(date);

    return { workouts, meals, daySessions, holidays };
  };

  const { workouts: selectedWorkouts, meals: selectedMeals, daySessions: selectedSessions, holidays: selectedHolidays } = selectedDate
    ? getPlansForDate(selectedDate)
    : { workouts: [], meals: [], daySessions: [], holidays: [] };

  // Padding days from previous month
  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null).map((_, i) => {
    const date = new Date(monthStart);
    date.setDate(date.getDate() - (firstDayOfWeek - i));
    return date;
  });

  const allDays = [...paddingDays, ...daysInMonth];

  return (
    <div className="space-y-4">
      {/* Calendar Grid */}
      <div className="rounded-xl overflow-hidden border border-border bg-card">
        <div className="p-4 flex flex-row items-center justify-between border-b border-border">
          <h3 className="font-bold text-lg text-foreground">{format(currentDate, "MMMM yyyy")}</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="text-muted-foreground hover:text-foreground hover:bg-accent">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="text-muted-foreground hover:text-foreground hover:bg-accent">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {allDays.map((date, idx) => {
                const isCurrentMonth = isSameMonth(date, currentDate);
                const isSelected = selectedDate && format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                const { workouts, meals, daySessions, holidays } = getPlansForDate(date);
                const hasPlans = workouts.length > 0 || meals.length > 0 || daySessions.length > 0 || holidays.length > 0;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "aspect-square p-1.5 rounded-lg border transition-all flex flex-col items-center justify-start relative overflow-hidden",
                      isCurrentMonth ? "cursor-pointer hover:bg-accent" : "opacity-30",
                      isSelected ? "bg-purple-500/20 border-purple-500/50" : "border-border bg-secondary",
                    )}
                  >
                    <span className={cn("text-sm font-semibold z-10 mb-1", isSelected ? "text-purple-300" : "text-muted-foreground", isCurrentMonth && !isSelected && "text-foreground")}>
                      {format(date, "d")}
                    </span>
                    {hasPlans && (
                      <div className="flex gap-1 flex-wrap justify-center mt-auto w-full z-10">
                        {workouts.length > 0 && <div className="w-2 h-2 rounded-full bg-green-500" title="Workout" />}
                        {meals.length > 0 && <div className="w-2 h-2 rounded-full bg-yellow-500" title="Meal Plan" />}
                        {daySessions.length > 0 && <div className="w-2 h-2 rounded-full bg-purple-500" title="Session" />}
                        {holidays.length > 0 && <div className="w-2 h-2 rounded-full bg-red-500" title="Holiday" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Workouts */}
          <div className="rounded-xl overflow-hidden border border-border bg-card p-4">
            <h3 className="font-bold text-foreground flex items-center gap-2 mb-4 border-b border-border pb-3">
              <Dumbbell className="w-4 h-4 text-green-400" />
              Workouts - {format(selectedDate, "MMM d")}
            </h3>
            {selectedWorkouts.length > 0 ? (
              <div className="space-y-3">
                {selectedWorkouts.map(plan => (
                  <div key={plan.id} className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
                    <h4 className="font-bold text-sm text-green-300">{plan.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{plan.difficulty} • {plan.duration_weeks}w</p>
                    <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                      {plan.exercises?.filter(e => {
                        const startDate = plan.created_date ? safeDateParse(plan.created_date) : new Date();
                        startDate.setHours(0, 0, 0, 0);
                        const diffTime = selectedDate.getTime() - startDate.getTime();
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        return e.day === diffDays;
                      }).map((ex, i) => (
                        <div key={i} className="text-xs bg-card p-2 rounded border border-border">
                          <p className="font-semibold text-foreground">{ex.name}</p>
                          <p className="text-muted-foreground mt-0.5">{ex.sets} × {ex.reps} • {ex.rest_seconds}s rest</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-4">No workouts planned</p>
            )}
          </div>

          {/* Meals */}
          <div className="rounded-xl overflow-hidden border border-border bg-card p-4">
            <h3 className="font-bold text-foreground flex items-center gap-2 mb-4 border-b border-border pb-3">
              <Apple className="w-4 h-4 text-yellow-500" />
              Meals - {format(selectedDate, "MMM d")}
            </h3>
            {selectedMeals.length > 0 ? (
              <div className="space-y-3">
                {selectedMeals.map(plan => (
                  <div key={plan.id} className="p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
                    <h4 className="font-bold text-sm text-yellow-300">{plan.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{plan.calories_target} cal target</p>
                    <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                      {plan.meals?.filter(m => {
                        const startDate = plan.created_date ? safeDateParse(plan.created_date) : new Date();
                        startDate.setHours(0, 0, 0, 0);
                        const diffTime = selectedDate.getTime() - startDate.getTime();
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        return m.day === diffDays;
                      }).map((meal, i) => (
                        <div key={i} className="text-xs bg-card p-2 rounded border border-border">
                          <p className="font-semibold capitalize text-foreground">{meal.meal_type}: {meal.name}</p>
                          <p className="text-muted-foreground mt-0.5">{meal.foods?.length || 0} items</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-4">No meals planned</p>
            )}
          </div>

          {/* Sessions & Holidays */}
          <div className="rounded-xl overflow-hidden border border-border bg-card p-4 md:col-span-2">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-bold text-foreground flex items-center gap-2 mb-4 border-b border-border pb-3">
                  <CalendarDays className="w-4 h-4 text-purple-400" />
                  Sessions
                </h3>
                {selectedSessions.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSessions.map(session => (
                      <div key={session.id} className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/5 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-sm text-purple-300 capitalize">{session.type?.replace('_', ' ')}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{session.notes || "No notes"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{session.start_time}</p>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{session.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center py-4">No sessions scheduled</p>
                )}
              </div>

              <div>
                <h3 className="font-bold text-foreground flex items-center gap-2 mb-4 border-b border-border pb-3">
                  <PartyPopper className="w-4 h-4 text-red-400" />
                  Holidays
                </h3>
                {selectedHolidays.length > 0 ? (
                  <div className="space-y-2">
                    {selectedHolidays.map((holiday, i) => (
                      <div key={i} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                        <p className="font-semibold text-sm text-red-300">{holiday.name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center py-4">No holidays</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}