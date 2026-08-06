import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Plus, 
  Search, 
  Dumbbell,
  Calendar,
  User,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Play,
  Pause,
  CheckCircle,
  LayoutTemplate,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import WorkoutForm from "@/components/workouts/WorkoutForm";
import AIWorkoutGenerator from "@/components/ai/AIWorkoutGenerator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusStyles = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  archived: "bg-amber-100 text-amber-700"
};

const difficultyStyles = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced: "bg-red-100 text-red-700"
};

export default function Workouts() {
  const location = useLocation();
  const navigate = useNavigate();
  const urlClientId = new URLSearchParams(location.search).get("client_id");
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [deleteWorkout, setDeleteWorkout] = useState(null);
  const [activeTab, setActiveTab] = useState("plans");

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["workouts"],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      return base44.entities.WorkoutPlan.filter({ trainer_id: currentUser.id }, "-created_date");
    },
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["fitness-templates"],
    queryFn: () => base44.entities.FitnessTemplate.list("-created_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const createWorkoutMutation = useMutation({
    mutationFn: async (data) => {
      if (!user?.id) {
        const currentUser = await base44.auth.me();
        if (!currentUser?.id) throw new Error('User not loaded');
        return base44.entities.WorkoutPlan.create({ ...data, trainer_id: currentUser.id });
      }
      return base44.entities.WorkoutPlan.create({ ...data, trainer_id: user.id });
    },
    onMutate: async (newWorkout) => {
      await queryClient.cancelQueries({ queryKey: ["workouts"] });
      const previous = queryClient.getQueryData(["workouts"]);
      queryClient.setQueryData(["workouts"], (old) => {
        return [{ id: `temp-${Date.now()}`, status: "active", ...newWorkout }, ...(old || [])];
      });
      setShowWorkoutForm(false);
      return { previous };
    },
    onError: (err, newWorkout, context) => {
      queryClient.setQueryData(["workouts"], context.previous);
      toast.error("Failed to create workout plan");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["workouts"] }),
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkoutPlan.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["workouts"] });
      const previous = queryClient.getQueryData(["workouts"]);
      queryClient.setQueryData(["workouts"], (old) => {
        return (old || []).map(w => w.id === id ? { ...w, ...data } : w);
      });
      setShowWorkoutForm(false);
      setEditingWorkout(null);
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["workouts"], context.previous);
      toast.error("Failed to update workout plan");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["workouts"] }),
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkoutPlan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workouts"] }),
  });

  const handleSubmitWorkout = async (data) => {
    try {
      if (editingWorkout?.id) {
        await updateWorkoutMutation.mutateAsync({ id: editingWorkout.id, data });
      } else {
        const { trainer_id, id, created_date, updated_date, created_by, ...cleanData } = data;
        await createWorkoutMutation.mutateAsync(cleanData);
      }
      setEditingWorkout(null);
      setShowWorkoutForm(false);

      if (urlClientId) {
        navigate(createPageUrl("ClientProfile") + "?id=" + urlClientId);
      }
    } catch (error) {
      console.error('Error submitting workout:', error);
    }
  };

  const handleDeleteWorkout = async () => {
    if (deleteWorkout) {
      await deleteWorkoutMutation.mutateAsync(deleteWorkout.id);
      setDeleteWorkout(null);
    }
  };

  const handleDuplicate = async (workout) => {
    const { id, created_date, updated_date, created_by, trainer_id, ...rest } = workout;
    await createWorkoutMutation.mutateAsync({
      ...rest,
      name: `${rest.name} (Copy)`,
      status: "draft",
      trainer_id: user?.id
    });
  };

  const handleStatusChange = async (workout, newStatus) => {
    await updateWorkoutMutation.mutateAsync({ id: workout.id, data: { status: newStatus } });
  };

  const handleUseTemplate = (template) => {
    const { id, created_date, updated_date, created_by, category, ...templateData } = template;
    setEditingWorkout({
      ...templateData,
      status: urlClientId ? "active" : "draft",
      client_id: urlClientId || null,
      exercises: template.exercises || []
    });
    setShowWorkoutForm(true);
    setActiveTab("plans");
  };

  const getClientById = (clientId) => clients.find(c => (c.user_id || c.id) === clientId);

  const filteredWorkouts = workouts.filter(workout => {
    const matchesSearch = workout.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || workout.status === statusFilter;
    const matchesClient = urlClientId ? workout.client_id === urlClientId : true;
    return matchesSearch && matchesStatus && matchesClient;
  });

  const filteredTemplates = templates.filter(template => {
    return template.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      {urlClientId && (
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2 text-muted-foreground hover:text-foreground pl-0">
          &larr; Back to Client Profile
        </Button>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {urlClientId ? "Client's Workout Plans" : "Workout Plans"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {activeTab === "plans" ? `${filteredWorkouts.length} client plans` : `${filteredTemplates.length} templates`}
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => { setEditingWorkout(urlClientId ? { client_id: urlClientId, status: "active" } : null); setShowWorkoutForm(true); }}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-lg shadow-purple-500/25"
          >
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === "plans" ? "Create Plan" : "Create Template"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2 flex flex-wrap h-auto">
          <TabsTrigger value="plans">Client Plans</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === "plans" ? "Search workout plans..." : "Search templates..."}
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {activeTab === "plans" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="plans" className="mt-6">
          {/* Client Plans Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
                  <div className="h-6 bg-secondary rounded w-3/4 mb-4" />
                  <div className="h-4 bg-secondary rounded w-1/2 mb-2" />
                  <div className="h-4 bg-secondary rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : filteredWorkouts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkouts.map((workout) => {
            const client = getClientById(workout.client_id);
            return (
              <div
                key={workout.id}
                className="glass-card rounded-2xl p-5 hover:shadow-lg transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                      <Dumbbell className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{workout.name}</h3>
                      {client && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" /> {client.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleStatusChange(workout, "active")}>
                        <Play className="w-4 h-4 mr-2" /> Set Active
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(workout, "draft")}>
                        <Clock className="w-4 h-4 mr-2" /> Set as Draft
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(workout, "completed")}>
                        <CheckCircle className="w-4 h-4 mr-2" /> Mark Complete
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setEditingWorkout(workout); setShowWorkoutForm(true); }}>
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(workout)}>
                        <Copy className="w-4 h-4 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteWorkout(workout)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {workout.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{workout.description}</p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className={statusStyles[workout.status] || statusStyles.draft}>
                    {workout.status || "draft"}
                  </Badge>
                  <Badge className={difficultyStyles[workout.difficulty] || difficultyStyles.intermediate}>
                    {workout.difficulty || "intermediate"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {workout.duration_weeks || 4} weeks
                  </span>
                  <span>{workout.days_per_week || 3} days/week</span>
                  <span>{workout.exercises?.length || 0} exercises</span>
                </div>

                {/* Quick assign + status toggle */}
                <div className="pt-3 border-t border-border flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 text-xs">
                        <User className="w-3 h-3 mr-1" />
                        {client ? client.full_name : "Assign to Client"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => updateWorkoutMutation.mutate({ id: workout.id, data: { client_id: null, status: 'draft' } })}>
                        Unassigned (Draft)
                      </DropdownMenuItem>
                      {clients.map(c => (
                        <DropdownMenuItem key={c.id} onClick={() => updateWorkoutMutation.mutate({ id: workout.id, data: { client_id: c.user_id || c.id, status: 'active' } })}>
                          {c.full_name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className={`text-xs px-2 ${workout.status === 'active' ? 'border-emerald-300 text-emerald-700' : ''}`}>
                        {workout.status || 'draft'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleStatusChange(workout, 'draft')}>Draft</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(workout, 'active')}>Active</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(workout, 'completed')}>Completed</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(workout, 'archived')}>Archived</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
            </div>
          ) : (
            <div className="text-center py-16 glass-card rounded-2xl">
              <Dumbbell className="w-16 h-16 mx-auto text-gray-600" />
              <h3 className="mt-4 text-lg font-medium text-foreground">No workout plans found</h3>
              <p className="mt-2 text-muted-foreground">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your search or filters"
                  : "Create your first workout plan to get started"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button 
                  className="mt-6 bg-gradient-to-r from-purple-500 to-pink-600"
                  onClick={() => setShowWorkoutForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Plan
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          {/* Templates Grid */}
          {templatesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
                  <div className="h-6 bg-secondary rounded w-3/4 mb-4" />
                  <div className="h-4 bg-secondary rounded w-1/2 mb-2" />
                  <div className="h-4 bg-secondary rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="glass-card rounded-2xl p-5 hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => handleUseTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <LayoutTemplate className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{template.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">{template.category}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-gradient-to-r from-blue-500 to-purple-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseTemplate(template);
                      }}
                    >
                      Use Template
                    </Button>
                  </div>

                  {template.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{template.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className={difficultyStyles[template.difficulty] || difficultyStyles.intermediate}>
                      {template.difficulty || "intermediate"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {template.duration_weeks || 4} weeks
                    </span>
                    <span>{template.days_per_week || 3} days/week</span>
                    <span>{template.exercises?.length || 0} exercises</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 glass-card rounded-2xl">
              <LayoutTemplate className="w-16 h-16 mx-auto text-gray-600" />
              <h3 className="mt-4 text-lg font-medium text-foreground">No templates found</h3>
              <p className="mt-2 text-muted-foreground">
                {searchQuery ? "Try adjusting your search" : "Create your first template to get started"}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* AI Workout Generator — only on main workouts page, not when editing for a specific client (handled in ClientProfile) */}
      {!urlClientId && !showWorkoutForm && (
        <div className="mt-6">
          <AIWorkoutGenerator
            client={clients[0]}
            onPlanGenerated={() => queryClient.invalidateQueries({ queryKey: ["workouts"] })}
          />
        </div>
      )}

      <WorkoutForm
        open={showWorkoutForm}
        onOpenChange={setShowWorkoutForm}
        workout={editingWorkout}
        clients={clients}
        onSubmit={handleSubmitWorkout}
      />

      <AlertDialog open={!!deleteWorkout} onOpenChange={() => setDeleteWorkout(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteWorkout?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWorkout} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}