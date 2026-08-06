import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, ChefHat, Clock, Users, Flame, Edit, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import AIRecipeGenerator from "@/components/ai/AIRecipeGenerator";

export default function Recipes() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "lunch",
    prep_time_minutes: "",
    cook_time_minutes: "",
    servings: "",
    ingredients: "",
    instructions: "",
    calories_per_serving: "",
    protein_per_serving: "",
    carbs_per_serving: "",
    fat_per_serving: "",
    tags: ""
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => base44.entities.Recipe.list(),
    enabled: true, // always enabled since global
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Recipe.create({
      ...data,
      // NO trainer_id – recipes are global / shared across all trainers
      ingredients: data.ingredients.split('\n').filter(i => i.trim()).map(i => {
        const parts = i.split(',').map(p => p.trim());
        return {
          name: parts[0] || '',
          amount: parseFloat(parts[1]) || 0,
          unit: parts[2] || ''
        };
      }),
      tags: data.tags ? data.tags.split(',').map(t => t.trim()) : []
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setFormOpen(false);
      resetForm();
      toast.success("Recipe created successfully");
    },
    onError: (error) => {
      console.error("Create failed:", error);
      toast.error("Failed to create recipe");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Recipe.update(id, {
      ...data,
      ingredients: typeof data.ingredients === 'string'
        ? data.ingredients.split('\n').filter(i => i.trim()).map(i => {
            const parts = i.split(',').map(p => p.trim());
            return { name: parts[0] || '', amount: parseFloat(parts[1]) || 0, unit: parts[2] || '' };
          })
        : data.ingredients,
      tags: typeof data.tags === 'string' ? data.tags.split(',').map(t => t.trim()) : data.tags
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setFormOpen(false);
      setEditingRecipe(null);
      resetForm();
      toast.success("Recipe updated successfully");
    },
    onError: (error) => {
      console.error("Update failed:", error);
      toast.error("Failed to update recipe");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Recipe.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success("Recipe deleted successfully");
    },
    onError: (error) => {
      console.error("Delete failed:", error);
      toast.error("Failed to delete recipe");
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "lunch",
      prep_time_minutes: "",
      cook_time_minutes: "",
      servings: "",
      ingredients: "",
      instructions: "",
      calories_per_serving: "",
      protein_per_serving: "",
      carbs_per_serving: "",
      fat_per_serving: "",
      tags: ""
    });
  };

  const handleEdit = (recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      name: recipe.name,
      description: recipe.description || "",
      category: recipe.category,
      prep_time_minutes: recipe.prep_time_minutes || "",
      cook_time_minutes: recipe.cook_time_minutes || "",
      servings: recipe.servings || "",
      ingredients: recipe.ingredients?.map(i => `${i.name}, ${i.amount}, ${i.unit}`).join('\n') || "",
      instructions: recipe.instructions || "",
      calories_per_serving: recipe.calories_per_serving || "",
      protein_per_serving: recipe.protein_per_serving || "",
      carbs_per_serving: recipe.carbs_per_serving || "",
      fat_per_serving: recipe.fat_per_serving || "",
      tags: recipe.tags?.join(', ') || ""
    });
    setFormOpen(true);
  };

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || recipe.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Recipe Library</h1>
          <p className="text-slate-600 mt-1">Manage healthy recipes for your clients</p>
        </div>
        <div className="flex gap-2">
          <AIRecipeGenerator onRecipeGenerated={() => queryClient.invalidateQueries({ queryKey: ['recipes'] })} />
          <Button 
            onClick={() => { resetForm(); setFormOpen(true); }} 
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Recipe
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="breakfast">Breakfast</SelectItem>
            <SelectItem value="lunch">Lunch</SelectItem>
            <SelectItem value="dinner">Dinner</SelectItem>
            <SelectItem value="snack">Snack</SelectItem>
            <SelectItem value="dessert">Dessert</SelectItem>
            <SelectItem value="smoothie">Smoothie</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredRecipes.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <ChefHat className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No recipes found</h3>
            <p className="text-slate-500 mt-2">
              {searchTerm || categoryFilter !== "all" 
                ? "Try adjusting your search or filter" 
                : "Create your first recipe to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <ChefHat className="w-5 h-5 text-emerald-600" />
                      {recipe.name}
                    </CardTitle>
                    {recipe.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {recipe.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(recipe)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this recipe?")) {
                          deleteMutation.mutate(recipe.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Badge className="capitalize">{recipe.category}</Badge>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {recipe.prep_time_minutes && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-4 h-4" />
                        {recipe.prep_time_minutes}m
                      </div>
                    )}
                    {recipe.servings && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <Users className="w-4 h-4" />
                        {recipe.servings}
                      </div>
                    )}
                    {recipe.calories_per_serving && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <Flame className="w-4 h-4" />
                        {recipe.calories_per_serving} cal
                      </div>
                    )}
                  </div>

                  {(recipe.protein_per_serving || recipe.carbs_per_serving || recipe.fat_per_serving) && (
                    <div className="pt-3 border-t space-y-1">
                      <div className="text-xs text-slate-500 font-medium">Macros per Serving</div>
                      <div className="flex flex-wrap gap-3 text-sm">
                        {recipe.protein_per_serving && (
                          <div><span className="font-semibold">{recipe.protein_per_serving}g</span> protein</div>
                        )}
                        {recipe.carbs_per_serving && (
                          <div><span className="font-semibold">{recipe.carbs_per_serving}g</span> carbs</div>
                        )}
                        {recipe.fat_per_serving && (
                          <div><span className="font-semibold">{recipe.fat_per_serving}g</span> fat</div>
                        )}
                      </div>
                    </div>
                  )}

                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {(recipe.tags || []).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecipe ? 'Edit Recipe' : 'Create Recipe'}</DialogTitle>
          </DialogHeader>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (editingRecipe) {
                updateMutation.mutate({ id: editingRecipe.id, data: formData });
              } else {
                createMutation.mutate(formData);
              }
            }} 
            className="space-y-4 mt-4"
          >
            <div>
              <Label htmlFor="name">Recipe Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                    <SelectItem value="dessert">Dessert</SelectItem>
                    <SelectItem value="smoothie">Smoothie</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="servings">Servings</Label>
                <Input
                  id="servings"
                  type="number"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) || "" })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prep_time_minutes">Prep Time (minutes)</Label>
                <Input
                  id="prep_time_minutes"
                  type="number"
                  value={formData.prep_time_minutes}
                  onChange={(e) => setFormData({ ...formData, prep_time_minutes: parseInt(e.target.value) || "" })}
                />
              </div>

              <div>
                <Label htmlFor="cook_time_minutes">Cook Time (minutes)</Label>
                <Input
                  id="cook_time_minutes"
                  type="number"
                  value={formData.cook_time_minutes}
                  onChange={(e) => setFormData({ ...formData, cook_time_minutes: parseInt(e.target.value) || "" })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ingredients">Ingredients (one per line: name, amount, unit)</Label>
              <Textarea
                id="ingredients"
                value={formData.ingredients}
                onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                placeholder="Chicken breast, 200, grams\nOlive oil, 1, tbsp\n..."
                rows={6}
              />
            </div>

            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                rows={8}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="calories_per_serving">Calories</Label>
                <Input
                  id="calories_per_serving"
                  type="number"
                  value={formData.calories_per_serving}
                  onChange={(e) => setFormData({ ...formData, calories_per_serving: parseInt(e.target.value) || "" })}
                />
              </div>
              <div>
                <Label htmlFor="protein_per_serving">Protein (g)</Label>
                <Input
                  id="protein_per_serving"
                  type="number"
                  value={formData.protein_per_serving}
                  onChange={(e) => setFormData({ ...formData, protein_per_serving: parseInt(e.target.value) || "" })}
                />
              </div>
              <div>
                <Label htmlFor="carbs_per_serving">Carbs (g)</Label>
                <Input
                  id="carbs_per_serving"
                  type="number"
                  value={formData.carbs_per_serving}
                  onChange={(e) => setFormData({ ...formData, carbs_per_serving: parseInt(e.target.value) || "" })}
                />
              </div>
              <div>
                <Label htmlFor="fat_per_serving">Fat (g)</Label>
                <Input
                  id="fat_per_serving"
                  type="number"
                  value={formData.fat_per_serving}
                  onChange={(e) => setFormData({ ...formData, fat_per_serving: parseInt(e.target.value) || "" })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="vegan, gluten-free, high-protein, quick"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-gradient-to-r from-emerald-500 to-teal-600"
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : (editingRecipe ? 'Update' : 'Create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}