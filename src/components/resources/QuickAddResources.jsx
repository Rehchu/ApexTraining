import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Loader2, Plus, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SOURCES = [
  {
    id: "exercemus",
    name: "Exercemus - Exercise Database",
    url: "https://github.com/exercemus",
    category: "workout",
    description: "Comprehensive exercise database with demonstrations and form guides",
    quickResources: [
      { title: "Proper Squat Form", content: "The squat is a fundamental exercise. Start with feet shoulder-width apart, toes slightly pointed out. Keep your chest up and core engaged. Lower by pushing hips back and bending knees, keeping knees aligned with toes. Go as low as mobility allows while maintaining form. Drive through heels to stand." },
      { title: "Deadlift Technique", content: "Approach the bar with feet hip-width apart. Grip outside your legs. Keep back straight, chest up. Drive through heels, extending hips and knees simultaneously. Keep bar close to body throughout movement. Reverse motion with control." },
      { title: "Bench Press Basics", content: "Lie flat on bench with feet on floor. Grip bar slightly wider than shoulders. Lower bar to mid-chest with controlled motion. Keep elbows at 45-degree angle. Press explosively back to starting position. Maintain stable shoulder position throughout." }
    ]
  },
  {
    id: "medical",
    name: "MedlinePlus Medical Encyclopedia",
    url: "https://medlineplus.gov/ency/encyclopedia_D.htm",
    category: "medical",
    description: "Trusted medical information and health conditions",
    quickResources: [
      { title: "Understanding Muscle Strains", content: "A muscle strain occurs when muscle fibers are overstretched or torn. Common in athletes and active individuals. Rest, ice, compression, and elevation (RICE) are initial treatments. Mild strains heal in 2-3 weeks, severe strains may take months. Always warm up properly before exercise to prevent strains." },
      { title: "Proper Hydration for Exercise", content: "Hydration is crucial for performance and safety. Drink 17-20oz of water 2-3 hours before exercise. During exercise, drink 7-10oz every 10-20 minutes. After exercise, drink 16-24oz for every pound of body weight lost. Watch for signs of dehydration: dark urine, dizziness, fatigue." },
      { title: "Managing Exercise-Induced Asthma", content: "Exercise can trigger asthma symptoms in some people. Warm up for 10-15 minutes before intense activity. Use prescribed inhaler before exercise if recommended. Breathe through nose when possible. Avoid exercising in cold, dry air or when air quality is poor. Cool down gradually after exercise." }
    ]
  },
  {
    id: "nasm",
    name: "NASM Blog - Sports Medicine",
    url: "https://blog.nasm.org/",
    category: "general",
    description: "Evidence-based fitness and training information",
    quickResources: [
      { title: "Progressive Overload Principles", content: "Progressive overload is key to continued improvement. Gradually increase weight, reps, or sets over time. Aim for 2-5% weight increases when you can complete all prescribed reps with good form. Track workouts to monitor progress. Rest and recovery are equally important as training stimulus." },
      { title: "Periodization for Better Results", content: "Periodization involves planned variation in training. Start with higher volume, lower intensity (anatomical adaptation). Progress to strength phase with moderate volume and higher intensity. Peak with low volume, highest intensity. Include deload weeks every 4-6 weeks to allow recovery." },
      { title: "Core Training Fundamentals", content: "Core stability is essential for all movement. Include anti-rotation exercises (Pallof press), anti-extension (planks), and anti-lateral flexion (side planks). Train core 2-3 times per week. Focus on controlled movement and proper breathing. Progress from static holds to dynamic movements." }
    ]
  },
  {
    id: "nutrition",
    name: "Nutrition Guidelines",
    category: "nutrition",
    description: "Evidence-based nutrition and meal planning information",
    quickResources: [
      { title: "Protein Intake for Athletes", content: "Athletes need 1.6-2.2g protein per kg body weight daily. Distribute evenly across 4-5 meals. Complete proteins contain all essential amino acids (meat, fish, eggs, dairy). Plant proteins can be combined (beans + rice). Post-workout: 20-40g protein within 2 hours for optimal recovery." },
      { title: "Pre-Workout Nutrition", content: "Eat 2-3 hours before training: complex carbs + lean protein + minimal fat. 30-60 min before: easily digestible carbs (banana, toast). Avoid high fiber and high fat before training. Stay hydrated. If training early morning, small snack is acceptable if needed." },
      { title: "Meal Prep for Success", content: "Plan meals weekly based on goals. Batch cook proteins, complex carbs, vegetables. Store in portioned containers. Include variety to prevent boredom. Prep 2-3 days at once for freshness. Always have healthy snacks ready (nuts, fruit, protein bars). Consistency is key to results." }
    ]
  },
  {
    id: "mmfit",
    name: "MMFit - Training Resources",
    url: "https://mmfit.github.io/",
    category: "workout",
    description: "Comprehensive fitness and training methodology resources",
    quickResources: [
      { title: "Movement Patterns & Exercise Selection", content: "Base training around fundamental movement patterns: squat, hinge, push, pull, carry, and rotation. Select exercises that match client's skill level and mobility. Progress from bilateral to unilateral movements. Include both vertical and horizontal pushing/pulling variations. Prioritize compound movements before isolation work. Movement quality always takes precedence over load." },
      { title: "Training Program Structure", content: "Structure programs with clear phases: anatomical adaptation (2-4 weeks), hypertrophy (4-6 weeks), strength (3-4 weeks), and power if needed. Use appropriate rep ranges: 12-15 for endurance, 8-12 for hypertrophy, 4-6 for strength. Include deload weeks every 4th week. Balance push/pull ratios to prevent imbalances. Track volume and intensity to ensure progressive overload." },
      { title: "Recovery & Adaptation Principles", content: "Muscle growth occurs during recovery, not training. Ensure 48-72 hours between training same muscle groups. Sleep 7-9 hours nightly for optimal recovery. Active recovery (walking, light mobility) can aid recovery. Manage training stress through periodization. Monitor recovery markers: sleep quality, resting heart rate, motivation. Adjust training volume based on recovery capacity." }
    ]
  }
];

