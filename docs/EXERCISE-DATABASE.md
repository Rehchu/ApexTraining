# Exercise Database Structure

This document describes the coaching exercise database for ApexTraining, seeded from the movement patterns and coaching principles in `COACHING-REFERENCE.md`.

## Overview

The exercise database is automatically seeded on application boot via the `seedCoachingContent()` function in `functions/api/[[path]].js`. It uses an idempotent `INSERT OR IGNORE` pattern, so the seed runs safely on every boot without duplicating data.

**Current Stats:**
- **41 exercises** across 7 movement patterns
- **4 program templates** (full-body, upper/lower, push/pull/legs, recomposition)
- Every pattern has bodyweight fallback options
- All exercises include 1-3 cues with at least one stop-rule or ROM limit

## Database Schema

Exercises are stored as entities in the generic document store:

```sql
-- From schema.sql
CREATE TABLE entities (
  id           TEXT PRIMARY KEY,         -- e.g., "cex_barbell_bench_press"
  entity_type  TEXT NOT NULL,            -- "CoachingExercise"
  data         TEXT NOT NULL,            -- JSON blob with all fields below
  created_by   TEXT,                     -- "system" for seeded content
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL
);
```

## Exercise Data Structure

Each `CoachingExercise` entity contains these fields in the `data` JSON blob:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | string | Exercise name (common gym vocabulary) | "Barbell Bench Press" |
| `pattern` | string | Movement pattern (one of 7 patterns) | "horizontal_push" |
| `equipment` | string | Primary equipment type | "barbell" |
| `equipment_detail` | string | Optional detailed equipment list | "dumbbells, bench" |
| `primary_muscles` | array | Muscles trained by this movement | ["chest", "front deltoid", "triceps"] |
| `joint_tags` | array | Joints under stress (for substitution) | ["shoulder", "elbow"] |
| `unilateral` | boolean | Single-limb exercise flag | false |
| `regression` | string | Easier variation or fallback | "Push-up" |
| `progression` | string | How to advance this exercise | "Load step — add weight when hitting rep range" |
| `leverage_knob` | string | How to increase difficulty without weight | "Slow the lowering to a 3-count and pause on the chest" |
| `cues` | array | 1-3 coaching cues (at least one stop-rule) | ["Tuck elbows 45°", "Keep natural arch", "Stop when form breaks"] |

### Movement Patterns

The seven patterns from `COACHING-REFERENCE.md §1`:

1. **horizontal_push** — chest, front shoulder, triceps (bench press, push-up, dip)
2. **vertical_push** — shoulders, triceps, upper chest (overhead press, pike push-up)
3. **horizontal_pull** — mid-back, rear shoulder, biceps (rows, inverted row, face pull)
4. **vertical_pull** — lats, biceps, forearms (pull-up, chin-up, lat pulldown)
5. **squat** — quads, glutes, trunk (back squat, goblet squat, split squat)
6. **hinge** — hamstrings, glutes, back (deadlift, RDL, hip thrust, swing)
7. **carry_core** — trunk, grip, whole body (farmer carry, plank, dead bug)

### Joint Tags (for substitution logic)

When a user reports pain, the system filters exercises by joint tag:

- `shoulder`
- `elbow`
- `wrist`
- `knee`
- `lower back`
- `hip`
- `ankle`
- `neck`

### Cueing Buckets

Each exercise carries 1-3 cues from these eight categories (`COACHING-REFERENCE.md §2`):

1. **Spine position** — natural arch, no rounding, no tucking
2. **Bracing** — abs tight, glutes squeezed, grip firm
3. **Joint alignment** — knees over toes, elbows under wrists
4. **Anti-movement** — hips level, shoulders square, no twist
5. **Range limits** — "as deep as you can *without* X"
6. **Tempo and pauses** — control the lowering, pause at the hard point
7. **Force direction** — drive feet into floor, push floor away
8. **Stop rules** — end when form breaks, leave 1-2 reps in tank

**At least one cue per exercise must be a stop-rule or ROM limit** (categories 5 & 8).

## Coverage by Pattern

From the latest audit (`scripts/coachingCatalog.audit.mjs`):

| Pattern | Exercises | Bodyweight Options |
|---------|----------:|-------------------:|
| horizontal_push | 6 | 2 |
| vertical_push | 5 | 1 |
| horizontal_pull | 6 | 1 |
| vertical_pull | 5 | 2 |
| squat | 7 | 2 |
| hinge | 6 | 1 |
| carry_core | 6 | 3 |

