import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Download, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

export default function CuratedRecipeBrowser({ onImportComplete }) {
  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleFetch = async () => {
    setFetching(true);
    try {
      const { data } = await base44.functions.invoke('getCuratedRecipes', {});
      setRecipes(data.recipes || []);
      setSelectedRecipes([]);
      setShowDialog(true);
      toast.success(`Found ${data.recipes?.length || 0} curated recipes!`);
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
      toast.error('Failed to fetch recipes: ' + error.message);
    }
    setFetching(false);
  };

  const handleImport = async () => {
    if (selectedRecipes.length === 0) {
      toast.error('Please select at least one recipe to import');
      return;
    }

    setImporting(true);
    try {
      const recipesToImport = recipes.filter((_, idx) => selectedRecipes.includes(idx));
      
      for (const recipe of recipesToImport) {
        await base44.entities.Recipe.create(recipe);
      }

      toast.success(`Imported ${recipesToImport.length} recipes!`);
      setShowDialog(false);
      setRecipes([]);
      setSelectedRecipes([]);
      if (onImportComplete) onImportComplete();
    } catch (error) {
      console.error('Failed to import recipes:', error);
      toast.error('Failed to import recipes: ' + error.message);
    }
    setImporting(false);
  };

  const toggleRecipe = (index) => {
    setSelectedRecipes(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const selectAll = () => {
    const filtered = getFilteredRecipes();
    const filteredIndices = recipes
      .map((r, idx) => ({ recipe: r, idx }))
      .filter(({ recipe }) => filtered.includes(recipe))
      .map(({ idx }) => idx);
    
    if (filteredIndices.every(idx => selectedRecipes.includes(idx))) {
      setSelectedRecipes(prev => prev.filter(idx => !filteredIndices.includes(idx)));
    } else {
      setSelectedRecipes(prev => [...new Set([...prev, ...filteredIndices])]);
    }
  };

  const getFilteredRecipes = () => {
    if (!searchTerm) return recipes;
    const term = searchTerm.toLowerCase();
    return recipes.filter(r => 
      r.name.toLowerCase().includes(term) ||
      r.category.toLowerCase().includes(term) ||
      r.tags?.some(tag => tag.toLowerCase().includes(term))
    );
  };

  const filteredRecipes = getFilteredRecipes();

  return (
    <>
      <Button 
        onClick={handleFetch}
        disabled={fetching}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600"
      >
        {fetching ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <Search className="w-4 h-4 mr-2" />
            Browse 150+ Curated Recipes
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Curated Fitness Recipes</DialogTitle>
            <p className="text-sm text-slate-500">
              {filteredRecipes.length} recipes • {selectedRecipes.length} selected
            </p>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Search recipes by name, category, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />

            <div className="flex items-center gap-2 pb-2 border-b">
              <Button variant="outline" size="sm" onClick={selectAll}>
                {filteredRecipes.every((r, idx) => selectedRecipes.includes(recipes.indexOf(r))) && filteredRecipes.length > 0
                  ? 'Deselect All' 
                  : 'Select All'}
              </Button>
              <Button 
                onClick={handleImport}
                disabled={selectedRecipes.length === 0 || importing}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 ml-auto"
                size="sm"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Import {selectedRecipes.length} Selected
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {filteredRecipes.map((recipe) => {
              const idx = recipes.indexOf(recipe);
              return (
                <Card 
                  key={idx}
                  className={`cursor-pointer transition-all ${
                    selectedRecipes.includes(idx) 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : 'hover:border-slate-300'
                  }`}
                  onClick={() => toggleRecipe(idx)}
                >
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      <Checkbox 
                        checked={selectedRecipes.includes(idx)}
                        onCheckedChange={() => toggleRecipe(idx)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-sm text-slate-900">{recipe.name}</h4>
                          <Badge className="bg-orange-100 text-orange-700 shrink-0 text-xs">
                            {recipe.category}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-1">
                          <span>⏱️ {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)}m</span>
                          <span>🔥 {recipe.calories_per_serving} cal</span>
                          <span>💪 {recipe.protein_per_serving}g protein</span>
                        </div>
                        {recipe.tags && recipe.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {recipe.tags.slice(0, 3).map((tag, tagIdx) => (
                              <Badge key={tagIdx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}