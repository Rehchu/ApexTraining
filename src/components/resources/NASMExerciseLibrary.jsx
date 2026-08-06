import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Search, Filter } from "lucide-react";

const EXERCISES = [
  { name: "Barbell Deadlift", slug: "barbell-deadlift", bodyPart: ["Quadriceps", "Glutes", "Hamstrings"], equipment: "Barbell", difficulty: "Intermediate" },
  { name: "Kettlebell Deadlift", slug: "kettlebell-deadlift", bodyPart: ["Quadriceps", "Hamstrings", "Glutes"], equipment: "Kettlebell", difficulty: "Beginner" },
  { name: "Dumbbell Romanian Deadlift", slug: "dumbbell-romanian-deadlift", bodyPart: ["Hamstrings", "Glutes"], equipment: "Dumbbells", difficulty: "Intermediate" },
  { name: "Lying Leg Curl", slug: "lying-leg-curl", bodyPart: ["Hamstrings", "Calves"], equipment: "Machine", difficulty: "Beginner" },
  { name: "Barbell Bicep Curl", slug: "barbell-bicep-curl", bodyPart: ["Biceps"], equipment: "Barbell", difficulty: "Beginner" },
  { name: "Floor Bridge", slug: "floor-bridge", bodyPart: ["Core", "Glutes"], equipment: "None", difficulty: "Beginner" },
  { name: "Floor Prone Cobra", slug: "floor-prone-cobra", bodyPart: ["Upper Back", "Shoulders"], equipment: "None", difficulty: "Beginner" },
  { name: "Good Mornings", slug: "good-mornings", bodyPart: ["Hamstrings", "Glutes"], equipment: "Barbell", difficulty: "Intermediate" },
  { name: "Side Plank", slug: "side-plank", bodyPart: ["Abdominals"], equipment: "None", difficulty: "Beginner" },
  { name: "Plank", slug: "plank", bodyPart: ["Abdominals"], equipment: "None", difficulty: "Beginner" },
  { name: "Plank Walkup", slug: "plank-walkup", bodyPart: ["Abdominals"], equipment: "None", difficulty: "Intermediate" },
  { name: "Straight-Arm Plank", slug: "straight-arm-plank", bodyPart: ["Abdominals"], equipment: "None", difficulty: "Beginner" },
  { name: "Prisoner Squat", slug: "prisoner-squat", bodyPart: ["Thighs", "Glutes", "Calves"], equipment: "None", difficulty: "Beginner" },
  { name: "Squat Jump", slug: "squat-jump", bodyPart: ["Full Body"], equipment: "None", difficulty: "Intermediate" },
  { name: "Bulgarian Split Squat", slug: "bulgarian-split-squat", bodyPart: ["Quadriceps", "Glutes"], equipment: "Bench, Dumbbells", difficulty: "Intermediate" },
  { name: "Goblet Squat", slug: "goblet-squat", bodyPart: ["Quadriceps", "Glutes"], equipment: "Kettlebell", difficulty: "Beginner" },
  { name: "Dumbbell Front Squat", slug: "dumbbell-front-squat", bodyPart: ["Quadriceps", "Glutes"], equipment: "Dumbbells", difficulty: "Beginner" },
  { name: "Squat Thrust (Burpees)", slug: "squat-thrust-burpees", bodyPart: ["Full Body"], equipment: "None", difficulty: "Advanced" },
  { name: "Kettlebell Front Squat", slug: "kettlebell-front-squat", bodyPart: ["Quadriceps", "Glutes"], equipment: "Kettlebell", difficulty: "Beginner" },
  { name: "Bird Dog", slug: "bird-dog", bodyPart: ["Core", "Erector Spinae"], equipment: "None", difficulty: "Beginner" },
  { name: "Pull-Up", slug: "pull-up", bodyPart: ["Back", "Latissimus Dorsi", "Shoulders"], equipment: "Pull-Up Bar", difficulty: "Intermediate" },
  { name: "Band Assisted Pull-Up", slug: "band-assisted-pull-up", bodyPart: ["Back", "Latissimus Dorsi"], equipment: "Pull-Up Bar, Band", difficulty: "Intermediate" },
  { name: "Romanian Deadlift (Barbell)", slug: "romanian-deadlift-barbell", bodyPart: ["Hamstrings", "Glutes"], equipment: "Barbell", difficulty: "Intermediate" },
  { name: "Russian Twist", slug: "russian-twist", bodyPart: ["Core", "Obliques"], equipment: "Stability Ball", difficulty: "Intermediate" },
  { name: "Push-Up", slug: "push-up", bodyPart: ["Chest", "Shoulders", "Triceps"], equipment: "None", difficulty: "Beginner" },
  { name: "Plyometric Push-Up", slug: "plyometric-push-up", bodyPart: ["Chest", "Shoulders"], equipment: "None", difficulty: "Intermediate" },
  { name: "Pike Push-Up", slug: "pike-push-up", bodyPart: ["Shoulders", "Triceps"], equipment: "None", difficulty: "Intermediate" },
  { name: "Decline Push-Up", slug: "decline-push-up", bodyPart: ["Chest", "Shoulders"], equipment: "Bench", difficulty: "Intermediate" },
  { name: "Dumbbell Shoulder Press", slug: "dumbbell-shoulder-press", bodyPart: ["Shoulders", "Triceps"], equipment: "Dumbbells", difficulty: "Intermediate" },
  { name: "Dumbbell Lateral Raise", slug: "dumbbell-lateral-raise", bodyPart: ["Shoulders", "Deltoids"], equipment: "Dumbbells", difficulty: "Beginner" },
  { name: "Dumbbell Bent-Over Row", slug: "dumbbell-bent-over-row", bodyPart: ["Back", "Biceps"], equipment: "Dumbbells", difficulty: "Intermediate" },
  { name: "Dumbbell Chest Press", slug: "dumbbell-chest-press", bodyPart: ["Chest", "Shoulders", "Triceps"], equipment: "Dumbbells, Bench", difficulty: "Beginner" },
  { name: "Dumbbell Lunges", slug: "dumbbell-lunges", bodyPart: ["Quadriceps", "Glutes", "Hamstrings"], equipment: "Dumbbells", difficulty: "Beginner" },
  { name: "Walking Lunges", slug: "walking-lunges", bodyPart: ["Quadriceps", "Glutes"], equipment: "None", difficulty: "Beginner" },
  { name: "Mountain Climbers", slug: "mountain-climbers", bodyPart: ["Core", "Full Body"], equipment: "None", difficulty: "Intermediate" },
  { name: "Kettlebell Swing", slug: "kettlebell-swing", bodyPart: ["Glutes", "Hamstrings", "Core"], equipment: "Kettlebell", difficulty: "Intermediate" },
  { name: "Medicine Ball Slam", slug: "medicine-ball-slam", bodyPart: ["Full Body", "Core"], equipment: "Medicine Ball", difficulty: "Intermediate" },
  { name: "Box Jump", slug: "box-jump", bodyPart: ["Full Body", "Quadriceps", "Glutes"], equipment: "Box or Step", difficulty: "Intermediate" },
  { name: "Foam Roller IT Band", slug: "foam-roller-it-band", bodyPart: ["Thighs"], equipment: "Foam Roller", difficulty: "Beginner" },
  { name: "Foam Roller Thoracic Spine", slug: "foam-roller-thoracic-spine", bodyPart: ["Upper Back"], equipment: "Foam Roller", difficulty: "Beginner" },
];

