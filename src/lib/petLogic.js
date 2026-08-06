// Pet / gamification logic — pure, testable, no UI.
//
// Pets are earned after 30 days of successful training, then evolve through six
// stages as the owner completes workouts and quests. Trainers and clients can
// both own a pet. The 3D art for each (type, element, stage) is loaded from a
// model map (see PetViewer); until real models are supplied, a procedural 3D
// placeholder is rendered — never an emoji.

export const PET_TYPES = {
  dragon: {
    label: "Dragon",
    elements: ["fire", "water", "acid", "mystery"],
  },
  dinosaur: {
    label: "Dinosaur",
    elements: ["forest", "stone", "bone", "mystery"],
  },
  eagle: {
    label: "Eagle",
    elements: ["golden", "bald", "harpy", "mystery"],
  },
};

// Element → color theme used by the procedural placeholder and the UI accents.
export const ELEMENT_THEME = {
  fire: { primary: "#ef4444", glow: "#f97316", name: "Fire" },
  water: { primary: "#38bdf8", glow: "#0ea5e9", name: "Water" },
  acid: { primary: "#84cc16", glow: "#22c55e", name: "Acid" },
  mystery: { primary: "#a855f7", glow: "#7c3aed", name: "Mystery" },
  forest: { primary: "#16a34a", glow: "#65a30d", name: "Forest" },
  stone: { primary: "#78716c", glow: "#a8a29e", name: "Stone" },
  bone: { primary: "#e7e5e4", glow: "#d6d3d1", name: "Bone" },
  golden: { primary: "#eab308", glow: "#f59e0b", name: "Golden" },
  bald: { primary: "#92400e", glow: "#b45309", name: "Bald" },
  harpy: { primary: "#334155", glow: "#475569", name: "Harpy" },
};

// Ordered evolution stages with the cumulative XP required to reach each.
export const STAGES = [
  { key: "egg", label: "Egg", minXp: 0 },
  { key: "hatchling", label: "Hatchling", minXp: 100 },
  { key: "infant", label: "Infant", minXp: 300 },
  { key: "adolescent", label: "Adolescent", minXp: 700 },
  { key: "adult", label: "Adult", minXp: 1500 },
  { key: "ancient", label: "Ancient", minXp: 3000 },
];

export const XP_PER_WORKOUT = 10;
export const XP_PER_QUEST = 25;
export const UNLOCK_DAYS = 30;

// Total XP from completed activity.
export function computeXp({ workoutsCompleted = 0, questsCompleted = 0 } = {}) {
  return workoutsCompleted * XP_PER_WORKOUT + questsCompleted * XP_PER_QUEST;
}

// Current stage index for a given XP total.
export function stageIndexForXp(xp) {
  let idx = 0;
  for (let i = 0; i < STAGES.length; i++) {
    if (xp >= STAGES[i].minXp) idx = i;
  }
  return idx;
}

export function stageForXp(xp) {
  return STAGES[stageIndexForXp(xp)];
}

// Progress toward the next stage: { current, next, pct, xpIntoStage, xpForStage }.
export function stageProgress(xp) {
  const i = stageIndexForXp(xp);
  const current = STAGES[i];
  const next = STAGES[i + 1] || null;
  if (!next) return { current, next: null, pct: 100, xpIntoStage: 0, xpForStage: 0 };
  const xpIntoStage = xp - current.minXp;
  const xpForStage = next.minXp - current.minXp;
  const pct = Math.max(0, Math.min(100, Math.round((xpIntoStage / xpForStage) * 100)));
  return { current, next, pct, xpIntoStage, xpForStage };
}

// Days of "successful training" — days on which at least one workout was logged.
export function trainingDayCount(workoutLogs = []) {
  const days = new Set(
    workoutLogs
      .filter((l) => l.completed !== false)
      .map((l) => (l.date || l.created_date || "").split("T")[0])
      .filter(Boolean)
  );
  return days.size;
}

// Whether the owner has earned their pet yet (30 successful training days).
export function isPetUnlocked(workoutLogs = []) {
  return trainingDayCount(workoutLogs) >= UNLOCK_DAYS;
}

export function daysUntilUnlock(workoutLogs = []) {
  return Math.max(0, UNLOCK_DAYS - trainingDayCount(workoutLogs));
}
