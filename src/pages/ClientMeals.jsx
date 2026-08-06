import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ShoppingListView from "../components/meals/ShoppingListView";
import CalorieTracker from "@/components/nutrition/CalorieTracker";
import PhotoMealLogger from "@/components/meals/PhotoMealLogger";
import ItemCompletionTracker from "@/components/ItemCompletionTracker";
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
  DialogTitle } from
"@/components/ui/dialog";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Apple,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Flame,
  Beef,
  Wheat,
  Droplet,
  ShoppingCart,
  Plus,
  Trash2 } from
"lucide-react";
import MealPlanForm from "@/components/meals/MealPlanForm";

import { format } from "date-fns";

function CalorieLogEditor({ log, onSave }) {
  const [entries, setEntries] = useState(log.entries || []);

  const update = (i, field, val) => {
    const copy = [...entries];
    copy[i] = { ...copy[i], [field]: val };
    if (field === 'fat_grams' || field === 'calories') {
      const fat = parseFloat(field === 'fat_grams' ? val : copy[i].fat_grams) || 0;
      copy[i].calories_from_fat = fat * 9;
      const cals = parseFloat(field === 'calories' ? val : copy[i].calories) || 0;
      copy[i].fat_percentage = cals > 0 ? fat * 9 / cals : 0;
    }
    setEntries(copy);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              <th className="text-left p-2 text-xs text-muted-foreground font-medium">Day</th>
              <th className="text-left p-2 text-xs text-muted-foreground font-medium">Food</th>
              <th className="text-left p-2 text-xs text-muted-foreground font-medium w-20">Calories</th>
              <th className="text-left p-2 text-xs text-muted-foreground font-medium w-20">Fat (g)</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) =>
            <tr key={i} className="border-t border-border">
                <td className="p-1 text-xs text-muted-foreground w-24">{entry.day}</td>
                <td className="p-1">
                  <Input value={entry.food || ''} onChange={(e) => update(i, 'food', e.target.value)} className="h-7 text-xs bg-secondary border-border text-foreground" placeholder="Food eaten" />
                </td>
                <td className="p-1">
                  <Input type="number" value={entry.calories || ''} onChange={(e) => update(i, 'calories', e.target.value)} className="h-7 text-xs bg-secondary border-border text-foreground" />
                </td>
                <td className="p-1">
                  <Input type="number" value={entry.fat_grams || ''} onChange={(e) => update(i, 'fat_grams', e.target.value)} className="h-7 text-xs bg-secondary border-border text-foreground" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => onSave(entries)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-xl">
          Save Changes
        </Button>
      </div>
    </div>);

}

