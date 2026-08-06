import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dumbbell,
  Play,
  CheckCircle2,
  Calendar,
  TrendingUp,
  ChevronRight,
  Clock,
  Award,
  Target,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2
} from "lucide-react";
import ExerciseProgressChart from "@/components/workouts/ExerciseProgressChart";
import WorkoutRoutineCard from "@/components/workouts/WorkoutRoutineCard";
import VolumeChart from "@/components/analytics/VolumeChart";
import WorkoutForm from "@/components/workouts/WorkoutForm";
import { format } from "date-fns";
import FormCheckAnalyzer from "@/components/workouts/FormCheckAnalyzer";
import WorkoutMusicPlayer from "@/components/workouts/WorkoutMusicPlayer";
import LiveWorkoutMode from "@/components/workouts/LiveWorkoutMode";

function FitnessProgramCard({ program }) {
  const [openDay, setOpenDay] = useState(null);
  const sections = ["warmup", "strength", "cardio", "cooldown"];
  const sectionLabels = { warmup: "Warm-up", strength: "Strength", cardio: "Cardio", cooldown: "Cool-down" };

  const allExercises = sections.flatMap(s => (program[s] || []).filter(e => e.name));

  return (
    <Card className="hover:border-primary/40 transition-all bg-card border-border rounded-3xl">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl text-foreground truncate">{program.client_name}'s Training Program</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {program.trainer_name && `Trainer: ${program.trainer_name}`}
                {program.start_date && ` · Start: ${program.start_date}`}
              </p>
            </div>
          </div>
          <Badge className="bg-purple-100 text-purple-700 shrink-0 w-fit">{allExercises.length} exercises</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Client info summary */}
        {program.client_info && (program.client_info.weight_lbs || program.client_info.bmi) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {program.client_info.weight_lbs && (
              <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="font-bold text-foreground">{program.client_info.weight_lbs} lbs</div>
                <div className="text-xs text-muted-foreground">Weight</div>
              </div>
            )}
            {program.client_info.bmi && (
              <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="font-bold text-foreground">{program.client_info.bmi}</div>
                <div className="text-xs text-muted-foreground">BMI</div>
              </div>
            )}
            {program.client_info.body_fat && (
              <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="font-bold text-foreground">{program.client_info.body_fat}%</div>
                <div className="text-xs text-muted-foreground">Body Fat</div>
              </div>
            )}
            {program.client_info.suggestions && (
              <div className="col-span-2 sm:col-span-1 rounded-lg p-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div className="text-xs text-green-400 font-medium">Notes</div>
                <div className="text-xs text-green-300 mt-1">{program.client_info.suggestions}</div>
              </div>
            )}
          </div>
        )}

        {/* Exercise sections */}
        {sections.map(section => {
          const exercises = (program[section] || []).filter(e => e.name);
          if (!exercises.length) return null;
          return (
            <div key={section} className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                className="w-full flex items-center justify-between px-4 py-3 transition-colors text-left"
                style={{ background: 'rgba(255,255,255,0.04)' }}
                onClick={() => setOpenDay(openDay === section ? null : section)}
              >
                <span className="font-semibold text-foreground">{sectionLabels[section]}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs text-muted-foreground border-border">{exercises.length} exercises</Badge>
                  {openDay === section ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>
              {openDay === section && (
                <div className="divide-y divide-white/5">
                  {exercises.map((ex, i) => (
                    <div key={i} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="font-medium text-foreground text-sm">{ex.name}</span>
                      <div className="flex flex-wrap gap-2 sm:gap-3 text-xs text-muted-foreground">
                        {ex.reps && <span className="bg-secondary px-2 py-0.5 rounded">{ex.reps} reps</span>}
                        {ex.weight_lbs && <span className="bg-secondary px-2 py-0.5 rounded">{ex.weight_lbs} lbs</span>}
                        {ex.weeks && <span className="bg-secondary px-2 py-0.5 rounded">{ex.weeks} wks</span>}
                        {ex.frequency && <span className="bg-secondary px-2 py-0.5 rounded">{ex.frequency}×/wk</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Weekly tracking summary */}
        {program.weekly_tracking?.length > 0 && (
          <div className="text-sm text-muted-foreground pt-2 border-t border-border">
            📊 {program.weekly_tracking.length} week{program.weekly_tracking.length !== 1 ? "s" : ""} of tracking data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClientWorkouts() {
  const [user, setUser] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [workoutSession, setWorkoutSession] = useState(null);
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [calendarSynced, setCalendarSynced] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      
      let profile = null;
      const byEmail = await base44.entities.Client.filter({ email: userData.email });
      if (byEmail.length > 0) {
        profile = byEmail[0];
      } else {
        const byUserId = await base44.entities.Client.filter({ user_id: userData.id });
        if (byUserId.length > 0) profile = byUserId[0];
      }
      if (profile) setClientProfile(profile);
    };
    loadUser();
  }, []);

  const { data: workoutPlans = [] } = useQuery({
    queryKey: ["clientWorkouts-all", user?.id, clientProfile?.id],
    queryFn: async () => {
      const ids = [user.id];
      if (clientProfile?.id && !ids.includes(clientProfile.id)) ids.push(clientProfile.id);
      if (clientProfile?.user_id && !ids.includes(clientProfile.user_id)) ids.push(clientProfile.user_id);
      const results = await Promise.allSettled(ids.map(id => base44.entities.WorkoutPlan.filter({ client_id: id }, "-created_date", 100)));
      const combined = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
      return combined.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
    },
    enabled: !!user,
    placeholderData: (prev) => prev,
  });

  const { data: fitnessPrograms = [] } = useQuery({
    queryKey: ["clientFitnessPrograms-all", clientProfile?.id, user?.id],
    queryFn: async () => {
      const promises = [];
      if (clientProfile) promises.push(base44.entities.FitnessProgram.filter({ client_id: clientProfile.id }, "-created_date", 100));
      promises.push(base44.entities.FitnessProgram.filter({ client_id: user.id }, "-created_date", 100));
      promises.push(base44.entities.FitnessProgram.filter({ client_user_id: user.id }, "-created_date", 100));
      
      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      if (fulfilled.length === 0 && promises.length > 0) throw new Error("Fetch failed");
      
      const combined = fulfilled.flatMap(r => r.value);
      return combined.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
    },
    enabled: !!user,
    placeholderData: (prev) => prev,
  });

  const createWorkoutMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkoutPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientWorkouts-all"] });
    },
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkoutPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientWorkouts-all"] });
      toast.success("Workout plan deleted");
    },
  });

  const { data: workoutLogs = [] } = useQuery({
    queryKey: ["workoutLogs", clientProfile?.id],
    queryFn: () => base44.entities.WorkoutLog.filter({ client_id: clientProfile.id }, "-date"),
    enabled: !!clientProfile,
  });

  const logWorkoutMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkoutLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workoutLogs"] });
      setWorkoutSession(null);
      setSelectedWorkout(null);
    },
  });

  const handleStartWorkout = (workout) => {
    setSelectedWorkout(workout);
    setWorkoutSession({
      workout_plan_id: workout.id,
      client_id: clientProfile.id,
      date: new Date().toLocaleDateString('sv-SE'),
      exercises: workout.exercises?.map(ex => ({
        name: ex.name,
        target_sets: ex.sets || 3,
        target_reps: ex.reps || "10",
        target_rir: ex.target_rir,
        sets_completed: 0,
        reps_completed: Array(ex.sets || 3).fill(""),
        weight_used: Array(ex.sets || 3).fill(""),
        rir_completed: Array(ex.sets || 3).fill(""),
        completed: false,
        notes: ''
      })) || [],
      duration_minutes: 0,
      difficulty_rating: 5,
      energy_level: 5,
      notes: ''
    });
  };

  const handleCompleteWorkout = () => {
    let total_volume_load = 0;
    const processedExercises = workoutSession.exercises.map(ex => {
      let exerciseVolume = 0;
      const cleanReps = ex.reps_completed.map(r => parseInt(r) || 0);
      const cleanWeight = ex.weight_used.map(w => parseFloat(w) || 0);
      const cleanRir = ex.rir_completed.map(r => parseInt(r) || 0);
      
      cleanReps.forEach((reps, i) => {
        const weight = cleanWeight[i] || 0;
        exerciseVolume += (reps * weight);
      });
      
      total_volume_load += exerciseVolume;
      
      return {
        ...ex,
        sets_completed: ex.completed ? ex.target_sets : 0,
        reps_completed: cleanReps,
        weight_used: cleanWeight,
        rir_completed: cleanRir,
        volume_load: exerciseVolume
      };
    });

    logWorkoutMutation.mutate({
      ...workoutSession,
      exercises: processedExercises,
      total_volume_load,
      trainer_id: selectedWorkout.trainer_id
    });
  };

  const syncToCalendar = async (workout) => {
    setSyncingCalendar(true);
    try {
      const response = await base44.functions.invoke('syncWorkoutToCalendar', {
        workoutPlan: workout,
        clientEmail: user.email,
        scheduledDate: new Date().toLocaleDateString('sv-SE'),
        startTime: '09:00'
      });

      if (response.data?.success) {
        setCalendarSynced(prev => ({
          ...prev,
          [workout.id]: true
        }));
      }
    } catch (error) {
      console.error('Error syncing to calendar:', error);
    } finally {
      setSyncingCalendar(false);
    }
  };

  const today = new Date().getDate();
  const activeWorkouts = workoutPlans.filter(w => w.status === 'active');
  // Show all active workouts (not filtered by today's day) so client always sees their plans
  const todayWorkouts = activeWorkouts.length > 0 ? activeWorkouts : workoutPlans.filter(w => w.status !== 'archived');
  const completedWorkouts = workoutPlans.filter(w => w.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Workouts</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Track and complete your training plans</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Sessions</p>
            <p className="text-xl font-bold text-emerald-400">{workoutLogs.length}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {clientProfile && (
            <Button onClick={() => setShowWorkoutForm(true)} className="flex-1 min-w-[140px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> {clientProfile.trainer_id ? "Add Your Own" : "Create Plan"}
            </Button>
          )}
          <Link to={createPageUrl("ClientRecovery")} className="flex-1 min-w-[140px] text-center px-3 py-2 bg-secondary hover:bg-accent border border-border rounded-lg text-sm text-foreground flex items-center justify-center">Recovery</Link>
        </div>
        {clientProfile?.trainer_id && (
          <p className="text-xs text-muted-foreground mt-1">
            Your trainer assigns your plans. Use <span className="font-medium text-foreground">Add Your Own</span> to log any extra training you do — your trainer will see it too.
          </p>
        )}
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto justify-start">
          <TabsTrigger value="active">Active Plans</TabsTrigger>
          <TabsTrigger value="progress">Progress Analytics</TabsTrigger>
          <TabsTrigger value="history">Workout History</TabsTrigger>
          <TabsTrigger value="completed">Completed Plans</TabsTrigger>
          <TabsTrigger value="form-check">AI Form Check</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {todayWorkouts.length > 0 || fitnessPrograms.length > 0 ? (
            <div className="grid gap-4">

              {fitnessPrograms.map((prog) => (
                <FitnessProgramCard key={prog.id} program={prog} />
              ))}
              {todayWorkouts.map((workout) => {
                const exercisesByDay = {};
                (workout.exercises || []).forEach(ex => {
                  const d = ex.day || 1;
                  if (!exercisesByDay[d]) exercisesByDay[d] = [];
                  exercisesByDay[d].push(ex);
                });
                const days = Object.keys(exercisesByDay).map(Number).sort((a, b) => a - b);
                return (
                <Card key={workout.id} className="hover:border-primary/40 transition-all bg-card border border-border rounded-3xl">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Dumbbell className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl text-foreground">{workout.name}</CardTitle>
                          {workout.description && (
                            <p className="text-sm text-muted-foreground mt-1">{workout.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {clientProfile?.trainer_id && (
                          workout.self_added ? (
                            <Badge className="bg-sky-500/10 text-sky-600 border border-sky-500/20">Added by you</Badge>
                          ) : (
                            <Badge className="bg-primary/10 text-primary border border-primary/20">From your trainer</Badge>
                          )
                        )}
                        <Badge className="bg-green-500/10 text-green-600 border border-green-500/20">Active</Badge>
                        {clientProfile && !clientProfile.trainer_id && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => { e.stopPropagation(); deleteWorkoutMutation.mutate(workout.id); }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 bg-secondary p-4 rounded-xl border border-border gap-4">
                      <div className="flex flex-wrap gap-4 sm:gap-6 text-sm w-full md:w-auto">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4 text-yellow-500" />
                          <span className="text-foreground">{workout.duration_weeks} weeks</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <TrendingUp className="h-4 w-4 text-yellow-500" />
                          <span className="text-foreground">{workout.days_per_week} days/week</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Dumbbell className="h-4 w-4 text-yellow-500" />
                          <span className="text-foreground">{workout.exercises?.length || 0} exercises</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <Button 
                          onClick={() => handleStartWorkout(workout)}
                          className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl"
                        >
                          <Play className="h-4 w-4 mr-2 flex-shrink-0" fill="currentColor" />
                          <span className="whitespace-nowrap">Start Workout</span>
                        </Button>
                        <Button
                          onClick={() => syncToCalendar(workout)}
                          variant="outline"
                          disabled={syncingCalendar || calendarSynced[workout.id]}
                          className="px-3 border-border bg-secondary hover:bg-accent text-foreground flex-shrink-0"
                        >
                          {calendarSynced[workout.id] ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : syncingCalendar ? (
                            <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-green-500 rounded-full" />
                          ) : (
                            <Calendar className="h-4 w-4 text-muted-foreground group-hover:text-green-400 transition-colors" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {days.length > 0 && (
                      <div className="space-y-3 mt-6">
                        <div className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-green-500 rounded-full"></div>
                          Exercise Routine
                        </div>
                        <div className="grid gap-3">
                          {days.map(day => (
                            <WorkoutRoutineCard
                              key={day}
                              day={day}
                              exercises={exercisesByDay[day]}
                              onComplete={(data) => handleStartWorkout(workout)}
                              clientId={clientProfile?.id}
                              trainerId={workout.trainer_id}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
              })}
            </div>
          ) : (
            <Card className="bg-card border border-border rounded-3xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                  <Dumbbell className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No active workout plans</h3>
                <p className="text-muted-foreground mt-2">
                  {clientProfile && !clientProfile.trainer_id 
                    ? "Head to the AI Assistant to generate a personalized workout plan!" 
                    : "Your trainer will assign workout plans to you"}
                </p>
                {clientProfile && !clientProfile.trainer_id && (
                  <Link to={createPageUrl("ClientJournal")} className="mt-4">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl">
                      Ask AI Assistant
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">

          {workoutLogs.length > 0 ? (
            <div className="space-y-6">
              <div className="bg-card border border-border p-4 sm:p-6 rounded-3xl overflow-x-auto">
                <h3 className="text-xl font-bold text-foreground mb-6 whitespace-nowrap">Volume & Intensity Trends</h3>
                <div className="min-w-[500px]">
                  <VolumeChart logs={workoutLogs} />
                </div>
              </div>

              {/* Extract unique exercises */}
              {Array.from(
                new Set(
                  workoutLogs
                    .flatMap(log => log.exercises?.map(ex => ex.name) || [])
                )
              ).map((exerciseName) => (
                <div key={exerciseName}>
                  <h3 className="text-lg font-semibold text-foreground mb-4">{exerciseName}</h3>
                  <div className="bg-card border border-border p-4 rounded-3xl overflow-x-auto">
                    <div className="min-w-[400px]">
                      <ExerciseProgressChart
                        exerciseName={exerciseName}
                        logs={workoutLogs}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="bg-card border border-border rounded-3xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                  <TrendingUp className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No progress data yet</h3>
                <p className="text-muted-foreground mt-2">Complete workouts to see your progress analytics</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {workoutLogs.length > 0 ? (
            <div className="space-y-3">
              {workoutLogs.map((log) => (
                <Card key={log.id} className="bg-card border border-border rounded-3xl">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base text-foreground">
                            {format(new Date(log.date), 'EEEE, MMMM d, yyyy')}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {log.duration_minutes} minutes • {log.exercises?.length || 0} exercises
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                          Difficulty: {log.difficulty_rating}/10
                        </Badge>
                        <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                          Energy: {log.energy_level}/10
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  {log.notes && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{log.notes}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card border border-border rounded-3xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                  <Calendar className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No workout history</h3>
                <p className="text-muted-foreground mt-2">Start a workout to see it here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="form-check" className="space-y-4">
          <FormCheckAnalyzer clientId={clientProfile?.id} trainerId={clientProfile?.trainer_id} />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedWorkouts.length > 0 ? (
            <div className="grid gap-4">
              {completedWorkouts.map((workout) => (
                <Card key={workout.id} className="bg-card border border-border rounded-3xl">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Award className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-foreground">{workout.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">Completed program</p>
                        </div>
                      </div>
                      {clientProfile && !clientProfile.trainer_id && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => { e.stopPropagation(); deleteWorkoutMutation.mutate(workout.id); }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card border border-border rounded-3xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                  <Award className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No completed plans</h3>
                <p className="text-muted-foreground mt-2">Finish a workout plan to see it here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

      </Tabs>

      {/* Workout Form — solo users create their own plans; coached clients add extra
          training on top of what their trainer assigns (synced to the trainer). */}
      {clientProfile && (
        <WorkoutForm
          open={showWorkoutForm}
          onOpenChange={setShowWorkoutForm}
          clients={[clientProfile]}
          simpleMode={true}
          onSubmit={(data) =>
            createWorkoutMutation.mutate({
              ...data,
              client_id: clientProfile.id,
              trainer_id: clientProfile.trainer_id || null,
              self_added: !!clientProfile.trainer_id,
            })
          }
        />
      )}

      {/* Workout Session Dialog (Live Mode) */}
      <Dialog open={!!workoutSession} onOpenChange={() => setWorkoutSession(null)}>
        <DialogContent className="max-w-2xl max-h-[95vh] h-[90vh] overflow-y-auto bg-card text-foreground border-border p-4 sm:p-8 flex flex-col">
          {workoutSession && (
            <LiveWorkoutMode 
              workoutSession={workoutSession} 
              setWorkoutSession={setWorkoutSession} 
              onComplete={handleCompleteWorkout} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}