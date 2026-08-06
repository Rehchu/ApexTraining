import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, Mail, Phone, Calendar as CalendarIcon, UserPlus, MoreVertical, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";

import ClientForm from "@/components/clients/ClientForm";
import SessionForm from "@/components/sessions/SessionForm";
import TrainerManagement from "@/components/admin/TrainerManagement";
import ClientCard from "@/components/clients/ClientCard";
import LeadsKanbanBoard from "@/components/crm/LeadsKanbanBoard";

export default function CRM() {
  const [user, setUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  
  // Gym CRM State
  const [activeTab, setActiveTab] = useState("leads");
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", user?.id],
    queryFn: () => base44.entities.Lead.filter({ trainer_id: user.id }, "-created_date"),
    enabled: !!user
  });

  const { data: trainees = [] } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: () => base44.entities.Client.filter({ trainer_id: user.id }, "-created_date"),
    enabled: !!user
  });

  const { data: trainings = [] } = useQuery({
    queryKey: ["sessions", user?.id],
    queryFn: () => base44.entities.Session.filter({ trainer_id: user.id }, "-date"),
    enabled: !!user
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ["trainers"],
    queryFn: async () => {
      if (user?.role === 'admin') {
        return base44.entities.TrainerStats.list();
      }
      return base44.entities.TrainerStats.filter({ trainer_id: user?.id });
    },
    enabled: !!user
  });

  const handleSaveClient = async (data) => {
    if (editingClient) await base44.entities.Client.update(editingClient.id, data);
    else await base44.entities.Client.create(data);
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    setShowClientForm(false);
  };

  const handleSaveSession = async (data) => {
    if (editingSession) await base44.entities.Session.update(editingSession.id, data);
    else await base44.entities.Session.create(data);
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
    setShowSessionForm(false);
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create({ ...data, trainer_id: user.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowAddModal(false);
      toast.success("Lead added successfully!");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowAddModal(false);
      setEditingLead(null);
      toast.success("Lead updated successfully!");
    }
  });

  const updateLeadStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Lead.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    }
  });

  const updateLeadNotesMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.Lead.update(id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Notes saved!");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Lead.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead deleted");
    }
  });

  const convertToClientMutation = useMutation({
    mutationFn: async (lead) => {
      const clientData = {
        full_name: lead.full_name,
        email: lead.email || `lead-${lead.id}@example.com`,
        phone: lead.phone || "",
        trainer_id: user.id,
        status: "active",
        tags: ["from-crm"]
      };
      const newClient = await base44.entities.Client.create(clientData);
      await base44.entities.Lead.update(lead.id, { status: "won" });
      
      const leadPages = await base44.entities.ClientNotebookPage.filter({ lead_id: lead.id });
      for (const page of leadPages) {
        await base44.entities.ClientNotebookPage.update(page.id, { client_id: newClient.id, lead_id: null });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Lead converted to Client!");
    }
  });

  const LeadForm = ({ lead, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(lead || {
      full_name: "",
      email: "",
      phone: "",
      source: "",
      status: "new",
      notes: "",
      follow_up_date: ""
    });

    return (
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground">Full Name *</label>
          <Input required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="bg-card border-border text-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="bg-card border-border text-foreground" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Phone</label>
            <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-card border-border text-foreground" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Status</label>
            <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
              <SelectTrigger className="bg-card border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="won">Won (Client)</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Lead Source</label>
            <Input placeholder="e.g. Instagram, Referral" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="bg-card border-border text-foreground" />
          </div>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Follow-up Date</label>
          <Input type="date" value={formData.follow_up_date} onChange={e => setFormData({...formData, follow_up_date: e.target.value})} className="bg-card border-border text-foreground" />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Notes</label>
          <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="bg-card border-border text-foreground h-24" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-foreground hover:bg-accent">Cancel</Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground border-none">Save Lead</Button>
        </div>
      </form>
    );
  };

  const statusColors = {
    new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    contacted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    in_progress: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    won: "bg-green-500/20 text-green-400 border-green-500/30",
    lost: "bg-red-500/20 text-red-400 border-red-500/30"
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      <div className="flex items-center justify-between mt-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            Gym CRM
          </h1>
          <p className="text-muted-foreground mt-2">Manage leads, trainees, trainers, and trainings</p>
        </div>
        {activeTab === "leads" && (
          <Button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-none transition-all">
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        )}
        {activeTab === "trainees" && (
          <Button onClick={() => { setEditingClient(null); setShowClientForm(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-none transition-all">
            <Plus className="w-4 h-4 mr-2" />
            Add Trainee
          </Button>
        )}
        {activeTab === "trainings" && (
          <Button onClick={() => { setEditingSession(null); setShowSessionForm(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-none transition-all">
            <Plus className="w-4 h-4 mr-2" />
            Add Training
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border p-1 flex flex-wrap h-auto rounded-xl mb-4 hide-scrollbar">
          <TabsTrigger value="leads" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Leads Pipeline</TabsTrigger>
          <TabsTrigger value="trainees" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Trainees</TabsTrigger>
          <TabsTrigger value="trainings" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Trainings</TabsTrigger>
          <TabsTrigger value="trainers" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Trainers</TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <LeadsKanbanBoard 
            leads={leads}
            onUpdateStatus={(id, status) => updateLeadStatusMutation.mutate({ id, status })}
            onUpdateNotes={(id, notes) => updateLeadNotesMutation.mutate({ id, notes })}
            onConvertToClient={(lead) => convertToClientMutation.mutate(lead)}
            onEdit={(lead) => { setEditingLead(lead); setShowAddModal(true); }}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="trainees" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainees.map(trainee => (
              <ClientCard 
                key={trainee.id} 
                client={trainee} 
                onEdit={(c) => { setEditingClient(c); setShowClientForm(true); }}
                onDelete={async (c) => {
                  await base44.entities.Client.delete(c.id);
                  queryClient.invalidateQueries({ queryKey: ["clients"] });
                }}
              />
            ))}
            {trainees.length === 0 && (
              <div className="col-span-full text-center py-12 bg-card rounded-xl border border-border">
                <p className="text-muted-foreground">No trainees found.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="trainings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainings.map(session => (
              <Card key={session.id} className="bg-card border border-border rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-foreground text-lg">{session.client_name || 'Training Session'}</CardTitle>
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <CalendarIcon className="w-4 h-4" /> {session.date} at {session.start_time}
                  </div>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="capitalize text-primary border-primary/30">{session.type?.replace("_", " ")}</Badge>
                  <Badge variant="outline" className="ml-2 capitalize text-muted-foreground border-border">{session.status}</Badge>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingSession(session); setShowSessionForm(true); }} className="w-full border-border hover:bg-accent">Edit</Button>
                  <Button variant="outline" size="sm" onClick={async () => {
                    await base44.entities.Session.delete(session.id);
                    queryClient.invalidateQueries({ queryKey: ["sessions"] });
                  }} className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10">Delete</Button>
                </CardFooter>
              </Card>
            ))}
            {trainings.length === 0 && (
              <div className="col-span-full text-center py-12 bg-card rounded-xl border border-border">
                <p className="text-muted-foreground">No trainings found.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="trainers">
          <TrainerManagement 
            trainers={trainers} 
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["trainers"] })} 
            title="Manage Trainers" 
            entityType="trainer" 
          />
        </TabsContent>
      </Tabs>

      <ClientForm open={showClientForm} onOpenChange={setShowClientForm} client={editingClient} onSubmit={handleSaveClient} />
      <SessionForm open={showSessionForm} onOpenChange={setShowSessionForm} session={editingSession} clients={trainees} onSubmit={handleSaveSession} />

      <Dialog open={showAddModal || !!editingLead} onOpenChange={(open) => {
        if (!open) {
          setShowAddModal(false);
          setEditingLead(null);
        }
      }}>
        <DialogContent className="bg-card text-foreground border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              {editingLead ? "Edit Lead" : "Add New Lead"}
            </DialogTitle>
          </DialogHeader>
          <LeadForm 
            lead={editingLead} 
            onSubmit={(data) => {
              if (editingLead) updateMutation.mutate({ id: editingLead.id, data });
              else createMutation.mutate(data);
            }}
            onCancel={() => {
              setShowAddModal(false);
              setEditingLead(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}