export default function ClientMeals() {
  const [user, setUser] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [shoppingListPlan, setShoppingListPlan] = useState(null);
  const [editingCalorieLog, setEditingCalorieLog] = useState(null);
  const [showMealPlanForm, setShowMealPlanForm] = useState(false);
  const queryClient = useQueryClient();

  const createMealPlanMutation = useMutation({
    mutationFn: (data) => base44.entities.MealPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientMeals-all"] });
    },
  });

  const deleteMealPlanMutation = useMutation({
    mutationFn: (id) => base44.entities.MealPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientMeals-all"] });
      toast.success("Meal plan deleted");
    },
  });

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

  const { data: mealPlans = [] } = useQuery({
    queryKey: ["clientMeals-all", user?.id, clientProfile?.id],
    queryFn: async () => {
      const ids = [user.id];
      if (clientProfile?.id && !ids.includes(clientProfile.id)) ids.push(clientProfile.id);
      if (clientProfile?.user_id && !ids.includes(clientProfile.user_id)) ids.push(clientProfile.user_id);
      const results = await Promise.allSettled(ids.map(id => base44.entities.MealPlan.filter({ client_id: id })));
      const combined = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
      return combined.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
    },
    enabled: !!user,
    placeholderData: (prev) => prev,
  });

  const { data: mealLogs = [] } = useQuery({
    queryKey: ["mealLogs", clientProfile?.id],
    queryFn: () => base44.entities.MealLog.filter({ client_id: clientProfile.id }, "-date"),
    enabled: !!clientProfile
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.list()
  });

  const { data: calorieLogs = [] } = useQuery({
    queryKey: ["calorieLogs", clientProfile?.id],
    queryFn: () => base44.entities.CalorieLog.filter({ client_id: clientProfile.id }, "-week_start"),
    enabled: !!clientProfile
  });

  const updateCalorieLogMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalorieLog.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calorieLogs"] })
  });

  const activeMeals = mealPlans.filter((m) => m.status !== 'archived' && m.status !== 'completed');
  const completedMeals = mealPlans.filter((m) => m.status === 'completed');

  const getMealIcon = (mealType) => {
    switch (mealType) {
      case 'breakfast':return '🌅';
      case 'lunch':return '🌞';
      case 'dinner':return '🌙';
      case 'snack':return '🍎';
      default:return '🍽️';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Meal Plans</h1>
          <p className="text-muted-foreground mt-1">Follow your nutrition plans for optimal results</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="text-right whitespace-nowrap mr-2">
            <p className="text-sm text-muted-foreground">Meals Logged</p>
            <p className="text-2xl font-bold text-orange-400">{mealLogs.length}</p>
          </div>
          {clientProfile && (
            <Button onClick={() => setShowMealPlanForm(true)} className="whitespace-nowrap bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold">
              <Plus className="w-4 h-4 mr-2" /> {clientProfile.trainer_id ? "Add Your Own" : "Create Plan"}
            </Button>
          )}
        </div>
      </div>

      {/* AI Meal Logger */}
      <PhotoMealLogger onMealAnalyzed={async (data) => {
        if (!clientProfile) return;
        
        try {
          const hour = new Date().getHours();
          let meal_type = 'snack';
          if (hour > 5 && hour < 11) meal_type = 'breakfast';
          else if (hour >= 11 && hour < 16) meal_type = 'lunch';
          else if (hour >= 16 && hour < 22) meal_type = 'dinner';
          
          await base44.entities.MealLog.create({
            client_id: clientProfile.id,
            trainer_id: clientProfile.trainer_id,
            date: new Date().toLocaleDateString('sv-SE'),
            meal_type: meal_type,
            meal_name: data.food_description || 'AI Logged Meal',
            calories: data.calories || 0,
            protein_g: data.protein_g || 0,
            carbs_g: data.carbs_g || 0,
            fat_g: data.fat_g || 0,
            notes: `AI Analysis: ${data.food_description || 'No description'}`,
            photo_urls: data.fileUrl ? [data.fileUrl] : []
          });
          queryClient.invalidateQueries({ queryKey: ["mealLogs"] });
          toast.success("Meal saved to your history!");
        } catch (err) {
          console.error("Error saving meal log:", err);
          toast.error("Failed to save meal log.");
        }
      }} />

      {/* Calorie tracker for active plan */}
      {activeMeals.length > 0 &&
      <CalorieTracker
        target={{
          calories: activeMeals[0].calories_target,
          protein_g: activeMeals[0].protein_target_g,
          carbs_g: activeMeals[0].carbs_target_g,
          fat_g: activeMeals[0].fat_target_g
        }} />

      }

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="active">Active Plans</TabsTrigger>
          <TabsTrigger value="calorie-logs">Calorie Logs</TabsTrigger>
          <TabsTrigger value="recipes">Available Recipes</TabsTrigger>
          <TabsTrigger value="history">Meal History</TabsTrigger>
        </TabsList>


        <TabsContent value="active" className="space-y-4">
          {activeMeals.length > 0 ?
          <div className="grid gap-4">
              {activeMeals.map((meal) => {
              // Group meals by day
              const mealsByDay = {};
              (meal.meals || []).forEach((m) => {
                const d = m.day || 1;
                if (!mealsByDay[d]) mealsByDay[d] = [];
                mealsByDay[d].push(m);
              });
              const days = Object.keys(mealsByDay).map(Number).sort((a, b) => a - b);
              return (
                <Card key={meal.id} className="hover:border-primary/40 transition-all bg-card border border-border rounded-3xl">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Apple className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-foreground text-xl font-semibold tracking-tight">{meal.name}</CardTitle>
                          {meal.description &&
                          <p className="text-sm text-muted-foreground mt-1">{meal.description}</p>
                          }
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-900/50 text-emerald-400 border border-emerald-500/30">Active</Badge>
                        {clientProfile && !clientProfile.trainer_id && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => { e.stopPropagation(); deleteMealPlanMutation.mutate(meal.id); }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Macro targets */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      {meal.calories_target &&
                      <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.12)' }}>
                          <Flame className="h-4 w-4 text-red-400" />
                          <div>
                            <p className="text-xs text-muted-foreground">Calories</p>
                            <p className="text-foreground text-sm font-semibold">{meal.calories_target}</p>
                          </div>
                        </div>
                      }
                      {meal.protein_target_g &&
                      <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.12)' }}>
                          <Beef className="h-4 w-4 text-blue-400" />
                          <div>
                            <p className="text-xs text-muted-foreground">Protein</p>
                            <p className="text-foreground text-sm font-semibold">{meal.protein_target_g}g</p>
                          </div>
                        </div>
                      }
                      {meal.carbs_target_g &&
                      <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)' }}>
                          <Wheat className="h-4 w-4 text-amber-400" />
                          <div>
                            <p className="text-xs text-muted-foreground">Carbs</p>
                            <p className="text-foreground text-sm font-semibold">{meal.carbs_target_g}g</p>
                          </div>
                        </div>
                      }
                      {meal.fat_target_g &&
                      <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(234,179,8,0.12)' }}>
                          <Droplet className="h-4 w-4 text-yellow-400" />
                          <div>
                            <p className="text-xs text-muted-foreground">Fat</p>
                            <p className="text-foreground text-sm font-semibold">{meal.fat_target_g}g</p>
                          </div>
                        </div>
                      }
                    </div>

                    {/* All meal days */}
                    {days.length > 0 &&
                    <div className="space-y-2 mt-4">
                        <p className="text-sm font-semibold text-muted-foreground mb-2">Meal Schedule ({days.length} days):</p>
                        {days.map((day) =>
                      <div key={day} className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="px-3 py-2 text-xs font-semibold text-orange-400" style={{ background: 'rgba(255,255,255,0.04)' }}>
                              Day {day}
                            </div>
                            <div className="divide-y divide-white/5">
                              {mealsByDay[day].map((m, idx) =>
                          <div key={idx} className="flex items-center gap-3 px-3 py-2">
                                  {clientProfile && (
                                    <ItemCompletionTracker
                                      clientId={clientProfile.id}
                                      trainerId={meal.trainer_id}
                                      type="meal"
                                      itemId={`D${day}-${m.name || m.meal_type}`}
                                    />
                                  )}
                                  <span className="text-lg">{getMealIcon(m.meal_type)}</span>
                                  <div className="flex-1">
                                    <p className="font-medium text-foreground text-sm">{m.name || m.meal_type}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {m.foods?.length || 0} items
                                      {m.foods?.reduce((sum, f) => sum + (f.calories || 0), 0) > 0 &&
                                ` · ${m.foods.reduce((sum, f) => sum + (f.calories || 0), 0)} cal`}
                                    </p>
                                  </div>
                                  <Button
                              variant="ghost"
                              size="sm"
                              className="text-orange-400 hover:text-orange-300 text-xs"
                              onClick={() => setSelectedMeal(m)}>

                                    View <ChevronRight className="h-3 w-3 ml-1" />
                                  </Button>
                                </div>
                          )}
                            </div>
                          </div>
                      )}
                      </div>
                    }

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {meal.duration_days} day plan
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShoppingListPlan(meal)}
                        className="gap-2 border-border text-muted-foreground hover:text-foreground">

                        <ShoppingCart className="h-4 w-4" />
                        Shopping List
                      </Button>
                    </div>
                  </CardContent>
                </Card>);

            })}
            </div> :

          <Card className="bg-card border border-border rounded-3xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Apple className="h-16 w-16 text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-foreground">No active meal plans</h3>
                <p className="text-muted-foreground mt-2">
                  {clientProfile && !clientProfile.trainer_id 
                    ? "Head to the AI Assistant to generate a personalized meal plan!" 
                    : "Your trainer will assign meal plans to you"}
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
          }
        </TabsContent>

        {/* Calorie Logs Tab - client edits, trainer can view/leave notes */}
        <TabsContent value="calorie-logs" className="space-y-4">
          {calorieLogs.length > 0 ?
          <div className="space-y-4">
              {calorieLogs.map((log) =>
            <Card key={log.id} className="bg-card border border-border rounded-3xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-foreground text-base">{log.log_name || `Week of ${log.week_start}`}</CardTitle>
                        {log.week_start && <p className="text-xs text-muted-foreground">Week starting {log.week_start}</p>}
                      </div>
                      <Button size="sm" variant="outline" className="border-border text-muted-foreground"
                  onClick={() => setEditingCalorieLog(editingCalorieLog?.id === log.id ? null : log)}>
                        {editingCalorieLog?.id === log.id ? 'Close' : 'Edit Log'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editingCalorieLog?.id === log.id ?
                <CalorieLogEditor log={log} onSave={(entries) => {
                  updateCalorieLogMutation.mutate({ id: log.id, data: { entries } });
                  setEditingCalorieLog(null);
                }} /> :

                <div className="space-y-2">
                        {(log.entries || []).slice(0, 5).map((entry, i) =>
                  <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border">
                            <span className="text-muted-foreground w-24 text-xs">{entry.day}</span>
                            <span className="text-foreground flex-1 px-2">{entry.food}</span>
                            <span className="text-orange-400 text-xs">{entry.calories} cal</span>
                          </div>
                  )}
                        {(log.entries || []).length > 5 && <p className="text-xs text-muted-foreground">+{log.entries.length - 5} more entries</p>}
                      </div>
                }
                    {/* Trainer notes section */}
                    {log.trainer_notes &&
                <div className="mt-3 pt-3 border-t border-border p-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                        <p className="text-xs text-green-400 font-semibold mb-1">Trainer Notes</p>
                        <p className="text-sm text-muted-foreground">{log.trainer_notes}</p>
                      </div>
                }
                  </CardContent>
                </Card>
            )}
            </div> :

          <Card className="bg-card border border-border rounded-3xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Flame className="h-12 w-12 text-gray-700 mb-4" />
                <h3 className="text-lg font-medium text-foreground">No calorie logs yet</h3>
                <p className="text-muted-foreground mt-2">Your trainer will create calorie logs for you to fill in</p>
              </CardContent>
            </Card>
          }
        </TabsContent>

        <TabsContent value="recipes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.slice(0, 12).map((recipe) =>
            <Card key={recipe.id} className="hover:border-primary/40 transition-all overflow-hidden bg-card border border-border rounded-3xl">
                {recipe.photo_url &&
              <img
                src={recipe.photo_url}
                alt={recipe.name}
                className="w-full h-40 object-cover" />

              }
                <CardHeader>
                  <CardTitle className="text-base text-foreground">{recipe.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{recipe.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-muted-foreground">Calories:</span>
                      <span className="ml-1 font-medium text-foreground">{recipe.calories_per_serving}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Protein:</span>
                      <span className="ml-1 font-medium text-foreground">{recipe.protein_per_serving}g</span>
                    </div>
                    <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                      {recipe.category}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {mealLogs.length > 0 ?
          <div className="space-y-3">
              {mealLogs.map((log) =>
            <Card key={log.id} className="bg-card border border-border rounded-3xl overflow-hidden">
                  {log.photo_urls && log.photo_urls.length > 0 && (
                    <img src={log.photo_urls[0]} alt="Meal" className="w-full h-48 object-cover" />
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                          <span className="text-xl">{getMealIcon(log.meal_type)}</span>
                        </div>
                        <div>
                          <CardTitle className="text-base text-foreground">
                            {log.meal_name || format(new Date(log.date), 'EEEE, MMMM d, yyyy')}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground capitalize">{log.meal_type} • {format(new Date(log.date), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(log.calories > 0 || log.protein_g > 0) && (
                      <div className="flex flex-wrap gap-2">
                        {log.calories > 0 && <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20">{log.calories} cal</Badge>}
                        {log.protein_g > 0 && <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">{log.protein_g}g Pro</Badge>}
                        {log.carbs_g > 0 && <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">{log.carbs_g}g Carb</Badge>}
                        {log.fat_g > 0 && <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">{log.fat_g}g Fat</Badge>}
                      </div>
                    )}
                    {log.notes && <p className="text-sm text-muted-foreground">{log.notes}</p>}
                    {log.trainer_feedback && (
                      <div className="mt-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-xs font-semibold text-emerald-400 mb-1">Trainer Feedback</p>
                        <p className="text-sm text-emerald-100">{log.trainer_feedback}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
            )}
            </div> :

          <Card className="bg-card border border-border rounded-3xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-16 w-16 text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-foreground">No meal history</h3>
                <p className="text-muted-foreground mt-2">Start logging meals to see them here</p>
              </CardContent>
            </Card>
          }
        </TabsContent>
      </Tabs>

      {/* Meal Detail Dialog */}
      <Dialog open={!!selectedMeal} onOpenChange={() => setSelectedMeal(null)}>
        <DialogContent className="max-w-2xl bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{selectedMeal?.name}</DialogTitle>
          </DialogHeader>
          {selectedMeal &&
          <div className="space-y-4">
              {selectedMeal.foods && selectedMeal.foods.length > 0 &&
            <div>
                  <h3 className="font-medium text-muted-foreground mb-2">Ingredients:</h3>
                  <div className="space-y-2">
                    {selectedMeal.foods.map((food, idx) =>
                <div key={idx} className="flex items-center justify-between p-2 bg-secondary rounded border border-border">
                        <span className="text-sm text-foreground">{food.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {food.amount} {food.unit} • {food.calories} cal
                        </span>
                      </div>
                )}
                  </div>
                </div>
            }
              {selectedMeal.instructions &&
            <div>
                  <h3 className="font-medium text-muted-foreground mb-2">Instructions:</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedMeal.instructions}
                  </p>
                </div>
            }
            </div>
          }
        </DialogContent>
      </Dialog>

      {/* Meal Plan Form — solo users create plans; coached clients add their own
          on top of what their trainer assigns (synced to the trainer). */}
      {clientProfile && (
        <MealPlanForm
          open={showMealPlanForm}
          onOpenChange={setShowMealPlanForm}
          clients={[clientProfile]}
          simpleMode={true}
          onSubmit={(data) => {
            createMealPlanMutation.mutate({
              ...data,
              client_id: clientProfile.id,
              trainer_id: clientProfile.trainer_id || null,
              self_added: !!clientProfile.trainer_id,
            });
            setShowMealPlanForm(false);
          }}
        />
      )}

      {/* Shopping List View */}
      {shoppingListPlan &&
      <ShoppingListView
        mealPlanId={shoppingListPlan.id}
        mealPlanName={shoppingListPlan.name}
        onOpenChange={(open) => !open && setShoppingListPlan(null)} />

      }
    </div>);

}