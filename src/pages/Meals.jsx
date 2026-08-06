import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MealPlanForm from "../components/meals/MealPlanForm";
import ShoppingListView from "../components/meals/ShoppingListView";
import AIMealPlanGenerator from "@/components/ai/AIMealPlanGenerator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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
import {
  Apple,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  CheckCircle2,
  Clock,
  Users,
  Calendar,
  Loader2,
  Send,
  ShoppingCart,
  Play,
  Pause,
  Archive
} from "lucide-react";

const statusStyles = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  archived: "bg-gray-100 text-gray-600",
};

const categoryStyles = {
  weight_loss: "bg-orange-100 text-orange-700",
  muscle_gain: "bg-purple-100 text-purple-700",
  maintenance: "bg-blue-100 text-blue-700",
  performance: "bg-red-100 text-red-700",
  health: "bg-green-100 text-green-700",
};

export default function Meals() {
  const location = useLocation();
  const navigate = useNavigate();
  const urlClientId = new URLSearchParams(location.search).get("client_id");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(null);
  const [activeTab, setActiveTab] = useState("plans");
  const [sendingPlan, setSendingPlan] = useState(null);
  const [shoppingListPlan, setShoppingListPlan] = useState(null);

  const queryClient = useQueryClient();

  const { data: mealPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["mealPlans"],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      return base44.entities.MealPlan.filter({ trainer_id: currentUser.id }, "-updated_date");
    },
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["mealTemplates"],
    queryFn: () => base44.entities.MealPlanTemplate.list("-updated_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MealPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlans"] });
      setShowForm(false);
      setEditingPlan(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MealPlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlans"] });
      setShowForm(false);
      setEditingPlan(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MealPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlans"] });
      setDeletingPlan(null);
    },
  });

  const handleSubmit = async (data) => {
    try {
      const user = await base44.auth.me();
      const submitData = { ...data, trainer_id: user.id };
      
      if (editingPlan?.id) {
        await updateMutation.mutateAsync({ id: editingPlan.id, data: submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }

      if (urlClientId) {
        navigate(createPageUrl("ClientProfile") + "?id=" + urlClientId);
      }
    } catch (error) {
      console.error('Error submitting meal plan:', error);
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deletingPlan) {
      await deleteMutation.mutateAsync(deletingPlan.id);
    }
  };

  const handleDuplicate = async (plan) => {
    const newPlan = {
      ...plan,
      name: `${plan.name} (Copy)`,
      status: "draft",
      client_id: null,
    };
    delete newPlan.id;
    delete newPlan.created_date;
    delete newPlan.updated_date;
    await createMutation.mutateAsync(newPlan);
  };

  const handleStatusChange = async (plan, newStatus) => {
    await updateMutation.mutateAsync({
      id: plan.id,
      data: { ...plan, status: newStatus },
    });
  };

  const handleUseTemplate = (template) => {
    setEditingPlan({
      name: template.name,
      description: template.description,
      duration_days: template.duration_days,
      calories_target: template.calories_target,
      protein_target_g: template.protein_target_g,
      carbs_target_g: template.carbs_target_g,
      fat_target_g: template.fat_target_g,
      meals: template.meals || [],
      status: urlClientId ? "active" : "draft",
      client_id: urlClientId || null
    });
    setShowForm(true);
    setActiveTab("plans");
  };

  const handleSendToClient = async (plan) => {
    if (!plan.client_id) {
      return;
    }

    const client = clients.find(c => c.id === plan.client_id);
    if (!client || !client.user_id) {
      return;
    }

    const user = await base44.auth.me();
    
    // Format meal plan details
    let messageContent = `📋 **${plan.name}**\n\n`;
    if (plan.description) {
      messageContent += `${plan.description}\n\n`;
    }
    
    messageContent += `**Nutrition Targets:**\n`;
    if (plan.calories_target) messageContent += `• Calories: ${plan.calories_target} cal/day\n`;
    if (plan.protein_target_g) messageContent += `• Protein: ${plan.protein_target_g}g\n`;
    if (plan.carbs_target_g) messageContent += `• Carbs: ${plan.carbs_target_g}g\n`;
    if (plan.fat_target_g) messageContent += `• Fat: ${plan.fat_target_g}g\n`;
    
    if (plan.meals && plan.meals.length > 0) {
      messageContent += `\n**Meals:**\n\n`;
      
      plan.meals.forEach((meal, idx) => {
        messageContent += `**Day ${meal.day} - ${meal.meal_type}**: ${meal.name || 'Meal'}\n`;
        
        if (meal.foods && meal.foods.length > 0) {
          meal.foods.forEach(food => {
            messageContent += `  • ${food.name} (${food.amount} ${food.unit})`;
            if (food.calories || food.protein || food.carbs || food.fat) {
              messageContent += ` - ${food.calories || 0}cal, ${food.protein || 0}g protein, ${food.carbs || 0}g carbs, ${food.fat || 0}g fat`;
            }
            messageContent += `\n`;
          });
        }
        
        if (meal.instructions) {
          messageContent += `  Instructions: ${meal.instructions}\n`;
        }
        messageContent += `\n`;
      });
    }

    const conversationId = [user.id, client.user_id].sort().join('-');
    
    await base44.entities.Message.create({
      conversation_id: conversationId,
      sender_id: user.id,
      sender_name: user.full_name,
      receiver_id: client.user_id,
      receiver_name: client.full_name,
      content: messageContent,
      read: false,
      timestamp: new Date().toISOString()
    });

    await base44.entities.Notification.create({
      user_id: client.user_id,
      type: "meal_assigned",
      title: "New Meal Plan",
      message: `Your trainer assigned you a meal plan: ${plan.name}`,
      link: "ClientMeals"
    });

    setSendingPlan(null);
  };

  const filteredPlans = mealPlans.filter(
    (plan) => {
      const matchesSearch = plan.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClient = urlClientId ? (plan.client_id === urlClientId) : true;
      return matchesSearch && matchesClient;
    }
  );

  const filteredTemplates = templates.filter(
    (template) =>
      template.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getClientName = (clientId) => {
    const client = clients.find((c) => (c.user_id || c.id) === clientId);
    return client?.full_name || "Unassigned";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {urlClientId && (
        <Link to={createPageUrl("ClientProfile") + `?id=${urlClientId}`}>
          <Button variant="ghost" className="mb-2 text-muted-foreground hover:text-foreground pl-0">
            &larr; Back to Client Profile
          </Button>
        </Link>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Apple className="w-7 h-7 text-foreground" />
            </div>
            {urlClientId ? "Client's Meal Plans" : "Meal Plans"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {urlClientId ? "Create and manage nutrition plans for this client" : "Create and manage nutrition plans for your clients"}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              setEditingPlan(urlClientId ? { client_id: urlClientId, status: "active" } : null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-500/25"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Meal Plan
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search meal plans..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full sm:w-auto grid-cols-2 mb-6">
          <TabsTrigger value="plans">Client Plans</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Client Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          {plansLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="glass-card rounded-2xl">
              <div className="flex flex-col items-center justify-center py-12">
                <Apple className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No meal plans yet
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first meal plan to get started
                </p>
                <Button
                  onClick={() => {
                    setEditingPlan(null);
                    setShowForm(true);
                  }}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Plan
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlans.map((plan) => (
                <div key={plan.id} className="glass-card rounded-2xl p-5 hover:shadow-lg transition-all">
                  <div className="mb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-1">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {plan.description || "No description"}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStatusChange(plan, "active")}>
                            <Play className="w-4 h-4 mr-2" /> Set Active
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(plan, "draft")}>
                            <Clock className="w-4 h-4 mr-2" /> Set as Draft
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(plan, "completed")}>
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Complete
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(plan)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShoppingListPlan(plan)}>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Shopping List
                          </DropdownMenuItem>
                          {plan.client_id && (
                            <DropdownMenuItem onClick={() => handleSendToClient(plan)}>
                              <Send className="w-4 h-4 mr-2" />
                              Send to Client
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDuplicate(plan)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingPlan(plan)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge className={statusStyles[plan.status]}>
                        {plan.status === "active" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {plan.status === "draft" && <Clock className="w-3 h-3 mr-1" />}
                        {plan.status}
                      </Badge>
                      {plan.client_id && (
                        <Badge variant="outline" className="gap-1 text-muted-foreground border-border">
                          <Users className="w-3 h-3" />
                          {getClientName(plan.client_id)}
                        </Badge>
                      )}
                    </div>

                    {plan.calories_target && (
                      <div className="text-sm text-muted-foreground">
                        <strong className="text-muted-foreground">Target:</strong> {plan.calories_target} cal/day
                      </div>
                    )}

                    {plan.duration_days && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {plan.duration_days} days
                      </div>
                    )}

                    {plan.meals && plan.meals.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                          {plan.meals.length} meals planned
                        </div>
                        <div className="max-h-32 overflow-y-auto text-xs text-muted-foreground space-y-1 border-t border-border pt-2">
                          {(plan.meals || []).map((meal, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span><strong className="text-muted-foreground">Day {meal.day} - {meal.meal_type}:</strong></span>
                              <span>{meal.foods?.length || 0} items</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-border flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-1 text-xs">
                            Status: {plan.status}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleStatusChange(plan, "draft")}>Draft</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(plan, "active")}>Active</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(plan, "completed")}>Completed</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(plan, "archived")}>Archived</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-1 text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            {plan.client_id ? getClientName(plan.client_id) : "Assign"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => updateMutation.mutate({ id: plan.id, data: { ...plan, client_id: null, status: 'draft' } })}>
                            Unassigned (Draft)
                          </DropdownMenuItem>
                          {clients.map(c => (
                            <DropdownMenuItem key={c.id} onClick={() => updateMutation.mutate({ id: plan.id, data: { ...plan, client_id: c.user_id || c.id, status: 'active' } })}>
                              {c.full_name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="glass-card rounded-2xl">
              <div className="flex flex-col items-center justify-center py-12">
                <Apple className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No templates available
                </h3>
                <p className="text-muted-foreground text-center">
                  Templates will appear here once created
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <div key={template.id} className="glass-card rounded-2xl p-5 hover:shadow-lg transition-all space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{template.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {template.description || "No description"}
                    </p>
                  </div>

                  <Badge className={categoryStyles[template.category]}>
                    {template.category?.replace("_", " ")}
                  </Badge>

                  {template.calories_target && (
                    <div className="text-sm text-muted-foreground">
                      <strong className="text-muted-foreground">Target:</strong> {template.calories_target} cal/day
                    </div>
                  )}

                  {template.duration_days && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {template.duration_days} days
                    </div>
                  )}

                  <Button
                    onClick={() => handleUseTemplate(template)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Use Template
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* AI Meal Plan Generator */}
      {!urlClientId && !showForm && (
        <div className="mt-4">
          <AIMealPlanGenerator
            client={clients[0]}
            onPlanGenerated={() => queryClient.invalidateQueries({ queryKey: ["mealPlans"] })}
          />
        </div>
      )}

      {/* Meal Plan Form */}
      <MealPlanForm
        open={showForm}
        onOpenChange={setShowForm}
        plan={editingPlan}
        clients={clients}
        onSubmit={handleSubmit}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingPlan}
        onOpenChange={() => setDeletingPlan(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meal Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPlan?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shopping List View */}
      {shoppingListPlan && (
        <ShoppingListView
          mealPlanId={shoppingListPlan.id}
          mealPlanName={shoppingListPlan.name}
          onOpenChange={(open) => !open && setShoppingListPlan(null)}
        />
      )}
    </div>
  );
}