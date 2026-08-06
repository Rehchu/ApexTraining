import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Dumbbell, Apple, MoreVertical, Edit, Trash2, Users, Calendar, MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import FitnessProgramForm from "@/components/fitness/FitnessProgramForm";
import CalorieLogForm from "@/components/fitness/CalorieLogForm";

function TrainerNoteField({ log, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(log.trainer_notes || "");
  if (!isEditing) {
    return (
      <div className="mt-4 p-3 bg-secondary rounded-lg border border-border cursor-pointer hover:bg-accent transition-colors" onClick={() => setIsEditing(true)}>
        <p className="text-xs font-semibold text-muted-foreground mb-1">Trainer Notes</p>
        <p className="text-sm text-muted-foreground">{log.trainer_notes || "Click to add notes..."}</p>
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-2">
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes..." className="bg-secondary text-sm border-border text-foreground" />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
        <Button size="sm" onClick={() => { onSave(notes); setIsEditing(false); }}>Save</Button>
      </div>
    </div>
  );
}

export default function FitnessTools() {
  const [user, setUser] = useState(null);
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [showCalorieForm, setShowCalorieForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [editingLog, setEditingLog] = useState(null);
  const [deletingProgram, setDeletingProgram] = useState(null);
  const [deletingLog, setDeletingLog] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {base44.auth.me().then(setUser);}, []);

  const { data: programs = [] } = useQuery({
    queryKey: ["fitnessPrograms", user?.id],
    queryFn: () => base44.entities.FitnessProgram.filter({ trainer_id: user.id }, "-created_date"),
    enabled: !!user
  });

  const { data: calorieLogs = [] } = useQuery({
    queryKey: ["calorieLogs", user?.id],
    queryFn: () => base44.entities.CalorieLog.filter({ trainer_id: user.id }, "-created_date"),
    enabled: !!user
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });

  const createProgram = useMutation({
    mutationFn: async (data) => {
      // If a client is selected, also store their user_id for client-side lookup
      let clientUserId = data.client_id;
      if (data.client_id) {
        const client = clients.find((c) => c.id === data.client_id);
        if (client?.user_id) clientUserId = client.user_id;
      }
      return base44.entities.FitnessProgram.create({ ...data, trainer_id: user.id, client_user_id: clientUserId });
    },
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ["fitnessPrograms"] });setShowProgramForm(false);setEditingProgram(null);}
  });

  const updateProgram = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FitnessProgram.update(id, { ...data, trainer_id: user.id }),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ["fitnessPrograms"] });setShowProgramForm(false);setEditingProgram(null);}
  });

  const deleteProgram = useMutation({
    mutationFn: (id) => base44.entities.FitnessProgram.delete(id),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ["fitnessPrograms"] });setDeletingProgram(null);}
  });

  const createLog = useMutation({
    mutationFn: (data) => base44.entities.CalorieLog.create({ ...data, trainer_id: user.id }),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ["calorieLogs"] });setShowCalorieForm(false);setEditingLog(null);}
  });

  const updateLog = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalorieLog.update(id, { ...data, trainer_id: user.id }),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ["calorieLogs"] });setShowCalorieForm(false);setEditingLog(null);}
  });

  const deleteLog = useMutation({
    mutationFn: (id) => base44.entities.CalorieLog.delete(id),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ["calorieLogs"] });setDeletingLog(null);}
  });

  const handleSubmitProgram = async (data) => {
    if (editingProgram?.id) {
      await updateProgram.mutateAsync({ id: editingProgram.id, data });
    } else {
      await createProgram.mutateAsync(data);
    }
    
    // Sync to client profile
    if (data.client_id && data.client_info) {
      const updates = {};
      if (data.client_info.weight_lbs) updates.weight_kg = Math.round(data.client_info.weight_lbs / 2.20462);
      if (data.client_info.body_fat) updates.body_fat_percentage = parseFloat(data.client_info.body_fat);
      if (data.client_info.height_feet) {
         const ft = parseFloat(data.client_info.height_feet) || 0;
         const inch = parseFloat(data.client_info.height_inches) || 0;
         updates.height_cm = Math.round((ft * 12 + inch) * 2.54);
      }
      if (data.client_info.gender) updates.gender = data.client_info.gender.toLowerCase();
      
      if (Object.keys(updates).length > 0) {
         await base44.entities.Client.update(data.client_id, updates).catch(console.error);
         queryClient.invalidateQueries({ queryKey: ["clients"] });
      }
    }
  };

  const handleSubmitLog = async (data) => {
    if (editingLog?.id) await updateLog.mutateAsync({ id: editingLog.id, data });else
    await createLog.mutateAsync(data);
  };

  const getClientName = (id) => clients.find((c) => c.id === id)?.full_name || "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold sm:text-3xl">Fitness Tools</h1>
        <p className="text-foreground mt-1">Training programs & calorie logs</p>
      </div>

      <Tabs defaultValue="programs">
        <TabsList className="grid grid-cols-2 w-full sm:w-auto">
          <TabsTrigger value="programs" className="gap-2"><Dumbbell className="w-4 h-4" /> Training Programs</TabsTrigger>
          <TabsTrigger value="calories" className="gap-2"><Apple className="w-4 h-4" /> Calorie Logs</TabsTrigger>
        </TabsList>

        {/* Training Programs */}
        <TabsContent value="programs" className="pt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {setEditingProgram(null);setShowProgramForm(true);}} className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
              <Plus className="w-4 h-4 mr-2" /> New Program
            </Button>
          </div>
          {programs.length === 0 ?
          <Card className="glass-card">
              <CardContent className="flex flex-col items-center py-12">
                <Dumbbell className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No programs yet</h3>
                <p className="text-muted-foreground text-center mb-4">Create a fitness training program with schedule & weekly tracking.</p>
                <Button onClick={() => {setEditingProgram(null);setShowProgramForm(true);}} variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Create First Program
                </Button>
              </CardContent>
            </Card> :

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map((prog) =>
            <Card key={prog.id} className="hover:shadow-lg transition-shadow glass-card">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base text-foreground">{prog.client_name || "Unnamed Program"}</CardTitle>
                        <CardDescription className="text-muted-foreground">{prog.trainer_name && `Trainer: ${prog.trainer_name}`}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {setEditingProgram(prog);setShowProgramForm(true);}}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingProgram(prog)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {prog.client_id &&
                <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {getClientName(prog.client_id)}</div>
                }
                    {prog.start_date &&
                <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Start: {prog.start_date}</div>
                }
                    {prog.weekly_tracking?.length > 0 &&
                <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30">{prog.weekly_tracking.length} week{prog.weekly_tracking.length !== 1 ? "s" : ""} tracked</Badge>
                }
                    <div className="text-xs text-muted-foreground">
                      {[prog.warmup?.filter((e) => e.name), prog.strength?.filter((e) => e.name), prog.cardio?.filter((e) => e.name)].flat().length} exercises planned
                    </div>
                  </CardContent>
                </Card>
            )}
            </div>
          }
        </TabsContent>

        {/* Calorie Logs */}
        <TabsContent value="calories" className="pt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {setEditingLog(null);setShowCalorieForm(true);}} className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">
              <Plus className="w-4 h-4 mr-2" /> New Calorie Log
            </Button>
          </div>
          {calorieLogs.length === 0 ?
          <Card className="glass-card">
              <CardContent className="flex flex-col items-center py-12">
                <Apple className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No calorie logs yet</h3>
                <p className="text-muted-foreground text-center mb-4">Track daily food intake, fat grams, and percentage of calories from fat.</p>
                <Button onClick={() => {setEditingLog(null);setShowCalorieForm(true);}} variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Create First Log
                </Button>
              </CardContent>
            </Card> :

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {calorieLogs.map((log) => {
              const totalCals = log.entries?.reduce((s, e) => s + (parseFloat(e.calories) || 0), 0) || 0;
              const totalFat = log.entries?.reduce((s, e) => s + (parseFloat(e.fat_grams) || 0), 0) || 0;
              const fatPct = totalCals > 0 ? (totalFat * 9 / totalCals * 100).toFixed(1) : 0;
              const isOver = fatPct > 30;
              return (
                <Card key={log.id} className="hover:shadow-lg transition-shadow glass-card">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base text-foreground">{log.log_name || "Untitled Log"}</CardTitle>
                          <CardDescription className="text-muted-foreground">{log.week_start && `Week of ${log.week_start}`}</CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {setEditingLog(log);setShowCalorieForm(true);}}>
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeletingLog(log)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {log.client_id &&
                    <div className="flex items-center gap-1 text-muted-foreground"><Users className="w-3.5 h-3.5" /> {getClientName(log.client_id)}</div>
                    }
                      <div className="grid grid-cols-2 gap-2 text-center mt-2">
                        <div className="bg-secondary border border-border rounded-lg p-2">
                          <div className="font-bold text-foreground">{Math.round(totalCals)}</div>
                          <div className="text-xs text-muted-foreground">Calories</div>
                        </div>
                        <div className={`rounded-lg p-2 border border-border ${isOver ? "bg-red-500/10" : "bg-green-500/10"}`}>
                          <div className={`font-bold ${isOver ? "text-red-400" : "text-green-400"}`}>{fatPct}%</div>
                          <div className="text-xs text-muted-foreground">Fat %</div>
                        </div>
                      </div>
                      {log.entries?.length > 0 &&
                    <div className="text-xs text-muted-foreground">{log.entries.length} food entries</div>
                    }
                      {/* Trainer notes */}
                      <TrainerNoteField log={log} onSave={(notes) => updateLog.mutateAsync({ id: log.id, data: { trainer_notes: notes } })} />
                    </CardContent>
                  </Card>);

            })}
            </div>
          }
        </TabsContent>
      </Tabs>

      <FitnessProgramForm
        open={showProgramForm}
        onOpenChange={setShowProgramForm}
        program={editingProgram}
        clients={clients}
        onSubmit={handleSubmitProgram} />


      <CalorieLogForm
        open={showCalorieForm}
        onOpenChange={setShowCalorieForm}
        log={editingLog}
        clients={clients}
        onSubmit={handleSubmitLog} />


      <AlertDialog open={!!deletingProgram} onOpenChange={() => setDeletingProgram(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Program</AlertDialogTitle>
            <AlertDialogDescription>Delete "{deletingProgram?.client_name}"? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteProgram.mutate(deletingProgram.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingLog} onOpenChange={() => setDeletingLog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Log</AlertDialogTitle>
            <AlertDialogDescription>Delete "{deletingLog?.log_name}"? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteLog.mutate(deletingLog.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}