## Program Templates

Four standard templates are seeded alongside exercises as `FitnessTemplate` entities:

1. **Beginner Full-Body (3-Day)** — `full_body`, beginner
   - Rotating rep schemes (heavy/moderate/high-rep)
   - Load-step progression
   - Non-consecutive days

2. **Upper / Lower Split (4-Day)** — `upper_lower`, intermediate
   - Each session covers push + pull or squat + hinge
   - Hypertrophy defaults (8-12 reps, 60-90s rest)
   - 6-week block

3. **Push / Pull / Legs (3-Day)** — `push_pull_legs`, intermediate
   - Body-part emphasis while obeying balance rule
   - Can run 3x or 6x per week
   - Moderate reps, medium rest

4. **Recomposition Circuit (3-Day)** — `recomposition`, intermediate
   - Upper/lower or push/pull pairings
   - Short rest (<60s), non-competing pairs
   - Rest-compression progression

## Usage

### Frontend (React)

The `NASMExerciseLibrary` component (`src/components/resources/NASMExerciseLibrary.jsx`) automatically fetches and displays the coaching catalog:

```javascript
import { base44 } from "@/api/base44Client";

const exercises = await base44.entities.CoachingExercise.list();
```

Exercises are shown in a searchable, filterable grid with:
- Movement pattern badges
- Primary muscles
- Equipment type
- All three cues
- Regression/progression paths

### API Routes

Exercises are seeded on boot, so they're available immediately:

```javascript
// In functions/api/[[path]].js
export async function onRequest(context) {
  const { env } = context;
  if (env.DB) await ensureSchema(env);  // Seeds on first run
  // ...
}
```

To manually re-seed or verify:

```bash
# Run the audit to verify coverage
node scripts/coachingCatalog.audit.mjs

# Seed to local D1 (requires wrangler)
node scripts/seed-exercises.mjs
```

### Substitution Logic

The app substitutes on *constraint* while keeping *pattern* fixed (`PROGRAMMING-PRINCIPLES.md §6`):

**By equipment:**
```
barbell → dumbbell → band → suspension → bodyweight → playground bar
```

**By joint complaint:**
- Filter out exercises with the sore joint's tag
- Surface the friendly variant (e.g., neutral-grip for shoulder)

**By missing weight:**
1. Slow the tempo
2. Work one limb at a time
3. Shorten rest
4. Run a circuit
5. Raise reps
6. Change leverage (elevate feet, lengthen body angle)

**Never substitute across patterns** — a missing horizontal pull is reported, not quietly swapped for a horizontal push.

## Quality Checks

The catalog passes all automated checks in `scripts/coachingCatalog.audit.mjs`:

✅ All 7 patterns stocked with exercises
✅ Every pattern has at least one bodyweight fallback
✅ All 10 required fields present on every exercise
✅ Every exercise has 1-3 cues, at least one stop-rule/ROM limit
✅ All 4 program templates exist
✅ All template exercises resolve to catalog entries
✅ No direct-arm/calf/neck isolation in the main spine

## Extending the Catalog

To add new exercises:

1. **Add to the array** in `functions/api/[[path]].js`:
   ```javascript
   const COACHING_EXERCISES = [
     // ... existing exercises
     {
       name: 'New Exercise',
       pattern: 'horizontal_push',  // one of the 7 patterns
       equipment: 'dumbbell',
       primary_muscles: ['chest', 'triceps'],
       joint_tags: ['shoulder', 'elbow'],
       unilateral: false,
       regression: 'Easier variation',
       progression: 'Load step or total-rep target',
       leverage_knob: 'Tempo, pause, or angle change',
       cues: [
         'Alignment cue',
         'Bracing cue',
         'Stop when form breaks'  // <-- must have a stop-rule
       ]
     },
   ];
   ```

2. **Run the audit** to verify:
   ```bash
   node scripts/coachingCatalog.audit.mjs
   ```

3. **Deploy** — the seed runs automatically on boot, so new exercises appear immediately after deployment.

## References

- `COACHING-REFERENCE.md` — the content source (exercises, cues, templates)
- `PROGRAMMING-PRINCIPLES.md` — the rulebook (selection, progression, balance)
- `functions/api/[[path]].js` — worker source with COACHING_EXERCISES array
- `scripts/coachingCatalog.audit.mjs` — coverage audit script
- `src/components/resources/NASMExerciseLibrary.jsx` — frontend catalog viewer