const difficultyColor = {
  Beginner: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Intermediate: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Advanced: "bg-red-500/20 text-red-300 border-red-500/30",
};

const ALL_DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

export default function NASMExerciseLibrary() {
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  const filtered = EXERCISES.filter((ex) => {
    const matchSearch =
      !search ||
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.bodyPart.some((bp) => bp.toLowerCase().includes(search.toLowerCase())) ||
      ex.equipment.toLowerCase().includes(search.toLowerCase());
    const matchDiff = difficultyFilter === "All" || ex.difficulty === difficultyFilter;
    return matchSearch && matchDiff;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <img src="https://www.nasm.org/favicon.ico" alt="" className="w-5 h-5 rounded" onError={(e) => e.target.style.display='none'} />
            NASM Exercise Library
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Evidence-based exercise guidance from NASM.{" "}
            <a href="https://www.nasm.org/workout-exercise-guidance" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1">
              View full library <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises, muscles, equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 input-frosted"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {["All", ...ALL_DIFFICULTIES].map((d) => (
            <button
              key={d}
              onClick={() => setDifficultyFilter(d)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                difficultyFilter === d
                  ? "bg-white/15 border-white/30 text-foreground"
                  : "bg-secondary border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} exercises</p>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((ex) => (
          <a
            key={ex.slug}
            href={`https://www.nasm.org/workout-exercise-guidance/default?slug=${ex.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group glass-card rounded-xl overflow-hidden border border-border hover:border-emerald-500/40 transition-all hover:-translate-y-0.5"
          >
            <div className="aspect-video bg-card overflow-hidden">
              <img
                src={`https://www.nasm.org/content/dam/nasm/web/exercises/${ex.slug}.jpg`}
                alt={ex.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.parentElement.classList.add("flex", "items-center", "justify-center");
                  e.target.parentElement.innerHTML = `<span class="text-3xl">🏋️</span>`;
                }}
              />
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-foreground text-sm leading-tight group-hover:text-emerald-300 transition-colors">
                  {ex.name}
                </p>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5 group-hover:text-emerald-400" />
              </div>
              <p className="text-xs text-muted-foreground">{ex.bodyPart.join(", ")}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{ex.equipment}</span>
                <Badge className={`text-[10px] px-1.5 py-0 border ${difficultyColor[ex.difficulty]}`}>
                  {ex.difficulty}
                </Badge>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}