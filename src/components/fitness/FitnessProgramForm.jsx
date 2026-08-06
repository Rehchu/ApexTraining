import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Loader2, Search, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useUnitSystem } from "@/components/hooks/useUnitSystem";

const defaultExercise = () => ({ name: "", reps: "", weight_lbs: "", weeks: "", frequency: "", start: "" });
const defaultSection = () => [defaultExercise(), defaultExercise(), defaultExercise(), defaultExercise()];

const ExerciseTable = ({ title, exercises, onChange }) => {
  const { weightUnit } = useUnitSystem();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(null);

  const addRow = () => onChange([...exercises, defaultExercise()]);
  const removeRow = (i) => onChange(exercises.filter((_, idx) => idx !== i));
  const update = (i, field, val) => {
    const next = [...exercises];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  const handleSearchExercises = async (query, index) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    setActiveSearchIndex(index);
    try {
      const { data } = await base44.functions.invoke('searchExercises', { search: query, limit: 10 });
      setSearchResults(data.exercises || []);
    } catch (e) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-foreground uppercase tracking-wide">{title}</h4>
        <Button type="button" size="sm" variant="outline" onClick={addRow} className="h-7 text-xs gap-1 border-border text-foreground hover:bg-accent">
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-secondary">
        <table className="w-full text-xs">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-2 font-medium text-muted-foreground min-w-[200px]">Exercise</th>
              <th className="text-left p-2 font-medium text-muted-foreground w-16">Reps</th>
              <th className="text-left p-2 font-medium text-muted-foreground w-20">Wts ({weightUnit})</th>
              <th className="text-left p-2 font-medium text-muted-foreground w-16">Weeks</th>
              <th className="text-left p-2 font-medium text-muted-foreground w-20">Frequency</th>
              <th className="text-left p-2 font-medium text-muted-foreground w-16">Start</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex, i) => (
              <tr key={i} className="border-t border-border">
                <td className="p-1">
                  <div className="relative">
                    <Input
                      value={activeSearchIndex === i ? searchQuery : ex.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeSearchIndex === i) setSearchQuery(val);
                        update(i, "name", val);
                        handleSearchExercises(val, i);
                      }}
                      onFocus={() => {
                        setActiveSearchIndex(i);
                        setSearchQuery(ex.name || "");
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setActiveSearchIndex(null);
                          setSearchResults([]);
                          setSearchQuery("");
                        }, 200);
                      }}
                      className="h-8 bg-card border-border text-foreground text-xs w-full"
                      placeholder="Search exercises..."
                    />
                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    {activeSearchIndex === i && searchQuery && (
                       <div className="absolute top-full left-0 w-[250px] mt-1 bg-card border border-border rounded-lg shadow-xl z-[9999] max-h-48 overflow-y-auto">
                         {isSearching ? (
                           <div className="p-3 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" /></div>
                         ) : searchResults.length > 0 ? (
                           searchResults.map((result, idx) => (
                             <button
                               key={idx}
                               type="button"
                               className="w-full px-3 py-2 text-left hover:bg-accent border-b border-border text-xs last:border-0 text-foreground"
                               onMouseDown={(e) => {
                                 e.preventDefault();
                                 update(i, "name", result.name);
                                 setSearchResults([]);
                                 setActiveSearchIndex(null);
                                 setSearchQuery("");
                               }}
                             >
                               <div className="font-medium truncate">{result.name}</div>
                               <div className="text-muted-foreground text-[10px]">{result.bodyPart} • {result.target}</div>
                             </button>
                           ))
                         ) : searchQuery.length >= 2 ? (
                           <div className="p-3 text-center text-xs text-muted-foreground">No exercises found</div>
                         ) : null}
                       </div>
                    )}
                  </div>
                </td>
                <td className="p-1"><Input type="number" value={ex.reps} onChange={e => update(i, "reps", e.target.value)} className="h-8 bg-card border-border text-foreground text-xs w-14" /></td>
                <td className="p-1"><Input type="number" value={ex.weight_lbs} onChange={e => update(i, "weight_lbs", e.target.value)} className="h-8 bg-card border-border text-foreground text-xs w-16" /></td>
                <td className="p-1"><Input type="number" value={ex.weeks} onChange={e => update(i, "weeks", e.target.value)} className="h-8 bg-card border-border text-foreground text-xs w-14" /></td>
                <td className="p-1"><Input type="number" value={ex.frequency} onChange={e => update(i, "frequency", e.target.value)} className="h-8 bg-card border-border text-foreground text-xs w-16" /></td>
                <td className="p-1"><Input type="number" value={ex.start} onChange={e => update(i, "start", e.target.value)} className="h-8 bg-card border-border text-foreground text-xs w-14" /></td>
                <td className="p-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)} className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function FitnessProgramForm({ open, onOpenChange, program, clients, onSubmit }) {
  const { system, weightUnit, heightUnit, convertWeightDisplay, parseWeight, convertHeightDisplay, parseHeight } = useUnitSystem();
  const [isLoading, setIsLoading] = useState(false);
  const [isClientInfoOpen, setIsClientInfoOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_name: "",
    trainer_name: "",
    client_id: "",
    start_date: "",
    client_info: { age: "", gender: "", height_feet: "", height_inches: "", weight_lbs: "", chest_inches: "", waist_inches: "", body_fat: "", target_body_fat: "", bmi: "", target_bmi: "", suggestions: "" },
    warmup: defaultSection(),
    strength: defaultSection(),
    cardio: defaultSection(),
    cooldown: defaultSection(),
  });

  useEffect(() => {
    if (program) {
      setFormData({
        ...formData,
        ...program,
        warmup: program.warmup?.length ? program.warmup : defaultSection(),
        strength: program.strength?.length ? program.strength : defaultSection(),
        cardio: program.cardio?.length ? program.cardio : defaultSection(),
        cooldown: program.cooldown?.length ? program.cooldown : defaultSection(),
      });
    } else {
      setFormData({
        client_name: "", trainer_name: "", client_id: "", start_date: "",
        client_info: { age: "", gender: "", height_feet: "", height_inches: "", weight_lbs: "", chest_inches: "", waist_inches: "", body_fat: "", target_body_fat: "", bmi: "", target_bmi: "", suggestions: "" },
        warmup: defaultSection(), strength: defaultSection(), cardio: defaultSection(), cooldown: defaultSection(),
      });
    }
  }, [program, open]);

  // Auto-calc BMI when weight/height changes
  useEffect(() => {
    const { weight_lbs, height_feet, height_inches } = formData.client_info;
    if (weight_lbs && (height_feet || height_inches)) {
      let bmi = 0;
      if (system === 'imperial') {
        const totalInches = (parseFloat(height_feet || 0) * 12) + (parseFloat(height_inches) || 0);
        if (totalInches > 0) bmi = ((parseFloat(weight_lbs) / (totalInches * totalInches)) * 703).toFixed(1);
      } else {
        const totalCm = parseFloat(height_inches || 0);
        if (totalCm > 0) {
          const totalM = totalCm / 100;
          bmi = (parseFloat(weight_lbs) / (totalM * totalM)).toFixed(1);
        }
      }
      if (bmi) {
        setFormData(prev => ({ ...prev, client_info: { ...prev.client_info, bmi } }));
      }
    }
  }, [formData.client_info.weight_lbs, formData.client_info.height_feet, formData.client_info.height_inches, system]);

  const setInfo = (field, val) => setFormData(prev => ({ ...prev, client_info: { ...prev.client_info, [field]: val } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onSubmit(formData);
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        onInteractOutside={(e) => e.preventDefault()}
        className="glass-card max-w-5xl max-h-[90vh] overflow-y-auto border-border text-foreground p-6 bg-background"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">Fitness Training Program</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-secondary border border-border rounded-xl">
            <div className="space-y-1">
              <Label className="text-muted-foreground">Client</Label>
              <Select value={formData.client_id} onValueChange={(val) => {
                const client = clients?.find(c => c.id === val);
                setFormData(prev => {
                  const newFormData = { ...prev, client_id: val, client_name: client?.full_name || prev.client_name };
                  if (client) {
                    newFormData.client_info = {
                      ...prev.client_info,
                      gender: prev.client_info.gender || client.gender || "",
                      weight_lbs: prev.client_info.weight_lbs || (client.weight_kg ? convertWeightDisplay(client.weight_kg) : ""),
                      body_fat: prev.client_info.body_fat || client.body_fat_percentage || "",
                      height_feet: prev.client_info.height_feet || (client.height_cm ? (system === 'imperial' ? Math.floor(client.height_cm / 30.48) : "") : ""),
                      height_inches: prev.client_info.height_inches || (client.height_cm ? (system === 'imperial' ? Math.round((client.height_cm / 2.54) % 12) : convertHeightDisplay(client.height_cm)) : ""),
                    };
                    if (client.date_of_birth && !prev.client_info.age) {
                      newFormData.client_info.age = new Date().getFullYear() - new Date(client.date_of_birth).getFullYear();
                    }
                  }
                  return newFormData;
                });
              }}>
                <SelectTrigger className="bg-card border-border text-foreground"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Or type client name" value={formData.client_name} onChange={e => setFormData(p => ({ ...p, client_name: e.target.value }))} className="text-xs mt-1 bg-card border-border text-foreground" />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Trainer / Instructor</Label>
              <Input value={formData.trainer_name} onChange={e => setFormData(p => ({ ...p, trainer_name: e.target.value }))} placeholder="Trainer name" className="bg-card border-border text-foreground" />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Program Start Date</Label>
              <Input type="date" value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} className="bg-card border-border text-foreground [color-scheme:dark]" />
            </div>
          </div>

          <Tabs defaultValue="info">
            <TabsList className="grid grid-cols-2 w-full bg-secondary border border-border p-1">
              <TabsTrigger value="info" className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-muted-foreground">Client Info & Schedule</TabsTrigger>
              <TabsTrigger value="tracking" className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-muted-foreground">Program Tracking</TabsTrigger>
            </TabsList>

            {/* Client Info Tab */}
            <TabsContent value="info" className="space-y-6 pt-4">
              <Collapsible open={isClientInfoOpen} onOpenChange={setIsClientInfoOpen}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="outline" className="w-full flex justify-between items-center bg-secondary border-border hover:bg-accent text-foreground p-4 h-auto">
                    <span className="font-semibold">Client's Information Metrics</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isClientInfoOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-secondary border border-border rounded-xl">
                {[
                  { label: "Age", field: "age", type: "number" },
                  { label: "Gender", field: "gender", type: "text" },
                  ...(system === 'imperial' ? [{ label: "Height (ft)", field: "height_feet", type: "number" }] : []),
                  { label: `Height (${heightUnit})`, field: "height_inches", type: "number" },
                  { label: `Weight (${weightUnit})`, field: "weight_lbs", type: "number" },
                  { label: `Chest (${heightUnit})`, field: "chest_inches", type: "number" },
                  { label: `Waist (${heightUnit})`, field: "waist_inches", type: "number" },
                  { label: "Body Fat %", field: "body_fat", type: "number" },
                  { label: "Target Body Fat %", field: "target_body_fat", type: "number" },
                  { label: "BMI", field: "bmi", type: "number" },
                  { label: "Target BMI", field: "target_bmi", type: "number" },
                ].map(({ label, field, type }) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <Input type={type} value={formData.client_info[field]} onChange={e => setInfo(field, e.target.value)} className="h-8 text-xs bg-card border-border text-foreground" />
                  </div>
                ))}
                <div className="col-span-full space-y-1 mt-2">
                  <Label className="text-xs text-muted-foreground">Suggestions</Label>
                  <Textarea value={formData.client_info.suggestions} onChange={e => setInfo("suggestions", e.target.value)} className="text-xs min-h-[60px] bg-card border-border text-foreground" />
                </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="space-y-6 bg-secondary border border-border rounded-xl p-4">
                <Tabs defaultValue="strength" className="w-full">
                  <TabsList className="grid grid-cols-4 w-full bg-card border border-border p-1 rounded-xl mb-4 h-10">
                    <TabsTrigger value="warmup" className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-muted-foreground h-8">Warm-up</TabsTrigger>
                    <TabsTrigger value="strength" className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-muted-foreground h-8">Strength</TabsTrigger>
                    <TabsTrigger value="cardio" className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-muted-foreground h-8">Cardio</TabsTrigger>
                    <TabsTrigger value="cooldown" className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-muted-foreground h-8">Cool-down</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="warmup" className="m-0 mt-2 focus-visible:outline-none">
                    <ExerciseTable title="Warm-up" exercises={formData.warmup} onChange={v => setFormData(p => ({ ...p, warmup: v }))} />
                  </TabsContent>
                  <TabsContent value="strength" className="m-0 mt-2 focus-visible:outline-none">
                    <ExerciseTable title="Strength" exercises={formData.strength} onChange={v => setFormData(p => ({ ...p, strength: v }))} />
                  </TabsContent>
                  <TabsContent value="cardio" className="m-0 mt-2 focus-visible:outline-none">
                    <ExerciseTable title="Cardio" exercises={formData.cardio} onChange={v => setFormData(p => ({ ...p, cardio: v }))} />
                  </TabsContent>
                  <TabsContent value="cooldown" className="m-0 mt-2 focus-visible:outline-none">
                    <ExerciseTable title="Cool-down" exercises={formData.cooldown} onChange={v => setFormData(p => ({ ...p, cooldown: v }))} />
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>

            {/* Tracking Tab */}
            <TabsContent value="tracking" className="pt-4">
              <WeeklyTracking formData={formData} setFormData={setFormData} />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border text-foreground hover:bg-accent">Cancel</Button>
            <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-[#d4a017] to-[#f5c842] text-black font-bold border-none hover:opacity-90">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {program?.id ? "Update Program" : "Save Program"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WeeklyTracking({ formData, setFormData }) {
  const { weightUnit } = useUnitSystem();
  const weeks = formData.weekly_tracking || [];
  const sections = ["warmup", "strength", "cardio", "cooldown"];

  const addWeek = () => {
    const weekNum = weeks.length + 1;
    const startDate = formData.start_date ? new Date(formData.start_date) : new Date();
    startDate.setDate(startDate.getDate() + (weekNum - 1) * 7);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 5);
    const newWeek = {
      week_number: weekNum,
      week_start: startDate.toISOString().split("T")[0],
      week_end: endDate.toISOString().split("T")[0],
      days: Array.from({ length: 6 }, (_, d) => {
        const dayDate = new Date(startDate);
        dayDate.setDate(startDate.getDate() + d);
        return {
          date: dayDate.toISOString().split("T")[0],
          warmup: formData.warmup.map(() => ({ actual_reps: "", actual_wts: "" })),
          strength: formData.strength.map(() => ({ actual_reps: "", actual_wts: "" })),
          cardio: formData.cardio.map(() => ({ actual_reps: "", actual_wts: "" })),
          cooldown: formData.cooldown.map(() => ({ actual_reps: "", actual_wts: "" })),
        };
      }),
    };
    setFormData(prev => ({ ...prev, weekly_tracking: [...(prev.weekly_tracking || []), newWeek] }));
  };

  const updateActual = (wIdx, dIdx, section, eIdx, field, val) => {
    setFormData(prev => {
      const wt = JSON.parse(JSON.stringify(prev.weekly_tracking || []));
      if (!wt[wIdx].days[dIdx][section]) {
        wt[wIdx].days[dIdx][section] = [];
      }
      while (wt[wIdx].days[dIdx][section].length <= eIdx) {
        wt[wIdx].days[dIdx][section].push({ actual_reps: "", actual_wts: "" });
      }
      wt[wIdx].days[dIdx][section][eIdx][field] = val;
      return { ...prev, weekly_tracking: wt };
    });
  };

  if (weeks.length === 0) {
    return (
      <div className="text-center py-10 bg-secondary border border-border rounded-xl">
        <p className="text-muted-foreground text-sm mb-3">No weeks added yet. Add a week to start tracking.</p>
        <Button type="button" onClick={addWeek} className="bg-gradient-to-r from-[#d4a017] to-[#f5c842] text-black font-bold border-none hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" /> Add Week 1
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {weeks.map((week, wIdx) => (
        <div key={wIdx} className="border border-border rounded-xl overflow-hidden bg-secondary">
          <div className="bg-black/60 text-foreground px-4 py-2 flex items-center justify-between border-b border-border">
            <span className="font-semibold text-sm">Week #{week.week_number} — {week.week_start} to {week.week_end}</span>
            <Button type="button" size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs h-7" onClick={() => setFormData(prev => ({ ...prev, weekly_tracking: prev.weekly_tracking.filter((_, i) => i !== wIdx) }))}>
              Remove Week
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left p-2 font-medium text-muted-foreground min-w-[120px]">Exercise</th>
                  {week.days.map((day, dIdx) => (
                    <th key={dIdx} colSpan={2} className="text-center p-2 font-medium text-muted-foreground border-l border-border">
                      <div>Day {dIdx + 1}</div>
                      <div className="font-normal text-muted-foreground text-[10px]">{day.date}</div>
                    </th>
                  ))}
                </tr>
                <tr className="bg-secondary border-t border-border">
                  <th className="p-1 border-b border-border"></th>
                  {week.days.map((_, dIdx) => (
                    <React.Fragment key={dIdx}>
                      <th className="p-1 text-center font-normal text-muted-foreground border-l border-b border-border w-14">Reps</th>
                      <th className="p-1 text-center font-normal text-muted-foreground border-b border-border w-14">Wts</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sections.map(section => {
                  const sectionExercises = formData[section] || [];
                  if (sectionExercises.length === 0) return null;
                  return (
                    <React.Fragment key={section}>
                      <tr className="bg-secondary border-b border-border">
                        <td colSpan={1 + week.days.length * 2} className="px-2 py-1 font-semibold text-foreground capitalize text-[11px]">{section === "cooldown" ? "Cool-down" : section}</td>
                      </tr>
                      {sectionExercises.map((ex, eIdx) => (
                        <tr key={eIdx} className="border-b border-border last:border-0">
                          <td className="p-2 text-foreground">{ex.name || `Exercise ${eIdx + 1}`}
                            <div className="text-muted-foreground text-[10px] mt-0.5">Sug: {ex.reps || "—"} reps / {ex.weight_lbs || "—"} {weightUnit}</div>
                          </td>
                          {week.days.map((day, dIdx) => {
                            const entry = day[section]?.[eIdx] || {};
                            return (
                              <React.Fragment key={dIdx}>
                                <td className="p-1 border-l border-border">
                                  <Input
                                    value={entry.actual_reps || ""}
                                    onChange={e => updateActual(wIdx, dIdx, section, eIdx, "actual_reps", e.target.value)}
                                    className="h-7 w-12 mx-auto text-xs text-center bg-card border-border text-foreground px-1"
                                    placeholder={ex.reps || ""}
                                  />
                                </td>
                                <td className="p-1">
                                  <Input
                                    value={entry.actual_wts || ""}
                                    onChange={e => updateActual(wIdx, dIdx, section, eIdx, "actual_wts", e.target.value)}
                                    className="h-7 w-12 mx-auto text-xs text-center bg-card border-border text-foreground px-1"
                                    placeholder={ex.weight_lbs || ""}
                                  />
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <Button type="button" onClick={addWeek} variant="outline" className="w-full gap-2 border-border text-foreground hover:bg-accent">
        <Plus className="w-4 h-4" /> Add Week {weeks.length + 1}
      </Button>
    </div>
  );
}