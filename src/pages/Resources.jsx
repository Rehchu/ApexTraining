import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter } from
"@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, BookOpen, Search, Edit, Trash2, MoreVertical, Users, Upload, Loader2, ExternalLink, Send, ChefHat, Clock, Flame, Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import QuickAddResources from "@/components/resources/QuickAddResources";
import SearchSources from "@/components/resources/SearchSources";
import RecipeImporter from "@/components/resources/RecipeImporter";
import NASMExerciseLibrary from "@/components/resources/NASMExerciseLibrary";
import { toast } from "sonner";

const categoryColors = {
  workout: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  nutrition: "bg-green-500/10 text-green-400 border border-green-500/20",
  medical: "bg-red-500/10 text-red-400 border border-red-500/20",
  general: "bg-secondary text-muted-foreground border border-border",
  motivation: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
};

export default function Resources() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [deleteResource, setDeleteResource] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingResource, setViewingResource] = useState(null);
  const [sendingResource, setSendingResource] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [viewingRecipe, setViewingRecipe] = useState(null);
  const [addingRecipeToClient, setAddingRecipeToClient] = useState(null);
  const [selectedMealPlanId, setSelectedMealPlanId] = useState("");
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedMealType, setSelectedMealType] = useState("lunch");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    category: "general",
    file_urls: [],
    video_url: "",
    video_file_url: "",
    shared_with: [],
    source_url: "",
    source_name: ""
  });

  const { data: resources = [] } = useQuery({
    queryKey: ["resources"],
    queryFn: () => base44.entities.Resource.list("-created_date")
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.list("-created_date")
  });

  const { data: curatedRecipes = [] } = useQuery({
    queryKey: ["curatedRecipes"],
    queryFn: async () => {
      if (categoryFilter !== "nutrition") return [];
      const { data } = await base44.functions.invoke('getCuratedRecipes', {});
      return data.recipes || [];
    },
    enabled: categoryFilter === "nutrition"
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: () => base44.entities.Client.filter({ trainer_id: user?.id }),
    enabled: !!user
  });

  const { data: mealPlans = [] } = useQuery({
    queryKey: ["mealPlans", selectedClientId],
    queryFn: () => base44.entities.MealPlan.filter({ client_id: selectedClientId }),
    enabled: !!selectedClientId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Resource.create({ ...data, trainer_id: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      setShowForm(false);
      resetForm();
      toast.success("Resource created");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Resource.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      setShowForm(false);
      resetForm();
      toast.success("Resource updated");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Resource.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      setDeleteResource(null);
      toast.success("Resource deleted");
    }
  });

  const sendResourceMutation = useMutation({
    mutationFn: async ({ resource, clientId }) => {
      const response = await base44.functions.invoke("sendResourceEmail", {
        resourceId: resource.id,
        clientId: clientId
      });
      if (response.data?.error) throw new Error(response.data.error);
    },
    onSuccess: () => {
      toast.success("Resource emailed to client successfully!");
      setSendingResource(null);
      setSelectedClientId("");
    },
    onError: () => {
      toast.error("Failed to send resource to client.");
    }
  });

  const generatePTFormsMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke("generatePTForms", {});
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Standard PT Forms generated successfully!");
    },
    onError: () => {
      toast.error("Failed to generate forms.");
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      content: "",
      category: "general",
      file_urls: [],
      video_url: "",
      video_file_url: "",
      shared_with: [],
      source_url: "",
      source_name: ""
    });
    setEditingResource(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingResource) {
      updateMutation.mutate({ id: editingResource.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (resource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description || "",
      content: resource.content,
      category: resource.category,
      file_urls: resource.file_urls || [],
      video_url: resource.video_url || "",
      video_file_url: resource.video_file_url || "",
      shared_with: resource.shared_with || [],
      source_url: resource.source_url || "",
      source_name: resource.source_name || ""
    });
    setShowForm(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      setFormData((prev) => ({
        ...prev,
        file_urls: [...prev.file_urls, data.file_url]
      }));
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error("File upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index) => {
    setFormData((prev) => ({
      ...prev,
      file_urls: prev.file_urls.filter((_, i) => i !== index)
    }));
  };

  const toggleClient = (clientId) => {
    setFormData((prev) => ({
      ...prev,
      shared_with: prev.shared_with.includes(clientId) ?
      prev.shared_with.filter((id) => id !== clientId) :
      [...prev.shared_with, clientId]
    }));
  };

  const filteredResources = resources.filter((resource) => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resource.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || resource.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const allRecipes = categoryFilter === "nutrition" ? [...recipes, ...curatedRecipes] : recipes;

  const filteredRecipes = allRecipes.filter((recipe) => {
    const matchesSearch = recipe.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch && (categoryFilter === "all" || categoryFilter === "nutrition");
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-bold sm:text-3xl">Resources</h1>
          <p className="text-foreground mt-1">Educational content & forms for your clients</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => generatePTFormsMutation.mutate()}
            disabled={generatePTFormsMutation.isPending}
            className="border-border text-foreground bg-secondary hover:bg-accent"
          >
            {generatePTFormsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            Generate PT Forms
          </Button>
          <Button
            onClick={() => {resetForm();setShowForm(true);}}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">

            <Plus className="w-4 h-4 mr-2" />
            Create Custom
          </Button>
        </div>
      </div>

      {/* Featured Resources */}
      <div className="glass-card rounded-2xl p-6 border-green-500/20">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-green-500 rounded-full"></div>
          Professional Development Resources
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
          { title: "Build Your Brand", url: "https://www.ideafit.com/wp-content/uploads/2025/03/Building-your-Brand-as-a-Fitness-Professional.pdf" },
          { title: "Client Retention", url: "https://www.ideafit.com/wp-content/uploads/2025/03/Client-Retention-Plan.pdf" },
          { title: "Career Path", url: "https://www.ideafit.com/wp-content/uploads/2025/03/Fitness-Career-Path.pdf" },
          { title: "Career Development", url: "https://www.ideafit.com/wp-content/uploads/2025/03/IDEA-Form-CareerDev.pdf" },
          { title: "Target Market", url: "https://www.ideafit.com/wp-content/uploads/2025/03/Target-Customer-Worksheet.pdf" }].
          map((resource, idx) =>
          <a
            key={idx}
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-secondary p-4 rounded-xl hover:bg-accent transition-all border border-border hover:border-green-500/30 group text-foreground">

              <p className="font-medium text-sm text-foreground mb-2 group-hover:text-green-400 transition-colors">{resource.title}</p>
              <Button size="sm" variant="outline" className="w-full text-xs gap-1 pointer-events-none">
                <Download className="w-3 h-3" />
                Download
              </Button>
            </a>
          )}
        </div>
      </div>



      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch mb-8">
        <QuickAddResources
          trainerId={user?.id}
          onAdd={() => queryClient.invalidateQueries({ queryKey: ["resources"] })} />

        <RecipeImporter
          onImportComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["recipes"] });
            toast.success("Recipe imported and list updated!");
          }} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            className="pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} />

        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] bg-secondary border-border text-foreground">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="workout">Workout</SelectItem>
            <SelectItem value="nutrition">Nutrition</SelectItem>
            <SelectItem value="medical">Medical</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="motivation">Motivation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Recipes Section */}
      {filteredRecipes.length > 0 &&
      <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <div className="w-1.5 h-5 bg-green-500 rounded-full"></div>
            Recipes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecipes.map((recipe, idx) =>
          <Card
            key={recipe.id || idx}
            className="hover: transition-all cursor-pointer glass-card"
            onClick={() => setViewingRecipe(recipe)}>

                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 mb-2 capitalize">
                        {recipe.category || "nutrition"}
                      </Badge>
                      <CardTitle className="text-base text-foreground truncate">{recipe.name}</CardTitle>
                      {recipe.description &&
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{recipe.description}</p>
                  }
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2 text-xs text-muted-foreground font-medium">
                    {recipe.prep_time_minutes &&
                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-purple-400" /> {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)}m</span>
                }
                    {recipe.servings && <span className="flex items-center gap-1"><Users className="w-3 h-3 text-yellow-500" /> {recipe.servings} servings</span>}
                  </div>
                  {recipe.calories_per_serving &&
              <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs border-border bg-secondary text-muted-foreground">{recipe.calories_per_serving} cal</Badge>
                      {recipe.protein_per_serving &&
                <Badge variant="outline" className="text-xs border-border bg-secondary text-muted-foreground">{recipe.protein_per_serving}g protein</Badge>
                }
                    </div>
              }
                  {recipe.tags && recipe.tags.length > 0 &&
              <div className="flex flex-wrap gap-1">
                      {recipe.tags.slice(0, 3).map((tag, tagIdx) =>
                <Badge key={tagIdx} variant="secondary" className="text-xs bg-secondary text-muted-foreground border-none">
                          {tag}
                        </Badge>
                )}
                    </div>
              }
                </CardContent>
              </Card>
          )}
          </div>
        </div>
      }

      {/* NASM Exercise Library */}
      {categoryFilter === "workout" && (
        <div className="glass-card rounded-2xl p-6 border border-border mb-8">
          <NASMExerciseLibrary />
        </div>
      )}

      {/* Resources Grid */}
      {filteredResources.length > 0 &&
      <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <div className="w-1.5 h-5 bg-green-500 rounded-full"></div>
            Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((resource) =>
          <Card
            key={resource.id}
            className="hover: transition-all cursor-pointer glass-card"
            onClick={() => setViewingResource(resource)}>

                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Badge className={cn("mb-2", categoryColors[resource.category] || "bg-secondary text-foreground border border-border")}>
                        {resource.category}
                      </Badge>
                      <CardTitle className="text-base text-foreground truncate">{resource.title}</CardTitle>
                      {resource.description &&
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{resource.description}</p>
                  }
                    </div>
                    {(user?.role === 'admin' || resource.trainer_id === user?.id) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
                          <DropdownMenuItem onClick={(e) => {e.stopPropagation();handleEdit(resource);}} className="hover:bg-accent focus:bg-secondary cursor-pointer">
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                        onClick={(e) => {e.stopPropagation();setDeleteResource(resource);}}
                        className="text-red-500 focus:text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer">

                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {(resource.video_url || resource.video_file_url) &&
              <div className="mb-3 bg-card rounded-lg overflow-hidden aspect-video flex items-center justify-center border border-border">
                      {resource.video_file_url ?
                <video controls className="w-full h-full object-contain">
                          <source src={resource.video_file_url} />
                        </video> :

                <div className="text-sm text-muted-foreground flex items-center gap-2"><Flame className="w-4 h-4 text-purple-400" /> Video Link</div>
                }
                    </div>
              }
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{resource.content}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <div className="flex items-center gap-2">
                      <Users className="w-3 h-3 text-yellow-500" />
                      {resource.shared_with?.length > 0 ?
                  `${resource.shared_with.length} client${resource.shared_with.length > 1 ? 's' : ''}` :
                  "All clients"}
                    </div>
                    {resource.source_name &&
                <a
                  href={resource.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-500 hover:text-green-400 flex items-center gap-1 transition-colors">

                        {(resource.source_name || '').split(' - ')[0]}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                }
                  </div>
                  {resource.file_urls?.length > 0 &&
              <Badge variant="outline" className="mt-3 text-xs bg-secondary border-none text-muted-foreground">
                      {resource.file_urls.length} attachment{resource.file_urls.length > 1 ? 's' : ''}
                    </Badge>
              }
                </CardContent>
              </Card>
          )}
          </div>
        </div>
      }

      {/* Empty State */}
      {filteredResources.length === 0 && filteredRecipes.length === 0 &&
      <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-foreground">No resources or recipes yet</h3>
            <p className="text-muted-foreground mt-2">Create or import content to share with clients</p>
          </CardContent>
        </Card>
      }

      {/* View Resource Dialog */}
      <Dialog open={!!viewingResource} onOpenChange={() => setViewingResource(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center justify-between text-foreground">
              {viewingResource?.title}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSendingResource(viewingResource)}
                className="gap-2">

                <Send className="w-4 h-4" />
                Send to Client
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            <div className="flex flex-wrap gap-3">
              <Badge className={cn("text-base py-1 px-3", categoryColors[viewingResource?.category] || "bg-secondary text-foreground")}>
                {viewingResource?.category}
              </Badge>
              {viewingResource?.source_name &&
              <a
                href={viewingResource.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors">

                  Source: {viewingResource.source_name}
                  <ExternalLink className="w-4 h-4" />
                </a>
              }
            </div>

            {(viewingResource?.video_url || viewingResource?.video_file_url) &&
            <div className="bg-secondary rounded-xl overflow-hidden aspect-video border border-border">
                {viewingResource.video_file_url ?
              <video controls className="w-full h-full">
                    <source src={viewingResource.video_file_url} />
                  </video> :
              viewingResource.video_url ?
              <iframe
                src={viewingResource.video_url.replace('watch?v=', 'embed/')}
                className="w-full h-full"
                allowFullScreen /> :

              null}
              </div>
            }

            {viewingResource?.description &&
            <p className="text-muted-foreground text-lg font-medium">{viewingResource.description}</p>
            }

            <div className="prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-muted-foreground">{viewingResource?.content}</div>
            </div>

            {viewingResource?.file_urls?.length > 0 &&
            <div className="space-y-3">
                <Label className="text-foreground">Attachments</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {viewingResource.file_urls.map((url, index) =>
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-secondary rounded-xl hover:bg-accent border border-border transition-colors group">

                      <div className="text-sm flex-1 truncate text-green-400 group-hover:text-green-300">{url.split('/').pop()}</div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                    </a>
                )}
                </div>
              </div>
            }

            <div className="pt-6 border-t border-border text-sm text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>
                Shared with {viewingResource?.shared_with?.length > 0 ?
                <strong className="text-foreground">{viewingResource.shared_with.length} client{viewingResource.shared_with.length > 1 ? 's' : ''}</strong> :
                <strong className="text-foreground">all clients</strong>}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Recipe Dialog */}
      <Dialog open={!!viewingRecipe} onOpenChange={() => setViewingRecipe(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center justify-between text-foreground">
              {viewingRecipe?.name}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingRecipeToClient(viewingRecipe)}
                className="gap-2">

                <Send className="w-4 h-4" />
                Add to Meal Plan
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-6 text-foreground">
            <div className="flex flex-wrap gap-3">
              <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 capitalize text-base py-1 px-3">
                {viewingRecipe?.category || "nutrition"}
              </Badge>
              {viewingRecipe?.tags?.length > 0 && viewingRecipe.tags.map((tag, i) =>
              <Badge key={i} variant="secondary" className="bg-secondary text-muted-foreground border-none">{tag}</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm bg-secondary p-4 rounded-xl border border-border">
              {viewingRecipe?.prep_time_minutes &&
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground text-xs">Prep Time</div>
                    <div className="font-bold">{viewingRecipe.prep_time_minutes} min</div>
                  </div>
                </div>
              }
              {viewingRecipe?.cook_time_minutes &&
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground text-xs">Cook Time</div>
                    <div className="font-bold">{viewingRecipe.cook_time_minutes} min</div>
                  </div>
                </div>
              }
              {viewingRecipe?.servings &&
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground text-xs">Servings</div>
                    <div className="font-bold text-yellow-400">{viewingRecipe.servings}</div>
                  </div>
                </div>
              }
              {viewingRecipe?.calories_per_serving &&
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground text-xs">Calories</div>
                    <div className="font-bold text-red-400">{viewingRecipe.calories_per_serving}</div>
                  </div>
                </div>
              }
            </div>

            {(viewingRecipe?.protein_per_serving || viewingRecipe?.carbs_per_serving || viewingRecipe?.fat_per_serving) &&
            <div className="grid grid-cols-3 gap-4">
                {viewingRecipe.protein_per_serving &&
              <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="text-xs text-green-400/80 mb-1 uppercase tracking-wider font-bold">Protein</div>
                    <div className="text-2xl font-black text-green-400">{viewingRecipe.protein_per_serving}g</div>
                  </div>
              }
                {viewingRecipe.carbs_per_serving &&
              <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <div className="text-xs text-yellow-400/80 mb-1 uppercase tracking-wider font-bold">Carbs</div>
                    <div className="text-2xl font-black text-yellow-400">{viewingRecipe.carbs_per_serving}g</div>
                  </div>
              }
                {viewingRecipe.fat_per_serving &&
              <div className="text-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <div className="text-xs text-purple-400/80 mb-1 uppercase tracking-wider font-bold">Fat</div>
                    <div className="text-2xl font-black text-purple-400">{viewingRecipe.fat_per_serving}g</div>
                  </div>
              }
              </div>
            }

            {viewingRecipe?.ingredients?.length > 0 &&
            <div className="bg-secondary p-6 rounded-xl border border-border">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-green-500 rounded-full"></div>
                  Ingredients
                </h3>
                <ul className="space-y-3">
                  {viewingRecipe.ingredients.map((ing, i) =>
                <li key={i} className="flex items-start gap-3 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2"></div>
                      <span><strong className="text-foreground">{ing.amount} {ing.unit}</strong> {ing.name}</span>
                    </li>
                )}
                </ul>
              </div>
            }

            {viewingRecipe?.instructions &&
            <div className="bg-secondary p-6 rounded-xl border border-border">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-purple-500 rounded-full"></div>
                  Instructions
                </h3>
                <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {viewingRecipe.instructions}
                </div>
              </div>
            }
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Resource to Client Dialog */}
      <Dialog open={!!sendingResource} onOpenChange={() => setSendingResource(null)}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Email Resource/Form to Client</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              The client will receive an email containing the text of this resource so they can read, print, or fill it out. It will also appear in their in-app messages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="p-4 bg-secondary border border-border rounded-lg text-foreground">
              <p className="font-medium">{sendingResource?.title}</p>
              <Badge className={cn("mt-2 border border-border", categoryColors[sendingResource?.category] || "bg-secondary text-foreground")}>
                {sendingResource?.category}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Select Client</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  {clients.map((client) =>
                  <SelectItem key={client.id} value={client.id}>
                      {client.full_name}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSendingResource(null)} className="bg-secondary border-border text-foreground hover:bg-accent hover:text-foreground">
                Cancel
              </Button>
              <Button
                onClick={() => sendResourceMutation.mutate({ resource: sendingResource, clientId: selectedClientId })}
                disabled={!selectedClientId || sendResourceMutation.isPending}
                className="bg-gradient-to-r from-emerald-500 to-teal-600">

                {sendResourceMutation.isPending ?
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :

                <Send className="w-4 h-4 mr-2" />
                }
                Send
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Recipe to Meal Plan Dialog */}
      <Dialog open={!!addingRecipeToClient} onOpenChange={() => {
        setAddingRecipeToClient(null);
        setSelectedClientId("");
        setSelectedMealPlanId("");
      }}>
        <DialogContent className="max-w-lg bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Recipe to Meal Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="p-4 bg-secondary border border-border rounded-lg text-foreground">
              <p className="font-medium">{addingRecipeToClient?.name}</p>
              <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30 mt-2 capitalize">
                {addingRecipeToClient?.category || "nutrition"}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Select Client</Label>
                <Select value={selectedClientId} onValueChange={(val) => {
                  setSelectedClientId(val);
                  setSelectedMealPlanId("");
                }}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    {clients.map((client) =>
                    <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedClientId &&
              <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Select Meal Plan</Label>
                    <Select value={selectedMealPlanId} onValueChange={setSelectedMealPlanId}>
                      <SelectTrigger className="bg-secondary border-border text-foreground">
                        <SelectValue placeholder="Choose a meal plan..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        {mealPlans.filter((p) => p.status !== 'archived').map((plan) =>
                      <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} {plan.status === 'active' && '(Active)'}
                          </SelectItem>
                      )}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedMealPlanId &&
                <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Day</Label>
                        <Select value={selectedDay.toString()} onValueChange={(val) => setSelectedDay(parseInt(val))}>
                          <SelectTrigger className="bg-secondary border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border text-foreground">
                            {[1, 2, 3, 4, 5, 6, 7].map((day) =>
                        <SelectItem key={day} value={day.toString()}>
                                Day {day}
                              </SelectItem>
                        )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Meal Type</Label>
                        <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                          <SelectTrigger className="bg-secondary border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border text-foreground">
                            <SelectItem value="breakfast">Breakfast</SelectItem>
                            <SelectItem value="lunch">Lunch</SelectItem>
                            <SelectItem value="dinner">Dinner</SelectItem>
                            <SelectItem value="snack">Snack</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                }
                </>
              }
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setAddingRecipeToClient(null);
                setSelectedClientId("");
                setSelectedMealPlanId("");
              }} className="bg-secondary border-border text-foreground hover:bg-accent hover:text-foreground">
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedClientId || !selectedMealPlanId) {
                    toast.error("Please select a client and meal plan");
                    return;
                  }

                  try {
                    const recipe = addingRecipeToClient;
                    const mealPlan = mealPlans.find((p) => p.id === selectedMealPlanId);

                    const foods = recipe.ingredients?.map((ing) => ({
                      name: ing.name,
                      amount: ing.amount,
                      unit: ing.unit,
                      calories: Math.round((recipe.calories_per_serving || 0) / (recipe.ingredients?.length || 1)),
                      protein: Math.round((recipe.protein_per_serving || 0) / (recipe.ingredients?.length || 1)),
                      carbs: Math.round((recipe.carbs_per_serving || 0) / (recipe.ingredients?.length || 1)),
                      fat: Math.round((recipe.fat_per_serving || 0) / (recipe.ingredients?.length || 1))
                    })) || [];

                    const newMeal = {
                      day: selectedDay,
                      meal_type: selectedMealType,
                      name: recipe.name,
                      foods,
                      instructions: recipe.instructions || ""
                    };

                    const updatedMeals = [...(mealPlan.meals || []), newMeal];

                    await base44.entities.MealPlan.update(selectedMealPlanId, {
                      meals: updatedMeals
                    });

                    queryClient.invalidateQueries({ queryKey: ["mealPlans", selectedClientId] });
                    toast.success("Recipe added to meal plan");
                    setAddingRecipeToClient(null);
                    setSelectedClientId("");
                    setSelectedMealPlanId("");
                  } catch (error) {
                    console.error('Failed to add recipe:', error);
                    toast.error("Failed to add recipe to meal plan");
                  }
                }}
                disabled={!selectedClientId || !selectedMealPlanId || sendResourceMutation.isPending}
                className="bg-gradient-to-r from-emerald-500 to-teal-600">

                <Send className="w-4 h-4 mr-2" />
                Add to Plan
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Resource Confirmation */}
      <AlertDialog open={!!deleteResource} onOpenChange={() => setDeleteResource(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Resource</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete "{deleteResource?.title}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-border text-foreground hover:bg-accent hover:text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteResource.id)}
              className="bg-red-600 hover:bg-red-700">

              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resource Create/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingResource ? "Edit Resource" : "Create Resource"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground" htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="bg-secondary border-border text-foreground"
                required />

            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground" htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData((prev) => ({ ...prev, category: val }))}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="workout">Workout</SelectItem>
                  <SelectItem value="nutrition">Nutrition</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="motivation">Motivation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground" htmlFor="description">Short Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="bg-secondary border-border text-foreground"
                rows={2} />

            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground" htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                className="bg-secondary border-border text-foreground"
                rows={8}
                required />

            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground" htmlFor="video_url">Video URL (YouTube, Vimeo, etc.)</Label>
              <Input
                id="video_url"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={formData.video_url}
                className="bg-secondary border-border text-foreground placeholder:text-gray-600"
                onChange={(e) => setFormData((prev) => ({ ...prev, video_url: e.target.value }))} />

            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Or Upload Video File</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="video/*"
                  className="bg-secondary border-border text-foreground file:text-foreground"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsUploading(true);
                    try {
                      const { data } = await base44.integrations.Core.UploadFile({ file });
                      setFormData((prev) => ({ ...prev, video_file_url: data.file_url }));
                      toast.success("Video uploaded");
                    } catch (error) {
                      toast.error("Video upload failed");
                    } finally {
                      setIsUploading(false);
                    }
                  }}
                  disabled={isUploading} />

                {isUploading && <Loader2 className="w-5 h-5 animate-spin" />}
              </div>
              {formData.video_file_url &&
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <span>✓ Video uploaded</span>
                  <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData((prev) => ({ ...prev, video_file_url: "" }))}>

                    Remove
                  </Button>
                </div>
              }
            </div>

            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="space-y-3">
                {formData.file_urls.map((url, index) =>
                <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1 text-sm truncate">{url.split('/').pop()}</div>
                    <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}>

                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={isUploading} />

                  {isUploading && <Loader2 className="w-5 h-5 animate-spin" />}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground" htmlFor="source_url">Source URL (optional)</Label>
              <Input
                id="source_url"
                type="url"
                placeholder="https://..."
                value={formData.source_url}
                className="bg-secondary border-border text-foreground placeholder:text-gray-600"
                onChange={(e) => setFormData((prev) => ({ ...prev, source_url: e.target.value }))} />

            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground" htmlFor="source_name">Source Name (optional)</Label>
              <Input
                id="source_name"
                placeholder="e.g., Men's Health Magazine"
                value={formData.source_name}
                className="bg-secondary border-border text-foreground placeholder:text-gray-600"
                onChange={(e) => setFormData((prev) => ({ ...prev, source_name: e.target.value }))} />

            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Share with Clients</Label>
              <div className="text-sm text-muted-foreground mb-2">Leave empty to share with all clients</div>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-border bg-secondary rounded-lg p-3">
                {clients.map((client) =>
                <label key={client.id} className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                    <input
                    type="checkbox"
                    checked={formData.shared_with.includes(client.id)}
                    onChange={() => toggleClient(client.id)}
                    className="rounded border-white/30 bg-secondary text-emerald-500 focus:ring-emerald-500" />

                    <span>{client.full_name}</span>
                  </label>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="bg-secondary border-border text-foreground hover:bg-accent hover:text-foreground">
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-emerald-500 to-teal-600"
                disabled={createMutation.isPending || updateMutation.isPending}>

                {(createMutation.isPending || updateMutation.isPending) &&
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                }
                {editingResource ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>);

}