export default function QuickAddResources({ onAdd, trainerId }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(null);

  const handleQuickAdd = async (source, resource) => {
    setAdding(resource.title);
    try {
      await base44.entities.Resource.create({
        title: resource.title,
        content: resource.content,
        category: source.category,
        source_url: source.url,
        source_name: source.name,
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
            <BookOpen className="w-5 h-5 text-green-400" />
            Quick Add
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Browse and add predefined resources directly to your library.
          </p>
        </CardHeader>
        <CardContent className="mt-auto">
          <Button onClick={() => setOpen(true)} className="w-full bg-secondary hover:bg-accent text-foreground border-0 transition-colors">
            <BookOpen className="w-4 h-4 mr-2" />
            Browse Sources
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quick Add Resources from Trusted Sources</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="exercemus" className="mt-4">
            <TabsList className="grid w-full grid-cols-5">
              {SOURCES.map(source => (
                <TabsTrigger key={source.id} value={source.id} className="text-xs">
                  {source.name.split(' - ')[0]}
                </TabsTrigger>
              ))}
            </TabsList>

            {SOURCES.map(source => (
              <TabsContent key={source.id} value={source.id} className="space-y-4">
                <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{source.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">{source.description}</p>
                  </div>
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-700"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>

                <div className="space-y-3">
                  {source.quickResources.map((resource, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">{resource.title}</CardTitle>
                          <Button
                            size="sm"
                            onClick={() => handleQuickAdd(source, resource)}
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
                        <p className="text-sm text-slate-600">{resource.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>Tip:</strong> Visit{' '}
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-700"
                    >
                      {source.name}
                    </a>
                    {' '}for more resources. You can copy content and create custom resources.
                  </p>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}