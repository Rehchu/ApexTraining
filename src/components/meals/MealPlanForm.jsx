import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Apple, Plus, Trash2, Loader2, Search, ChevronDown } from "lucide-react";
import { showSuccess } from "@/components/ui/success-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function MealPlanForm({ open, onOpenChange, plan, clients, onSubmit, simpleMode = false }) {
  const [formData, setFormData] = useState(plan || {
    name: "",
    description: "",
    client_id: "",
    duration_days: 28,
    calories_target: 2000,
    protein_target_g: 150,
    carbs_target_g: 200,
    fat_target_g: 65,
    status: "draft",
    daily_meals: {} // { "1": { breakfast: { foods: [] }, lunch: {...} }, "2": {...} }
  });

  const getMealsForDay = (dayNum) => {
    return formData.daily_meals?.[dayNum] || {};
  };

  const getMealsForDayAndType = (dayNum, mealType) => {
    return formData.daily_meals?.[dayNum]?.[mealType] || { foods: [] };
  };
  const [isLoading, setIsLoading] = useState(false);
  const [foodSearch, setFoodSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeMealType, setActiveMealType] = useState(null);
  const [selectedFoodToAdd, setSelectedFoodToAdd] = useState(null);
  const [selectedMealTypeForFood, setSelectedMealTypeForFood] = useState(null);
  const [foodAmount, setFoodAmount] = useState(1);
  const [expandedDays, setExpandedDays] = useState({ 1: true });

  useEffect(() => {
    if (plan) {
      // Convert existing meals array back to daily_meals structure for editing
      const daily_meals = {};
      if (plan.meals && Array.isArray(plan.meals)) {
        plan.meals.forEach(meal => {
          const day = meal.day || 1;
          const mealType = meal.meal_type || 'snack';
          if (!daily_meals[day]) daily_meals[day] = {};
          if (!daily_meals[day][mealType]) daily_meals[day][mealType] = { foods: [] };
          daily_meals[day][mealType].foods = meal.foods || [];
        });
      }
      setFormData({
        name: "",
        description: "",
        client_id: "",
        duration_days: 28,
        calories_target: 2000,
        protein_target_g: 150,
        carbs_target_g: 200,
        fat_target_g: 65,
        status: "active",
        ...plan,
        daily_meals: Object.keys(daily_meals).length > 0 ? daily_meals : (plan.daily_meals || {})
      });
    } else {
      setFormData({
        name: "",
        description: "",
        client_id: "",
        duration_days: 28,
        calories_target: 2000,
        protein_target_g: 150,
        carbs_target_g: 200,
        fat_target_g: 65,
        status: "active",
        circadian_timing: true,
        daily_meals: {}
      });
    }
  }, [plan, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Convert daily_meals object to meals array for storage
      const meals = [];
      Object.entries(formData.daily_meals || {}).forEach(([dayNum, dayMeals]) => {
        Object.entries(dayMeals || {}).forEach(([mealType, mealData]) => {
          if (mealData.foods?.length > 0) {
            meals.push({
              day: parseInt(dayNum),
              meal_type: mealType,
              name: mealType,
              foods: mealData.foods
            });
          }
        });
      });
      
      const selectedClient = clients?.find(c => c.id === formData.client_id || c.user_id === formData.client_id);
      const clientIdToSave = selectedClient ? (selectedClient.user_id || selectedClient.id) : formData.client_id;

      const submitData = {
        ...formData,
        client_id: clientIdToSave,
        meals,
        daily_meals: undefined
      };
      await onSubmit(submitData);
      showSuccess(plan ? "Meal Plan Updated!" : "Meal Plan Created!", plan ? "Changes saved successfully" : "New meal plan is ready");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };



  const searchFoods = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data } = await base44.functions.invoke('searchFoods', { query, pageSize: 10 });
      if (data?.foods && Array.isArray(data.foods)) {
        setSearchResults(data.foods);
      } else if (Array.isArray(data)) {
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching foods:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addFoodToMeal = (dayNum, mealType, food) => {
    const selectedAmount = food.serving_size || 1;
    const multiplier = selectedAmount;

    const newFood = {
      fdc_id: String(food.fdc_id),
      name: food.name,
      amount: selectedAmount,
      unit: food.serving_unit || "serving",
      calories: Math.round(food.calories * multiplier),
      protein: Math.round(food.protein * multiplier * 10) / 10,
      carbs: Math.round(food.carbs * multiplier * 10) / 10,
      fat: Math.round(food.fat * multiplier * 10) / 10,
      original_calories: Math.round(food.calories),
      original_protein: Math.round(food.protein * 10) / 10,
      original_carbs: Math.round(food.carbs * 10) / 10,
      original_fat: Math.round(food.fat * 10) / 10,
      original_amount: 1
    };

    setFormData(prev => {
      const newDailyMeals = { ...prev.daily_meals };
      if (!newDailyMeals[dayNum]) newDailyMeals[dayNum] = {};
      if (!newDailyMeals[dayNum][mealType]) newDailyMeals[dayNum][mealType] = { foods: [] };
      
      newDailyMeals[dayNum][mealType] = {
        ...newDailyMeals[dayNum][mealType],
        foods: [...newDailyMeals[dayNum][mealType].foods, newFood]
      };

      return { ...prev, daily_meals: newDailyMeals };
    });
    setSearchResults([]);
    setFoodSearch("");
    setActiveMealType(null);
  };

  const removeFoodFromMeal = (dayNum, mealType, foodIndex) => {
    setFormData(prev => {
      const newDailyMeals = { ...prev.daily_meals };
      if (newDailyMeals[dayNum]?.[mealType]) {
        newDailyMeals[dayNum][mealType] = {
          ...newDailyMeals[dayNum][mealType],
          foods: newDailyMeals[dayNum][mealType].foods.filter((_, i) => i !== foodIndex)
        };
      }
      return { ...prev, daily_meals: newDailyMeals };
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border text-foreground" aria-describedby="meal-form-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-foreground" id="meal-form-desc">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Apple className="w-5 h-5 text-foreground" />
              </div>
              {plan ? "Edit Meal Plan" : "Create Meal Plan"}
            </DialogTitle>
          </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name" className="text-muted-foreground">Plan Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Balanced Nutrition Plan"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="input-frosted text-foreground"
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description" className="text-muted-foreground">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the meal plan..."
                className="min-h-[60px] input-frosted text-foreground"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>

            {!simpleMode && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Assign to Client</Label>
              <ResponsiveSelect
                value={clients?.find(c => c.id === formData.client_id || c.user_id === formData.client_id)?.id || formData.client_id || "none"}
                onValueChange={(v) => handleChange("client_id", v === "none" ? "" : v)}
                placeholder="Select client (optional)"
                title="Select client"
                options={[
                  { label: "Unassigned", value: "none" },
                  ...(clients?.map(client => ({ label: client.full_name, value: client.id })) || [])
                ]}
              />
            </div>
            )}

            {!simpleMode && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger className="input-frosted text-foreground">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            )}

            <div className="space-y-2">
               <Label htmlFor="duration_days" className="text-muted-foreground">Duration (days)</Label>
               <Input
                 id="duration_days"
                 type="number"
                 min="1"
                 value={formData.duration_days}
                 onChange={(e) => handleChange("duration_days", parseInt(e.target.value))}
                 className="input-frosted text-foreground"
               />
              </div>

            <div className="space-y-2">
              <Label htmlFor="calories_target" className="text-muted-foreground">Daily Calories</Label>
              <Input
                id="calories_target"
                type="number"
                min="0"
                placeholder="2000"
                value={formData.calories_target}
                onChange={(e) => handleChange("calories_target", parseInt(e.target.value))}
                className="input-frosted text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="protein_target_g" className="text-muted-foreground">Protein (g)</Label>
              <Input
                id="protein_target_g"
                type="number"
                min="0"
                placeholder="150"
                value={formData.protein_target_g}
                onChange={(e) => handleChange("protein_target_g", parseInt(e.target.value))}
                className="input-frosted text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="carbs_target_g" className="text-muted-foreground">Carbs (g)</Label>
              <Input
                id="carbs_target_g"
                type="number"
                min="0"
                placeholder="200"
                value={formData.carbs_target_g}
                onChange={(e) => handleChange("carbs_target_g", parseInt(e.target.value))}
                className="input-frosted text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fat_target_g" className="text-muted-foreground">Fat (g)</Label>
              <Input
                id="fat_target_g"
                type="number"
                min="0"
                placeholder="65"
                value={formData.fat_target_g}
                onChange={(e) => handleChange("fat_target_g", parseInt(e.target.value))}
                className="input-frosted text-foreground"
              />
            </div>

            {!simpleMode && (
            <div className="space-y-2 sm:col-span-2 pt-2 pb-2">
               <div className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                 <div>
                   <Label className="text-orange-500 font-bold block mb-1">Circadian Nutritional Timing</Label>
                   <p className="text-xs text-muted-foreground">AI predicts precise eating windows mapped to workout schedules and metabolic circadian rhythms. Integrates directly into client's daily schedule.</p>
                 </div>
                 <button
                   type="button"
                   onClick={() => handleChange("circadian_timing", !formData.circadian_timing)}
                   className={`w-12 h-6 rounded-full transition-colors relative ${formData.circadian_timing ? 'bg-orange-500' : 'bg-gray-400'}`}
                 >
                   <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${formData.circadian_timing ? 'translate-x-7' : 'translate-x-1'}`} />
                 </button>
               </div>
             </div>
            )}

          </div>

          {/* Meals Section - Per Day */}
          <div className="space-y-3">
            <Label className="text-base text-foreground">Daily Meals</Label>

            {Array.from({ length: Math.min(31, formData.duration_days || 28) }).map((_, dayIdx) => {
              const dayNum = dayIdx + 1;
              const dayMeals = getMealsForDay(dayNum);
              const totalFoods = ["breakfast","lunch","dinner","snack"].reduce((acc, t) => acc + (dayMeals[t]?.foods?.length || 0), 0);
              const isOpen = !!expandedDays[dayNum];

              return (
                <Collapsible key={dayNum} open={isOpen} onOpenChange={(open) => setExpandedDays(prev => ({ ...prev, [dayNum]: open }))}>
                  <div className="rounded-xl border border-border overflow-hidden bg-secondary">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 bg-secondary cursor-pointer hover:bg-accent transition-colors">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          <span className="font-semibold text-foreground">Day {dayNum}</span>
                          {totalFoods > 0 && (
                            <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30">{totalFoods} food{totalFoods !== 1 ? "s" : ""}</span>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedDays(prev => ({ ...prev, [dayNum]: true }));
                            setActiveMealType(`${dayNum}-breakfast`);
                          }}
                          className="gap-1 h-7 text-xs bg-secondary border-border text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
                        >
                          <Plus className="w-3 h-3" /> Add Food
                        </Button>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                  <div className="p-3 space-y-3">

                  {["breakfast", "lunch", "dinner", "snack"].map((mealType) => {
                    const mealData = dayMeals[mealType] || { foods: [] };
                    const foods = mealData.foods || [];

                    return (
                      <div key={`${dayNum}-${mealType}`} className="p-3 bg-secondary rounded-lg border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground capitalize">{mealType}</span>
                          <Popover 
                            open={activeMealType === `${dayNum}-${mealType}`} 
                            onOpenChange={(open) => setActiveMealType(open ? `${dayNum}-${mealType}` : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1 border-orange-200 text-orange-600 hover:bg-orange-50">
                                <Plus className="w-3 h-3" /> Add Food
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0 bg-card border-border" align="end">
                              <div className="p-3 border-b border-border">
                                <Input
                                  placeholder="Search foods..."
                                  value={foodSearch}
                                  onChange={(e) => { setFoodSearch(e.target.value); searchFoods(e.target.value); }}
                                  autoFocus
                                  className="text-xs input-frosted text-foreground"
                                />
                              </div>
                              <div className="max-h-64 overflow-y-auto">
                                {isSearching ? (
                                  <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
                                ) : searchResults.length > 0 ? (
                                  searchResults.map((food, i) => (
                                    <button key={i} type="button" className="w-full px-3 py-2 text-left hover:bg-accent border-b border-border last:border-0 text-foreground transition-colors"
                                      onClick={() => { setSelectedFoodToAdd(food); setSelectedMealTypeForFood({ dayNum, mealType }); setFoodAmount(1); }}>
                                      <div className="font-medium text-xs text-foreground">{food.name}</div>
                                      <div className="text-xs text-muted-foreground mt-1">{food.calories}cal • P:{food.protein}g C:{food.carbs}g F:{food.fat}g</div>
                                    </button>
                                  ))
                                ) : null}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Foods in this meal */}
                        <div className="space-y-2">
                          {foods.map((food, foodIndex) => (
                            <div key={foodIndex} className="p-2 bg-secondary rounded border border-border text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-foreground">{food.name}</div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeFoodFromMeal(dayNum, mealType, foodIndex)}
                                  className="h-5 w-5"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="text-muted-foreground">
                                {food.calories}cal • P:{food.protein}g C:{food.carbs}g F:{food.fat}g
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Qty:</span>
                                <Input
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  value={food.amount}
                                  onChange={(e) => {
                                    const newAmount = parseFloat(e.target.value) || 0;
                                    setFormData(prev => {
                                      const newDailyMeals = { ...prev.daily_meals };
                                      newDailyMeals[dayNum][mealType].foods[foodIndex] = {
                                        ...newDailyMeals[dayNum][mealType].foods[foodIndex],
                                        amount: newAmount,
                                        calories: Math.round(food.original_calories * newAmount),
                                        protein: Math.round(food.original_protein * newAmount * 10) / 10,
                                        carbs: Math.round(food.original_carbs * newAmount * 10) / 10,
                                        fat: Math.round(food.original_fat * newAmount * 10) / 10,
                                      };
                                      return { ...prev, daily_meals: newDailyMeals };
                                    });
                                  }}
                                  className="w-12 h-7 text-xs input-frosted text-foreground"
                                />
                              </div>
                            </div>
                          ))}
                        </div>


                      </div>
                    );
                    })}
                        </div>
                      </CollapsibleContent>
                    </div>
                    </Collapsible>
                    );
                    })}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-secondary border-border text-foreground hover:bg-accent hover:text-foreground">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-foreground border-0"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {plan ? "Update Plan" : "Create Plan"}
            </Button>
          </div>
        </form>
        </DialogContent>
      </Dialog>

      {/* Serving Size Dialog */}
      {selectedFoodToAdd && selectedMealTypeForFood && (
        <Dialog open={!!selectedFoodToAdd} onOpenChange={(open) => {
          if (!open) {
            setSelectedFoodToAdd(null);
            setSelectedMealTypeForFood(null);
          }
        }}>
          <DialogContent className="sm:max-w-sm bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground">Select Quantity</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-sm mb-2 text-foreground">{selectedFoodToAdd.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedFoodToAdd.calories}cal • P:{selectedFoodToAdd.protein}g C:{selectedFoodToAdd.carbs}g F:{selectedFoodToAdd.fat}g per {selectedFoodToAdd.serving_size || 100}{selectedFoodToAdd.serving_unit || "g"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-muted-foreground">Amount (Qty)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={foodAmount}
                  onChange={(e) => setFoodAmount(parseFloat(e.target.value) || 1)}
                  className="input-frosted text-foreground"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setSelectedFoodToAdd(null)}
                  className="bg-secondary border-border text-foreground hover:bg-accent"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    addFoodToMeal(selectedMealTypeForFood.dayNum, selectedMealTypeForFood.mealType, {
                      ...selectedFoodToAdd,
                      serving_size: foodAmount
                    });
                    setSelectedFoodToAdd(null);
                    setSelectedMealTypeForFood(null);
                  }}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                >
                  Add to {selectedMealTypeForFood.mealType}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}