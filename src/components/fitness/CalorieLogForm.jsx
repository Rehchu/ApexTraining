import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, AlertCircle } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const defaultEntry = (day = "") => ({ day, food: "", calories: "", fat_grams: "" });

export default function CalorieLogForm({ open, onOpenChange, log, clients, onSubmit }) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_id: "",
    log_name: "",
    week_start: "",
    entries: DAYS.map(d => defaultEntry(d)),
  });

  useEffect(() => {
    if (log) {
      setFormData({ ...formData, ...log, entries: log.entries?.length ? log.entries : DAYS.map(d => defaultEntry(d)) });
    } else {
      setFormData({ client_id: "", log_name: "", week_start: "", entries: DAYS.map(d => defaultEntry(d)) });
    }
  }, [log, open]);

  const updateEntry = (i, field, val) => {
    setFormData(prev => {
      const entries = [...prev.entries];
      entries[i] = { ...entries[i], [field]: val };
      // Auto-calc calories from fat (fat_grams * 9)
      if (field === "fat_grams" || field === "calories") {
        const fat = parseFloat(field === "fat_grams" ? val : entries[i].fat_grams) || 0;
        entries[i].calories_from_fat = fat * 9;
        const cals = parseFloat(field === "calories" ? val : entries[i].calories) || 0;
        entries[i].fat_percentage = cals > 0 ? ((fat * 9) / cals) : 0;
      }
      return { ...prev, entries };
    });
  };

  const addEntry = () => setFormData(prev => ({ ...prev, entries: [...prev.entries, defaultEntry()] }));
  const removeEntry = (i) => setFormData(prev => ({ ...prev, entries: prev.entries.filter((_, idx) => idx !== i) }));

  // Summary calculations
  const totalCalories = formData.entries.reduce((s, e) => s + (parseFloat(e.calories) || 0), 0);
  const totalFatGrams = formData.entries.reduce((s, e) => s + (parseFloat(e.fat_grams) || 0), 0);
  const totalCaloriesFromFat = totalFatGrams * 9;
  const fatPercentage = totalCalories > 0 ? (totalCaloriesFromFat / totalCalories) * 100 : 0;
  const fatWarning = fatPercentage > 30;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onSubmit(formData);
    setIsLoading(false);
  };

  // Group entries by day for display
  const entriesByDay = {};
  formData.entries.forEach((entry, i) => {
    const key = entry.day || "Other";
    if (!entriesByDay[key]) entriesByDay[key] = [];
    entriesByDay[key].push({ ...entry, _idx: i });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-5xl max-h-[90vh] overflow-y-auto border-border text-foreground p-6 bg-background">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">Daily Calorie & Fat Percentage Log</DialogTitle>
          <p className="text-sm text-muted-foreground">Recommended total fat intake: less than 30% of total calories.</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-secondary border border-border rounded-xl">
            <div className="space-y-1">
              <Label className="text-muted-foreground">Client</Label>
              <Select value={formData.client_id} onValueChange={val => setFormData(p => ({ ...p, client_id: val }))}>
                <SelectTrigger className="bg-card border-border text-foreground"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Log Name / Label</Label>
              <Input value={formData.log_name} onChange={e => setFormData(p => ({ ...p, log_name: e.target.value }))} placeholder="e.g. Week 1 Log" className="bg-card border-border text-foreground" />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Week Starting</Label>
              <Input type="date" value={formData.week_start} onChange={e => setFormData(p => ({ ...p, week_start: e.target.value }))} className="bg-card border-border text-foreground [color-scheme:dark]" />
            </div>
          </div>

          {/* Summary Panel */}
          <div className={`p-4 rounded-xl border ${fatWarning ? "bg-red-500/10 border-red-500/30" : "bg-green-500/10 border-green-500/30"}`}>
            <h3 className="font-semibold text-sm mb-3 text-foreground">Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-card border border-border rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-foreground">{Math.round(totalCalories)}</div>
                <div className="text-xs text-muted-foreground">Calories Consumed</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-foreground">{Math.round(totalFatGrams)}g</div>
                <div className="text-xs text-muted-foreground">Grams of Fat</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-foreground">{Math.round(totalCaloriesFromFat)}</div>
                <div className="text-xs text-muted-foreground">Calories from Fat</div>
              </div>
              <div className={`rounded-lg p-3 shadow-sm border ${fatWarning ? "bg-red-500/20 border-red-500/30" : "bg-card border-border"}`}>
                <div className={`text-2xl font-bold ${fatWarning ? "text-red-400" : "text-green-400"}`}>{fatPercentage.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">Fat % of Calories</div>
                {fatWarning && (
                  <div className="flex items-center justify-center gap-1 text-xs text-red-400 mt-1">
                    <AlertCircle className="w-3 h-3" /> Over 30% limit
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Food Log Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Food Log</h3>
              <Button type="button" size="sm" variant="outline" onClick={addEntry} className="gap-1 border-border text-foreground hover:bg-accent">
                <Plus className="w-3 h-3" /> Add Entry
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border bg-secondary">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground w-28">Day</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Food</th>
                    <th className="text-left p-3 font-medium text-muted-foreground w-24">Calories</th>
                    <th className="text-left p-3 font-medium text-muted-foreground w-24">Fat (g)</th>
                    <th className="text-left p-3 font-medium text-muted-foreground w-28">Cal from Fat</th>
                    <th className="text-left p-3 font-medium text-muted-foreground w-20">Fat %</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.entries.map((entry, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-1">
                        <Select value={entry.day} onValueChange={val => updateEntry(i, "day", val)}>
                          <SelectTrigger className="h-8 text-xs bg-card border-border text-foreground"><SelectValue placeholder="Day" /></SelectTrigger>
                          <SelectContent className="bg-card border-border text-foreground">
                            {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-1"><Input value={entry.food} onChange={e => updateEntry(i, "food", e.target.value)} className="h-8 text-sm bg-card border-border text-foreground" placeholder="Food item" /></td>
                      <td className="p-1"><Input type="number" value={entry.calories} onChange={e => updateEntry(i, "calories", e.target.value)} className="h-8 text-sm bg-card border-border text-foreground" /></td>
                      <td className="p-1"><Input type="number" value={entry.fat_grams} onChange={e => updateEntry(i, "fat_grams", e.target.value)} className="h-8 text-sm bg-card border-border text-foreground" /></td>
                      <td className="p-1 px-3 text-muted-foreground text-sm">{entry.calories_from_fat != null ? Math.round(entry.calories_from_fat) : "—"}</td>
                      <td className="p-1 px-3 text-sm">
                        {entry.fat_percentage != null && entry.calories > 0 ? (
                          <span className={entry.fat_percentage > 0.3 ? "text-red-400 font-medium" : "text-green-400"}>
                            {(entry.fat_percentage * 100).toFixed(1)}%
                          </span>
                        ) : "—"}
                      </td>
                      <td className="p-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeEntry(i)} className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border text-foreground hover:bg-accent">Cancel</Button>
            <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-[#d4a017] to-[#f5c842] text-black font-bold border-none hover:opacity-90">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {log?.id ? "Update Log" : "Save Log"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}