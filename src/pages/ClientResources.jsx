import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Search, ExternalLink, Play, FileText, Download, Users, Flame, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import NASMExerciseLibrary from "@/components/resources/NASMExerciseLibrary";
import QuickAddResources from "@/components/resources/QuickAddResources";
import SearchSources from "@/components/resources/SearchSources";
import RecipeImporter from "@/components/resources/RecipeImporter";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const categoryColors = {
  workout: "bg-blue-900/40 text-blue-300 border-blue-700",
  nutrition: "bg-orange-900/40 text-orange-300 border-orange-700",
  medical: "bg-red-900/40 text-red-300 border-red-700",
  general: "bg-gray-700/40 text-muted-foreground border-gray-600",
  motivation: "bg-purple-900/40 text-purple-300 border-purple-700"
};

export default function ClientResources() {
  const [user, setUser] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewingResource, setViewingResource] = useState(null);
  const [viewingRecipe, setViewingRecipe] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      const clients = await base44.entities.Client.filter({ email: userData.email });
      if (clients.length > 0) {
        setClientProfile(clients[0]);
      }
    };
    loadUser();
  }, []);

  const { data: resources = [] } = useQuery({
    queryKey: ["clientResources", clientProfile?.trainer_id],
    queryFn: async () => {
      let all = [];
      if (!clientProfile?.trainer_id) {
        all = await base44.entities.Resource.filter({});
      } else {
        all = await base44.entities.Resource.filter({ trainer_id: clientProfile.trainer_id });
      }
      // Show resources shared with all clients OR shared specifically with this client
      return all.filter(r => 
        !r.shared_with || 
        r.shared_with.length === 0 || 
        r.shared_with.includes(clientProfile.id) ||
        r.shared_with.includes(user?.id)
      );
    },
    enabled: !!clientProfile,
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["clientRecipes", clientProfile?.trainer_id],
    queryFn: async () => {
      if (!clientProfile?.trainer_id) {
        return base44.entities.Recipe.filter({});
      }
      return base44.entities.Recipe.filter({ trainer_id: clientProfile.trainer_id });
    },
    enabled: !!clientProfile,
  });

  const { data: curatedRecipes = [] } = useQuery({
    queryKey: ["curatedRecipes"],
    queryFn: async () => {
      if (categoryFilter !== "all" && categoryFilter !== "nutrition") return [];
      const { data } = await base44.functions.invoke('getCuratedRecipes', {});
      return data.recipes || [];
    },
    enabled: categoryFilter === "all" || categoryFilter === "nutrition"
  });

  const filteredResources = resources.filter(r => {
    const matchSearch = r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = categoryFilter === "all" || r.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const allRecipes = categoryFilter === "nutrition" || categoryFilter === "all" ? [...recipes, ...curatedRecipes] : recipes;

  const filteredRecipes = allRecipes.filter(r =>
    (r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) &&
    (categoryFilter === "all" || categoryFilter === "nutrition")
  );

  if (!clientProfile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading resources...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Resources</h1>
        <p className="text-muted-foreground mt-1">{clientProfile?.trainer_id ? "Educational content from your trainer" : "Explore the full resource library"}</p>
      </div>

      {!clientProfile?.trainer_id && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch mb-6">
            <QuickAddResources
              trainerId={user?.id}
              onAdd={() => queryClient.invalidateQueries({ queryKey: ["clientResources"] })} />
            <RecipeImporter
              onImportComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["clientRecipes"] });
                toast.success("Recipe imported and list updated!");
              }} />
          </div>

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
                className="bg-gray-800/50 p-4 rounded-xl hover:bg-gray-700/50 transition-all border border-gray-700 hover:border-green-500/30 group text-foreground">
                  <p className="font-medium text-sm text-foreground mb-2 group-hover:text-green-400 transition-colors">{resource.title}</p>
                  <Button size="sm" variant="outline" className="w-full text-xs gap-1 pointer-events-none">
                    <Download className="w-3 h-3" />
                    Download
                  </Button>
                </a>
              )}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-gray-700">
            <NASMExerciseLibrary />
          </div>
        </>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            className="pl-10 bg-secondary border-gray-700 text-foreground placeholder:text-muted-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] bg-secondary border-gray-700 text-foreground">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="bg-secondary border-gray-700 text-foreground">
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="workout">Workout</SelectItem>
            <SelectItem value="nutrition">Nutrition</SelectItem>
            <SelectItem value="medical">Medical</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="motivation">Motivation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resources Grid */}
      {filteredResources.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Articles & Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((resource) => (
              <Card
                key={resource.id}
                className="bg-secondary border-gray-700 hover:border-green-600 transition-all cursor-pointer hover:shadow-lg hover:shadow-green-900/20"
                onClick={() => setViewingResource(resource)}
              >
                <CardHeader className="pb-2">
                  <Badge className={cn("w-fit text-xs border mb-2", categoryColors[resource.category] || categoryColors.general)}>
                    {resource.category}
                  </Badge>
                  <CardTitle className="text-base text-foreground leading-tight">{resource.title}</CardTitle>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{resource.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-3">{resource.content}</p>
                  <div className="flex gap-2 mt-3">
                    {resource.video_url && (
                      <Badge variant="outline" className="text-xs border-gray-600 text-muted-foreground gap-1">
                        <Play className="w-3 h-3" /> Video
                      </Badge>
                    )}
                    {resource.file_urls?.length > 0 && (
                      <Badge variant="outline" className="text-xs border-gray-600 text-muted-foreground gap-1">
                        <FileText className="w-3 h-3" /> {resource.file_urls.length} file(s)
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recipes Grid */}
      {filteredRecipes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Recipes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecipes.map((recipe, idx) => (
              <Card key={recipe.id || idx} className="bg-secondary border-gray-700 hover:border-green-600 transition-all cursor-pointer" onClick={() => setViewingRecipe(recipe)}>
                {recipe.photo_url && (
                  <img src={recipe.photo_url} alt={recipe.name} className="w-full h-40 object-cover rounded-t-lg" />
                )}
                <CardHeader className="pb-2">
                  <Badge className="w-fit text-xs border bg-orange-900/40 text-orange-300 border-orange-700 mb-2 capitalize">
                    {recipe.category || "nutrition"}
                  </Badge>
                  <CardTitle className="text-base text-foreground">{recipe.name}</CardTitle>
                  {recipe.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{recipe.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {recipe.calories_per_serving && <span>🔥 {recipe.calories_per_serving} cal</span>}
                    {recipe.protein_per_serving && <span>💪 {recipe.protein_per_serving}g protein</span>}
                    {recipe.servings && <span>🍽️ {recipe.servings} servings</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {filteredResources.length === 0 && filteredRecipes.length === 0 && (
        <Card className="bg-secondary border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-foreground">No resources yet</h3>
            <p className="text-muted-foreground mt-2">{clientProfile?.trainer_id ? "Your trainer will share resources with you here" : "No resources available at the moment"}</p>
          </CardContent>
        </Card>
      )}

      {/* View Recipe Dialog */}
      <Dialog open={!!viewingRecipe} onOpenChange={() => setViewingRecipe(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-secondary border-gray-700 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl text-foreground">
              {viewingRecipe?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="flex flex-wrap gap-3">
              <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30 capitalize text-base py-1 px-3">
                {viewingRecipe?.category || "nutrition"}
              </Badge>
              {viewingRecipe?.tags?.length > 0 && viewingRecipe.tags.map((tag, i) =>
              <Badge key={i} variant="secondary" className="bg-secondary text-muted-foreground border-none">{tag}</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm bg-secondary p-4 rounded-xl border border-border">
              {viewingRecipe?.prep_time_minutes && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground text-xs">Prep Time</div>
                    <div className="font-bold">{viewingRecipe.prep_time_minutes} min</div>
                  </div>
                </div>
              )}
              {viewingRecipe?.cook_time_minutes && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground text-xs">Cook Time</div>
                    <div className="font-bold">{viewingRecipe.cook_time_minutes} min</div>
                  </div>
                </div>
              )}
              {viewingRecipe?.servings && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground text-xs">Servings</div>
                    <div className="font-bold text-yellow-400">{viewingRecipe.servings}</div>
                  </div>
                </div>
              )}
              {viewingRecipe?.calories_per_serving && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground text-xs">Calories</div>
                    <div className="font-bold text-red-400">{viewingRecipe.calories_per_serving}</div>
                  </div>
                </div>
              )}
            </div>

            {(viewingRecipe?.protein_per_serving || viewingRecipe?.carbs_per_serving || viewingRecipe?.fat_per_serving) && (
              <div className="grid grid-cols-3 gap-4">
                {viewingRecipe.protein_per_serving && (
                  <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="text-xs text-green-400/80 mb-1 uppercase tracking-wider font-bold">Protein</div>
                    <div className="text-2xl font-black text-green-400">{viewingRecipe.protein_per_serving}g</div>
                  </div>
                )}
                {viewingRecipe.carbs_per_serving && (
                  <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <div className="text-xs text-yellow-400/80 mb-1 uppercase tracking-wider font-bold">Carbs</div>
                    <div className="text-2xl font-black text-yellow-400">{viewingRecipe.carbs_per_serving}g</div>
                  </div>
                )}
                {viewingRecipe.fat_per_serving && (
                  <div className="text-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <div className="text-xs text-purple-400/80 mb-1 uppercase tracking-wider font-bold">Fat</div>
                    <div className="text-2xl font-black text-purple-400">{viewingRecipe.fat_per_serving}g</div>
                  </div>
                )}
              </div>
            )}

            {viewingRecipe?.ingredients?.length > 0 && (
              <div className="bg-secondary p-6 rounded-xl border border-border">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-green-500 rounded-full"></div>
                  Ingredients
                </h3>
                <ul className="space-y-3">
                  {viewingRecipe.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-start gap-3 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2"></div>
                      <span><strong className="text-foreground">{ing.amount} {ing.unit}</strong> {ing.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {viewingRecipe?.instructions && (
              <div className="bg-secondary p-6 rounded-xl border border-border">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-purple-500 rounded-full"></div>
                  Instructions
                </h3>
                <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {viewingRecipe.instructions}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Resource Dialog */}
      <Dialog open={!!viewingResource} onOpenChange={() => setViewingResource(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-secondary border-gray-700 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">{viewingResource?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <Badge className={cn("text-sm border", categoryColors[viewingResource?.category] || categoryColors.general)}>
              {viewingResource?.category}
            </Badge>

            {viewingResource?.description && (
              <p className="text-muted-foreground">{viewingResource.description}</p>
            )}

            {(viewingResource?.video_url || viewingResource?.video_file_url) && (
              <div className="rounded-lg overflow-hidden aspect-video bg-black">
                {viewingResource.video_file_url ? (
                  <video controls className="w-full h-full">
                    <source src={viewingResource.video_file_url} />
                  </video>
                ) : viewingResource.video_url ? (
                  <iframe
                    src={viewingResource.video_url.replace('watch?v=', 'embed/')}
                    className="w-full h-full"
                    allowFullScreen
                  />
                ) : null}
              </div>
            )}

            <div className="text-foreground whitespace-pre-wrap leading-relaxed">
              {viewingResource?.content}
            </div>

            {viewingResource?.file_urls?.length > 0 && (
              <div className="space-y-2">
                <p className="font-semibold text-foreground">Attachments</p>
                {viewingResource.file_urls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-secondary rounded-lg hover:bg-gray-700 transition-colors text-green-400 text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="truncate">{url.split('/').pop()}</span>
                    <ExternalLink className="w-3 h-3 ml-auto flex-shrink-0" />
                  </a>
                ))}
              </div>
            )}

            {viewingResource?.source_name && (
              <a
                href={viewingResource.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-green-400 hover:text-green-300"
              >
                Source: {viewingResource.source_name}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}