import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Droplets, Moon, Footprints, Activity, Pill, Brain, Move, Check, X } from "lucide-react";
import { toast } from "sonner";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useMediaQuery } from "@/components/hooks/use-media-query";

const HABIT_ICONS = {
  water_intake: Droplets,
  sleep_hours: Moon,
  steps: Footprints,
  cardio_minutes: Activity,
  supplements: Pill,
  meditation: Brain,
  stretching: Move,
  custom: Check
};

export default function HabitTracker({ clientId, trainerId, readOnly = false }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "custom",
    target_value: "",
    unit: "",
    frequency: "daily"
  });

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const queryClient = useQueryClient();

  const { data: habits = [] } = useQuery({
    queryKey: ['habits', clientId],
    queryFn: () => base44.entities.Habit.filter({ client_id: clientId }),
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habitLogs', clientId],
    queryFn: () => base44.entities.HabitLog.filter({ client_id: clientId }),
  });

  const createHabitMutation = useMutation({
    mutationFn: (data) => base44.entities.Habit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setDialogOpen(false);
      resetForm();
      toast.success("Habit assigned");
    },
  });

  const deleteHabitMutation = useMutation({
    mutationFn: (id) => base44.entities.Habit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      toast.success("Habit removed");
    },
  });

  const logHabitMutation = useMutation({
    mutationFn: (data) => base44.entities.HabitLog.create(data),
    onMutate: async (newLog) => {
      await queryClient.cancelQueries({ queryKey: ['habitLogs', clientId] });
      const previousLogs = queryClient.getQueryData(['habitLogs', clientId]);
      queryClient.setQueryData(['habitLogs', clientId], (old) => {
        return [...(old || []), { id: `temp-${Date.now()}`, ...newLog }];
      });
      return { previousLogs };
    },
    onError: (err, newLog, context) => {
      queryClient.setQueryData(['habitLogs', clientId], context.previousLogs);
      toast.error("Failed to log habit");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['habitLogs'] });
      queryClient.invalidateQueries({ queryKey: ['habitLogs', clientId] });
    },
  });

  const toggleHabitToday = (habit) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existingLog = habitLogs.find(l => l.habit_id === habit.id && l.date === todayStr);
    
    if (existingLog) {
      queryClient.setQueryData(['habitLogs', clientId], (old) => 
        (old || []).map(l => l.id === existingLog.id ? { ...l, completed: !existingLog.completed } : l)
      );
      base44.entities.HabitLog.update(existingLog.id, { completed: !existingLog.completed })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['habitLogs'] });
          queryClient.invalidateQueries({ queryKey: ['habitLogs', clientId] });
        })
        .catch(() => {
          queryClient.invalidateQueries({ queryKey: ['habitLogs'] });
          queryClient.invalidateQueries({ queryKey: ['habitLogs', clientId] });
          toast.error("Failed to update habit");
        });
    } else {
      logHabitMutation.mutate({
        habit_id: habit.id,
        client_id: clientId,
        date: todayStr,
        completed: true,
        value: habit.target_value
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "custom",
      target_value: "",
      unit: "",
      frequency: "daily"
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createHabitMutation.mutate({
      ...formData,
      client_id: clientId,
      trainer_id: trainerId,
      target_value: parseFloat(formData.target_value),
      is_active: true
    });
  };

  const getHabitCompliance = (habit) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => 
      format(subDays(new Date(), i), 'yyyy-MM-dd')
    );
    
    const logsForHabit = habitLogs.filter(log => 
      log.habit_id === habit.id && last7Days.includes(log.date)
    );
    
    const completedDays = logsForHabit.filter(log => log.completed).length;
    return (completedDays / 7) * 100;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">Adherence Tracker</h3>
        {!readOnly && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600">
              <Plus className="w-4 h-4 mr-2" />
              Assign Habit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign New Habit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Habit Type</Label>
                {isDesktop ? (
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="water_intake">Water Intake</SelectItem>
                      <SelectItem value="sleep_hours">Sleep Hours</SelectItem>
                      <SelectItem value="steps">Daily Steps</SelectItem>
                      <SelectItem value="cardio_minutes">Cardio Minutes</SelectItem>
                      <SelectItem value="supplements">Supplements</SelectItem>
                      <SelectItem value="meditation">Meditation</SelectItem>
                      <SelectItem value="stretching">Stretching</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Drawer>
                    <DrawerTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal text-left">
                        {formData.type ? formData.type.replace('_', ' ') : "Select type"}
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent>
                      <div className="p-4 space-y-2">
                        <DrawerHeader>
                          <DrawerTitle>Select Habit Type</DrawerTitle>
                        </DrawerHeader>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { val: "water_intake", label: "Water Intake" },
                            { val: "sleep_hours", label: "Sleep Hours" },
                            { val: "steps", label: "Daily Steps" },
                            { val: "cardio_minutes", label: "Cardio Minutes" },
                            { val: "supplements", label: "Supplements" },
                            { val: "meditation", label: "Meditation" },
                            { val: "stretching", label: "Stretching" },
                            { val: "custom", label: "Custom" },
                          ].map((opt) => (
                            <Button 
                              key={opt.val}
                              variant={formData.type === opt.val ? "default" : "outline"}
                              className={formData.type === opt.val ? "bg-emerald-600" : ""}
                              onClick={() => setFormData({ ...formData, type: opt.val })}
                            >
                              {opt.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </DrawerContent>
                  </Drawer>
                )}
              </div>

              <div>
                <Label>Habit Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Drink 8 glasses of water"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Target Value</Label>
                  <Input
                    type="number"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    placeholder="e.g., 8"
                    required
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g., glasses, hours"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={createHabitMutation.isPending}>
                Assign Habit
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {habits.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-8 text-center text-muted-foreground">
            No habits assigned yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {habits.map(habit => {
            const Icon = HABIT_ICONS[habit.type] || Check;
            const compliance = getHabitCompliance(habit);

            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const isCompletedToday = habitLogs.some(l => l.habit_id === habit.id && l.date === todayStr && l.completed);

            return (
              <Card key={habit.id} className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{habit.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Target: {habit.target_value} {habit.unit} {habit.frequency}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {readOnly ? (
                        <Button
                          variant={isCompletedToday ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleHabitToday(habit)}
                          className={isCompletedToday ? "bg-emerald-600 hover:bg-emerald-700 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}
                        >
                          {isCompletedToday ? <Check className="w-4 h-4 mr-1" /> : null}
                          {isCompletedToday ? "Done" : "Complete"}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          {isCompletedToday && (
                            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded font-medium max-w-[200px] truncate" title={(() => {
                                const log = habitLogs.find(l => l.habit_id === habit.id && l.date === format(new Date(), 'yyyy-MM-dd'));
                                return log?.notes ? log.notes : 'Completed';
                              })()}>
                              ✓ Done
                              {(() => {
                                const log = habitLogs.find(l => l.habit_id === habit.id && l.date === format(new Date(), 'yyyy-MM-dd'));
                                return log?.notes ? ` - ${log.notes}` : '';
                              })()}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteHabitMutation.mutate(habit.id)}
                            className="text-muted-foreground hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Adherence Score</span>
                      <span className="font-medium text-foreground">
                        {compliance.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={compliance} className="h-2 bg-secondary" indicatorClassName="bg-emerald-500" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}