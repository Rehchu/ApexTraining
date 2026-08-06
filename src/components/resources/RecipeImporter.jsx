import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query"; // ← added
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Sparkles, Loader2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

export default function RecipeImporter({ onImportComplete }) {
  const [recipeUrl, setRecipeUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [parsedRecipe, setParsedRecipe] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [importing, setImporting] = useState(false);

  const queryClient = useQueryClient(); // ← added

  const handleParse = async () => {
    if (!recipeUrl.trim()) {
      toast.error('Please paste a recipe URL');
      return;
    }

    setProcessing(true);
    try {
      const { data } = await base44.functions.invoke('parseRecipeFromText', {
        recipe_url: recipeUrl
      });

      if (!data?.success || !data?.recipe?.name) {
        toast.error(data?.error || "Couldn't read a recipe from that link. Try another source or add it manually.");
        return;
      }

      setParsedRecipe(data.recipe);
      setShowDialog(true);
      toast.success('Recipe parsed successfully!');
    } catch (error) {
      console.error('Failed to parse recipe:', error);
      toast.error("Couldn't read a recipe from that link. Try another source or add it manually.");
    } finally {
      setProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!parsedRecipe?.name) {
      toast.error('No valid recipe to import');
      return;
    }

    setImporting(true);

    try {
      const user = await base44.auth.me();
      const recipeToCreate = {
        ...parsedRecipe,
        status: "active",
        trainer_id: user?.id
      };

      console.log('[Recipe Import] Creating with data:', recipeToCreate);

      await base44.entities.Recipe.create(recipeToCreate);

      toast.success('Recipe imported successfully!');

      // Critical: refresh the global recipes list
      queryClient.invalidateQueries({ queryKey: ['recipes'] });

      // Reset UI
      setShowDialog(false);
      setParsedRecipe(null);
      setRecipeUrl('');

      // Call parent callback if provided (e.g. for other pages)
      if (onImportComplete) onImportComplete();

    } catch (error) {
      console.error('[Recipe Import] Failed:', error);
      const errorMessage = error.message || 'Unknown server error – check console';
      console.error('Full error details:', error);
      toast.error(`Failed to import recipe: ${errorMessage}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Card className="glass-card border-border h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <LinkIcon className="w-5 h-5 text-green-400" />
            Import Recipe
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Paste any recipe URL to extract all details automatically using AI.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 mt-auto">
          <Input
            placeholder="https://example.com/recipe..."
            value={recipeUrl}
            onChange={(e) => setRecipeUrl(e.target.value)}
            type="url" 
            className="input-frosted h-10 w-full" 
          />
          <Button
            onClick={handleParse}
            disabled={!recipeUrl.trim() || processing}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground border-0 transition-colors">

            {processing ?
            <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Parsing recipe...
              </> :

            <>
                <Sparkles className="w-4 h-4 mr-2" />
                Parse Recipe URL
              </>
            }
          </Button>
        </CardContent>
      </Card>

      {/* Recipe Preview Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-emerald-600" />
              Review Parsed Recipe
            </DialogTitle>
          </DialogHeader>

          {parsedRecipe &&
          <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{parsedRecipe.name}</h3>
                {parsedRecipe.description &&
              <p className="text-sm text-slate-600 mt-1">{parsedRecipe.description}</p>
              }
                <div className="flex flex-wrap gap-2 mt-2">
                  {parsedRecipe.category &&
                <Badge className="bg-orange-100 text-orange-700 capitalize">
                      {parsedRecipe.category}
                    </Badge>
                }
                  {parsedRecipe.tags?.map((tag, i) =>
                <Badge key={i} variant="secondary">
                      {tag}
                    </Badge>
                )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                {parsedRecipe.prep_time_minutes &&
              <div>
                    <span className="text-slate-600">Prep:</span>{' '}
                    <span className="font-medium">{parsedRecipe.prep_time_minutes} min</span>
                  </div>
              }
                {parsedRecipe.cook_time_minutes &&
              <div>
                    <span className="text-slate-600">Cook:</span>{' '}
                    <span className="font-medium">{parsedRecipe.cook_time_minutes} min</span>
                  </div>
              }
                {parsedRecipe.servings &&
              <div>
                    <span className="text-slate-600">Servings:</span>{' '}
                    <span className="font-medium">{parsedRecipe.servings}</span>
                  </div>
              }
                {parsedRecipe.calories_per_serving &&
              <div>
                    <span className="text-slate-600">Calories:</span>{' '}
                    <span className="font-medium">{parsedRecipe.calories_per_serving}</span>
                  </div>
              }
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="text-xs text-slate-600">Protein</div>
                  <div className="font-semibold text-blue-700">
                    {parsedRecipe.protein_per_serving ?? '—'}g
                  </div>
                </div>
                <div className="text-center p-2 bg-amber-50 rounded">
                  <div className="text-xs text-slate-600">Carbs</div>
                  <div className="font-semibold text-amber-700">
                    {parsedRecipe.carbs_per_serving ?? '—'}g
                  </div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="text-xs text-slate-600">Fat</div>
                  <div className="font-semibold text-purple-700">
                    {parsedRecipe.fat_per_serving ?? '—'}g
                  </div>
                </div>
              </div>

              {parsedRecipe.ingredients?.length > 0 &&
            <div>
                  <h4 className="font-medium mb-2">Ingredients:</h4>
                  <ul className="text-sm space-y-1 list-disc pl-5">
                    {parsedRecipe.ingredients.map((ing, i) =>
                <li key={i} className="text-slate-700">
                        {ing.amount} {ing.unit} {ing.name}
                      </li>
                )}
                  </ul>
                </div>
            }

              {parsedRecipe.instructions &&
            <div>
                  <h4 className="font-medium mb-2">Instructions:</h4>
                  <div className="text-sm text-slate-700 whitespace-pre-line">
                    {parsedRecipe.instructions}
                  </div>
                </div>
            }
            </div>
          }

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing}
              className="bg-gradient-to-r from-emerald-500 to-teal-600">

              {importing ?
              <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </> :

              <>
                  <ChefHat className="w-4 h-4 mr-2" />
                  Save Recipe
                </>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>);

}