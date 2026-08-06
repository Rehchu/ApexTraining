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

import { Dumbbell, Plus, Trash2, Loader2, Search, ChevronDown, GripVertical } from "lucide-react";
import { showSuccess } from "@/components/ui/success-toast";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function WorkoutForm({ open, onOpenChange, workout, clients, onSubmit, simpleMode = false }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    client_id: "",
    difficulty: "intermediate",
    duration_weeks: 4,
    days_per_week: 3,
    mesocycle_phase: "hypertrophy",
    block_number: 1,
    status: "active",
    daily_exercises: {} // { "1": [{ name, sets, reps, target_rir, ... }], "2": [...] }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(null);
  const [expandedDays, setExpandedDays] = useState({ 1: true });

  React.useEffect(() => {
    if (workout) {
      // Convert exercises array back to daily_exercises structure
      const daily_exercises = {};
      if (workout.exercises && Array.isArray(workout.exercises)) {
        workout.exercises.forEach(exercise => {
          const day = exercise.day || 1;
          if (!daily_exercises[day]) daily_exercises[day] = [];
          daily_exercises[day].push(exercise);
        });
      }
      
      // Ensure all exercises have a stable ID for drag and drop
      const exercisesWithIds = {};
      Object.entries(Object.keys(daily_exercises).length > 0 ? daily_exercises : (workout.daily_exercises || {})).forEach(([day, exList]) => {
        exercisesWithIds[day] = exList.map(ex => ({ ...ex, _id: ex._id || Math.random().toString(36).substr(2,9) }));
      });

      setFormData({
        name: "",
        description: "",
        client_id: "",
        difficulty: "intermediate",
        duration_weeks: 4,
        days_per_week: 3,
        mesocycle_phase: "hypertrophy",
        block_number: 1,
        status: "active",
        ...workout,
        daily_exercises: exercisesWithIds
      });
    } else {
      setFormData({
         name: "",
         description: "",
         client_id: "",
         difficulty: "intermediate",
         duration_weeks: 4,
         days_per_week: 3,
         status: "active",
         daily_exercises: {}
       });
    }
  }, [workout, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Convert daily_exercises to flat exercises array for storage
      const exercises = [];
      Object.entries(formData.daily_exercises || {}).forEach(([dayNum, dayExercises]) => {
        dayExercises.forEach(exercise => {
          exercises.push({
            ...exercise,
            day: parseInt(dayNum)
          });
        });
      });
      
      const selectedClient = clients?.find(c => c.id === formData.client_id || c.user_id === formData.client_id);
      const clientIdToSave = selectedClient ? (selectedClient.user_id || selectedClient.id) : formData.client_id;
      
      await onSubmit({
        ...formData,
        client_id: clientIdToSave,
        exercises,
        daily_exercises: undefined
      });
      showSuccess(workout ? "Workout Updated!" : "Workout Created!", workout ? "Changes saved successfully" : "New workout plan is ready");
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleExerciseChange = (dayNum, index, field, value) => {
    setFormData(prev => {
      const newDailyExercises = { ...prev.daily_exercises };
      if (!newDailyExercises[dayNum]) newDailyExercises[dayNum] = [];
      newDailyExercises[dayNum][index] = { ...newDailyExercises[dayNum][index], [field]: value };
      return { ...prev, daily_exercises: newDailyExercises };
    });
  };

  const addExercise = (dayNum) => {
    setFormData(prev => {
      const newDailyExercises = { ...prev.daily_exercises };
      if (!newDailyExercises[dayNum]) newDailyExercises[dayNum] = [];
      newDailyExercises[dayNum] = [...newDailyExercises[dayNum], { _id: Math.random().toString(36).substr(2,9), name: "", sets: 3, reps: "10-12", target_rir: 2, rest_seconds: 60, notes: "" }];
      return { ...prev, daily_exercises: newDailyExercises };
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const sourceDay = result.source.droppableId;
    const destDay = result.destination.droppableId;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    setFormData(prev => {
      const newDailyExercises = { ...prev.daily_exercises };
      const sourceList = Array.from(newDailyExercises[sourceDay] || []);
      const [movedItem] = sourceList.splice(sourceIndex, 1);
      
      if (sourceDay === destDay) {
        sourceList.splice(destIndex, 0, movedItem);
        newDailyExercises[sourceDay] = sourceList;
      } else {
        const destList = Array.from(newDailyExercises[destDay] || []);
        destList.splice(destIndex, 0, movedItem);
        newDailyExercises[sourceDay] = sourceList;
        newDailyExercises[destDay] = destList;
      }
      
      return { ...prev, daily_exercises: newDailyExercises };
    });
  };

  const removeExercise = (dayNum, index) => {
    setFormData(prev => {
      const newDailyExercises = { ...prev.daily_exercises };
      if (newDailyExercises[dayNum]) {
        newDailyExercises[dayNum] = newDailyExercises[dayNum].filter((_, i) => i !== index);
      }
      return { ...prev, daily_exercises: newDailyExercises };
    });
  };

  const duplicateDay = (dayNum, e) => {
    e.stopPropagation();
    setFormData(prev => {
      const newDailyExercises = { ...prev.daily_exercises };
      const sourceExercises = newDailyExercises[dayNum] || [];
      let targetDay = parseInt(dayNum) + 1;
      while (newDailyExercises[targetDay] && newDailyExercises[targetDay].length > 0) {
        targetDay++;
      }
      newDailyExercises[targetDay] = sourceExercises.map(ex => ({ ...ex, _id: Math.random().toString(36).substr(2,9) }));
      setExpandedDays(ed => ({ ...ed, [targetDay]: true }));
      return { ...prev, daily_exercises: newDailyExercises };
    });
    toast.success(`Day duplicated`);
  };

  const duplicateWeek = (weekNum) => {
    setFormData(prev => {
      const newDailyExercises = { ...prev.daily_exercises };
      const startDay = (weekNum - 1) * 7 + 1;
      const endDay = startDay + 6;
      
      const targetStartDay = endDay + 1;
      
      for (let i = 0; i <= 6; i++) {
        const sourceDay = startDay + i;
        const targetDay = targetStartDay + i;
        if (newDailyExercises[sourceDay] && newDailyExercises[sourceDay].length > 0) {
          newDailyExercises[targetDay] = newDailyExercises[sourceDay].map(ex => ({ ...ex, _id: Math.random().toString(36).substr(2,9) }));
        }
      }
      return { ...prev, daily_exercises: newDailyExercises, duration_weeks: Math.max(prev.duration_weeks, weekNum + 1) };
    });
    toast.success(`Week ${weekNum} duplicated to Week ${weekNum + 1}`);
  };

  const handleSearchExercises = async (query, index) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setActiveSearchIndex(index);
    
    try {
      const { data } = await base44.functions.invoke('searchExercises', { 
        search: query,
        limit: 50 
      });
      setSearchResults(data.exercises || []);
    } catch (error) {
      console.error('Error searching exercises:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectExercise = (dayNum, index, exercise) => {
    setFormData(prev => {
      const newDailyExercises = { ...prev.daily_exercises };
      if (!newDailyExercises[dayNum]) newDailyExercises[dayNum] = [];
      newDailyExercises[dayNum][index] = {
        ...newDailyExercises[dayNum][index],
        name: exercise.name,
        gif_url: exercise.gifUrl,
        body_part: exercise.bodyPart,
        target: exercise.target,
        equipment: exercise.equipment
      };
      return { ...prev, daily_exercises: newDailyExercises };
    });
    setSearchResults([]);
    setActiveSearchIndex(null);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl h-[95vh] flex flex-col bg-card border-border text-foreground p-0 overflow-hidden" aria-describedby="workout-form-description">
        <DialogHeader className="p-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl text-foreground" id="workout-form-description">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-foreground" />
            </div>
            {workout ? "Edit Workout Plan" : "Create Workout Plan"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name" className="text-muted-foreground">Plan Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Strength Building Program"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="input-frosted text-foreground"
                required
              />
            </div>

            {!simpleMode && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Assign to Client</Label>
              <Select value={clients?.find(c => c.id === formData.client_id || c.user_id === formData.client_id)?.id || formData.client_id || "none"} onValueChange={(v) => handleChange("client_id", v === "none" ? "" : v)}>
                <SelectTrigger className="input-frosted text-foreground">
                  <SelectValue placeholder="Select client (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="none">Unassigned</SelectItem>
                  {clients?.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label className="text-muted-foreground">Difficulty</Label>
              <Select value={formData.difficulty} onValueChange={(v) => handleChange("difficulty", v)}>
                <SelectTrigger className="input-frosted text-foreground">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!simpleMode && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Mesocycle Phase</Label>
              <Select value={formData.mesocycle_phase} onValueChange={(v) => handleChange("mesocycle_phase", v)}>
                <SelectTrigger className="input-frosted text-foreground">
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="hypertrophy">Hypertrophy (Volume)</SelectItem>
                  <SelectItem value="strength">Strength (Intensity)</SelectItem>
                  <SelectItem value="peaking">Peaking</SelectItem>
                  <SelectItem value="deload">Deload (Recovery)</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            )}

            {!simpleMode && (
            <div className="space-y-2">
              <Label htmlFor="block_number" className="text-muted-foreground">Block Number</Label>
              <Input
                id="block_number"
                type="number"
                min="1"
                className="input-frosted text-foreground"
                value={formData.block_number}
                onChange={(e) => handleChange("block_number", parseInt(e.target.value))}
              />
            </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="duration_weeks" className="text-muted-foreground">Duration (weeks)</Label>
              <div className="flex gap-2">
                <Input
                  id="duration_weeks"
                  type="number"
                  min="1"
                  className="input-frosted text-foreground flex-1"
                  value={formData.duration_weeks}
                  onChange={(e) => handleChange("duration_weeks", parseInt(e.target.value))}
                />
                <Button type="button" variant="outline" onClick={() => duplicateWeek(Math.max(1, (formData.duration_weeks || 1) - 1))} className="bg-secondary border-border text-xs px-3 text-foreground hover:bg-accent hover:text-foreground" title="Duplicate exercises from previous week to the current last week">
                  Dup. Prev Week
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="days_per_week" className="text-muted-foreground">Days per Week</Label>
              <Input
                id="days_per_week"
                type="number"
                min="1"
                max="7"
                className="input-frosted text-foreground"
                value={formData.days_per_week}
                onChange={(e) => handleChange("days_per_week", parseInt(e.target.value))}
              />
            </div>

            {!simpleMode && (
            <div className="space-y-2 sm:col-span-2 pt-2 pb-2">
              <div className="flex items-center justify-between p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <div>
                  <Label className="text-purple-500 font-bold block mb-1">Predictive Dynamic Adaptation</Label>
                  <p className="text-xs text-muted-foreground">Automatically scales volume, adjusts exercise selection, and suggests specific mobility drills based on AI injury risk flags from morning readiness, HRV, and sleep metrics.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange("dynamic_adaptation", !formData.dynamic_adaptation)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${formData.dynamic_adaptation ? 'bg-purple-500' : 'bg-gray-400'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${formData.dynamic_adaptation ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            )}

            </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-muted-foreground">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the workout plan..."
              className="min-h-[60px] input-frosted text-foreground"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-base text-foreground">Daily Exercises (Drag & Drop to reorder)</Label>

            <DragDropContext onDragEnd={handleDragEnd}>
              {Array.from({ length: Math.min(31, (formData.duration_weeks || 4) * 7) }).map((_, dayIdx) => {
              const dayNum = dayIdx + 1;
              const dayExercises = formData.daily_exercises?.[dayNum] || [];
              const isOpen = !!expandedDays[dayNum];

              return (
                <Collapsible key={dayNum} open={isOpen} onOpenChange={(open) => setExpandedDays(prev => ({ ...prev, [dayNum]: open }))}>
                  <div className="rounded-xl border border-border overflow-hidden bg-secondary">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 bg-secondary cursor-pointer hover:bg-accent transition-colors">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          <span className="font-semibold text-foreground">Day {dayNum}</span>
                          {dayExercises.length > 0 && (
                            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">{dayExercises.length} exercise{dayExercises.length !== 1 ? "s" : ""}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {dayExercises.length > 0 && (
                            <Button type="button" variant="ghost" size="sm" onClick={(e) => duplicateDay(dayNum, e)} className="h-7 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-400/10">
                              Duplicate Day
                            </Button>
                          )}
                          <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); addExercise(dayNum); setExpandedDays(prev => ({ ...prev, [dayNum]: true })); }} className="gap-1 h-7 text-xs bg-secondary border-border text-foreground hover:bg-accent hover:text-foreground">
                            <Plus className="w-3 h-3" /> Add Exercise
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                     <div className="p-3 space-y-3">
                       {dayExercises.length === 0 ? (
                         <div className="text-sm text-muted-foreground text-center py-4">No exercises — click Add Exercise to get started</div>
                       ) : (
                         <Droppable droppableId={dayNum.toString()}>
                           {(provided) => (
                             <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 min-h-[50px]">
                               {dayExercises.map((exercise, index) => (
                                 <Draggable key={exercise._id || index.toString()} draggableId={exercise._id || `${dayNum}-${index}`} index={index}>
                                   {(provided, snapshot) => (
                                     <div 
                                       ref={provided.innerRef} 
                                       {...provided.draggableProps} 
                                       className={`p-3 bg-secondary rounded-lg border border-border space-y-2 relative transition-colors ${snapshot.isDragging ? 'bg-secondary border-purple-500/50 shadow-lg' : ''}`}
                                     >
                                       <div className="flex items-center justify-between">
                                         <div className="flex items-center gap-2">
                                           <div {...provided.dragHandleProps} className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing">
                                             <GripVertical className="w-4 h-4" />
                                           </div>
                                           <span className="text-xs font-medium text-muted-foreground">Exercise {index + 1}</span>
                                           {exercise.is_superset && (
                                              <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded border border-orange-500/30">Superset ↓</span>
                                           )}
                                         </div>
                                         <div className="flex items-center gap-2">
                                           <Button
                                             type="button"
                                             variant="ghost"
                                             size="sm"
                                             onClick={() => handleExerciseChange(dayNum, index, "is_superset", !exercise.is_superset)}
                                             className={`h-6 text-xs px-2 ${exercise.is_superset ? 'text-orange-400 bg-orange-500/10' : 'text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10'}`}
                                           >
                                             Link Superset
                                           </Button>
                                           <Button
                                             type="button"
                                             variant="ghost"
                                             size="icon"
                                             onClick={() => removeExercise(dayNum, index)}
                                             className="h-5 w-5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                                           >
                                             <Trash2 className="w-3 h-3" />
                                           </Button>
                                         </div>
                                       </div>
                               <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                 <div className="col-span-2 relative z-40">
                                   <Input
                                     placeholder="Type or search exercises..."
                                     value={activeSearchIndex === `${dayNum}-${index}` ? searchQuery : exercise.name}
                                     onChange={(e) => {
                                       const value = e.target.value;
                                       setSearchQuery(value);
                                       setActiveSearchIndex(`${dayNum}-${index}`);
                                       handleExerciseChange(dayNum, index, "name", value);
                                       handleSearchExercises(value, `${dayNum}-${index}`);
                                     }}
                                     onFocus={() => {
                                       setActiveSearchIndex(`${dayNum}-${index}`);
                                       setSearchQuery(exercise.name || "");
                                     }}
                                     onBlur={() => {
                                       setTimeout(() => {
                                         setActiveSearchIndex(null);
                                         setSearchResults([]);
                                         setSearchQuery("");
                                       }, 200);
                                     }}
                                     className="h-9 input-frosted text-foreground pr-8"
                                   />
                                   <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                                   {activeSearchIndex === `${dayNum}-${index}` && searchQuery && (
                                     <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto" style={{ zIndex: 9999 }}>
                                       {isSearching ? (
                                         <div className="p-3 text-center">
                                           <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
                                         </div>
                                       ) : searchResults.length > 0 ? (
                                         searchResults.map((result, i) => (
                                           <button
                                             key={i}
                                             type="button"
                                             className="w-full px-3 py-2 text-left hover:bg-accent border-b border-border text-xs last:border-0 text-foreground transition-colors"
                                             onMouseDown={(e) => {
                                               e.preventDefault();
                                               handleSelectExercise(dayNum, index, result);
                                             }}
                                           >
                                             <div className="font-medium text-foreground">{result.name}</div>
                                             <div className="text-muted-foreground text-[10px] mt-0.5">{result.bodyPart} • {result.target}</div>
                                           </button>
                                         ))
                                       ) : searchQuery.length >= 2 ? (
                                         <div className="p-3 text-center text-xs text-muted-foreground">No exercises found</div>
                                       ) : null}
                                     </div>
                                   )}
                                 </div>
                                 <Input
                                   type="number"
                                   placeholder="Sets"
                                   min="1"
                                   value={exercise.sets}
                                   onChange={(e) => handleExerciseChange(dayNum, index, "sets", parseInt(e.target.value))}
                                   className="h-9 input-frosted text-foreground"
                                 />
                                 <Input
                                   placeholder="Reps"
                                   value={exercise.reps}
                                   onChange={(e) => handleExerciseChange(dayNum, index, "reps", e.target.value)}
                                   className="h-9 input-frosted text-foreground"
                                 />
                                 <div className="col-span-2 sm:col-span-4 mt-2">
                                   <div className="flex items-center gap-2">
                                      <Label className="text-muted-foreground whitespace-nowrap">Target RIR:</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="5"
                                        placeholder="Reps in Reserve (e.g. 2)"
                                        value={exercise.target_rir !== undefined ? exercise.target_rir : ''}
                                        onChange={(e) => handleExerciseChange(dayNum, index, "target_rir", parseInt(e.target.value))}
                                        className="h-8 w-24 input-frosted text-foreground text-xs"
                                      />
                                   </div>
                                 </div>
                                 </div>
                               </div>
                             )}
                           </Draggable>
                         ))}
                         {provided.placeholder}
                         <Button 
                           type="button" 
                           variant="outline" 
                           className="w-full mt-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-white/40 hover:bg-accent"
                           onClick={() => addExercise(dayNum)}
                         >
                           <Plus className="w-4 h-4 mr-2" /> Add Another Exercise
                         </Button>
                       </div>
                     )}
                   </Droppable>
                 )}
                     </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
            </DragDropContext>
          </div>


          </div>
          <div className="flex justify-end gap-3 p-6 border-t border-border bg-card shrink-0 mt-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-secondary border-border text-foreground hover:bg-accent hover:text-foreground">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-foreground border-0"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {workout ? "Update Plan" : "Create Plan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}