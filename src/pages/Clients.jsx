import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Filter, 
  Users,
  Grid3X3,
  List,
  SlidersHorizontal,
  Sheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import ClientCard from "@/components/clients/ClientCard";
import ClientForm from "@/components/clients/ClientForm";
import TrainerClientOnboarding from "@/components/clients/TrainerClientOnboarding";
import SessionForm from "@/components/sessions/SessionForm";
import WorkoutForm from "@/components/workouts/WorkoutForm";
import MealPlanForm from "@/components/meals/MealPlanForm";
import GoogleSheetsImporter from "@/components/imports/GoogleSheetsImporter";
import { cn } from "@/lib/utils";

export default function Clients() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [showClientForm, setShowClientForm] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [showMealPlanForm, setShowMealPlanForm] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [deleteClient, setDeleteClient] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.Client.filter({ trainer_id: user.id }, "-created_date");
    },
    enabled: !!user,
  });

  const createClientMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });

  const handleSubmitClient = async (data) => {
    try {
      if (editingClient) {
        await updateClientMutation.mutateAsync({ id: editingClient.id, data });
      } else {
        await createClientMutation.mutateAsync(data);
      }
      setEditingClient(null);
      setShowClientForm(false);
    } catch (error) {
      console.error("Client submission error:", error);
      alert(error.message || "Failed to save client");
    }
  };

  const handleDeleteClient = async () => {
    if (deleteClient) {
      await deleteClientMutation.mutateAsync(deleteClient.id);
      setDeleteClient(null);
    }
  };

  const handleCreateSession = async (data) => {
    const selectedClient = clients.find(c => c.id === data.client_id);
    await base44.entities.Session.create({ ...data, trainer_id: user?.id, client_name: selectedClient?.full_name || "" });
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
  };

  const handleCreateWorkout = async (data) => {
    await base44.entities.WorkoutPlan.create({ ...data, trainer_id: user?.id });
    queryClient.invalidateQueries({ queryKey: ["workouts"] });
  };

  const handleCreateMealPlan = async (data) => {
    await base44.entities.MealPlan.create({ ...data, trainer_id: user?.id });
    queryClient.invalidateQueries({ queryKey: ["mealplans"] });
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-1">{clients.length} total clients</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate(createPageUrl("BulkImport"))}
            variant="outline"
            className="border-green-500/40 text-green-400 hover:bg-green-500/10"
          >
            <Sheet className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button 
            onClick={() => { setEditingClient(null); setShowOnboarding(true); }}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25"
          >
            <Plus className="w-4 h-4 mr-2" />
            Onboard Client
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 sm:w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex bg-secondary border border-border rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", viewMode === "grid" && "bg-secondary text-foreground shadow-sm")}
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", viewMode === "list" && "bg-secondary text-foreground shadow-sm")}
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Client Grid/List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary rounded w-3/4" />
                  <div className="h-3 bg-secondary rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredClients.length > 0 ? (
        <div className={cn(
          "grid gap-4",
          viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onEdit={(c) => { setEditingClient(c); setShowClientForm(true); }}
              onEditOnboarding={(c) => { setSelectedClient(c); setShowOnboarding(true); }}
              onDelete={(c) => setDeleteClient(c)}
              onSchedule={(c) => { setSelectedClient(c); setShowSessionForm(true); }}
              onWorkout={(c) => { setSelectedClient(c); setShowWorkoutForm(true); }}
              onMealPlan={(c) => { setSelectedClient(c); setShowMealPlanForm(true); }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 glass-card rounded-2xl">
          <Users className="w-16 h-16 mx-auto text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-foreground">No clients found</h3>
          <p className="mt-2 text-muted-foreground">
            {searchQuery || statusFilter !== "all" 
              ? "Try adjusting your search or filters"
              : "Get started by adding your first client"}
          </p>
          {!searchQuery && statusFilter === "all" && (
            <Button 
              className="mt-6 bg-gradient-to-r from-emerald-500 to-teal-600"
              onClick={() => setShowOnboarding(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Onboard Your First Client
            </Button>
          )}
        </div>
      )}

      {/* Forms */}
      <TrainerClientOnboarding
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        client={selectedClient}
        onSubmit={handleSubmitClient}
      />

      <ClientForm
        open={showClientForm}
        onOpenChange={setShowClientForm}
        client={editingClient}
        onSubmit={handleSubmitClient}
      />

      <SessionForm
        open={showSessionForm}
        onOpenChange={(open) => { setShowSessionForm(open); if (!open) setSelectedClient(null); }}
        session={selectedClient ? { client_id: selectedClient.id } : null}
        clients={clients}
        onSubmit={handleCreateSession}
      />

      <WorkoutForm
        open={showWorkoutForm}
        onOpenChange={(open) => { setShowWorkoutForm(open); if (!open) setSelectedClient(null); }}
        workout={selectedClient ? { client_id: selectedClient.id } : null}
        clients={clients}
        onSubmit={handleCreateWorkout}
      />

      <MealPlanForm
        open={showMealPlanForm}
        onOpenChange={(open) => { setShowMealPlanForm(open); if (!open) setSelectedClient(null); }}
        plan={selectedClient ? { client_id: selectedClient.id } : null}
        clients={clients}
        onSubmit={handleCreateMealPlan}
      />

      <GoogleSheetsImporter
        open={showImporter}
        onOpenChange={setShowImporter}
        onImported={() => queryClient.invalidateQueries({ queryKey: ["clients"] })}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteClient} onOpenChange={() => setDeleteClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteClient?.full_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}