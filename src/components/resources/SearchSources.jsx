import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Plus, ExternalLink, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const categoryColors = {
  workout: "bg-blue-100 text-blue-700",
  nutrition: "bg-orange-100 text-orange-700",
  medical: "bg-red-100 text-red-700",
  general: "bg-slate-100 text-slate-700",
  motivation: "bg-purple-100 text-purple-700"
};

export default function SearchSources({ onAdd, trainerId }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [adding, setAdding] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query || query.length < 2) return;

    setSearching(true);
    setResults([]);
    
    try {
      const { data } = await base44.functions.invoke('searchResourceSources', {
        query,
        category: category === "all" ? null : category
      });
      
      setResults(data.resources || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (resource) => {
    setAdding(resource.title);
    try {
      await base44.entities.Resource.create({
        title: resource.title,
        content: resource.content,
        category: resource.category,
        source_url: resource.source_url,
        source_name: resource.source_name,
        trainer_id: trainerId,
        shared_with: []
      });
      onAdd?.();
    } catch (error) {
      console.error('Failed to add resource:', error);
    } finally {
      setAdding(null);
    }
  };

  return (
    <>
      <Card className="glass-card border-border h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <Search className="w-5 h-5 text-green-400" />
            Search Database
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Search trusted medical and fitness sources for information.
          </p>
        </CardHeader>
        <CardContent className="mt-auto">
          <Button onClick={() => setOpen(true)} className="w-full bg-secondary hover:bg-accent text-foreground border-0 transition-colors">
            <Search className="w-4 h-4 mr-2" />
            Open Search
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Search Trusted Health & Fitness Sources
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSearch} className="space-y-4 mt-4">
            <div className="flex gap-3">
              <Input
                placeholder="Search exercises, conditions, nutrition topics..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  <SelectItem value="workout">Workout</SelectItem>
                  <SelectItem value="nutrition">Nutrition</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                type="submit" 
                disabled={searching || query.length < 2}
                className="bg-gradient-to-r from-emerald-500 to-teal-600"
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-900">
            <strong>Sources:</strong> Exercemus, MedlinePlus Medical Encyclopedia, NASM Blog, MMFit, and evidence-based nutrition resources
          </div>

          {searching && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
              <p className="text-slate-600">Searching trusted sources...</p>
            </div>
          )}

          {!searching && results.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Found {results.length} resources</h3>
              {results.map((resource, idx) => (
                <Card key={idx} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <Badge className={cn("mb-2", categoryColors[resource.category])}>
                          {resource.category}
                        </Badge>
                        <CardTitle className="text-base">{resource.title}</CardTitle>
                        {resource.source_name && (
                          <a
                            href={resource.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-1"
                          >
                            {resource.source_name}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAdd(resource)}
                        disabled={adding === resource.title}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600"
                      >
                        {adding === resource.title ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{resource.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!searching && results.length === 0 && query && (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-slate-600">No results found. Try different keywords.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}