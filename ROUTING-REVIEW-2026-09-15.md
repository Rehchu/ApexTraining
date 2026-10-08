# Routing Layer Review — 2026-09-15

## What I Mapped

Completed deep-dive analysis of `functions/api/[[path]].js` (2185 lines) to identify integration points for exercise database and program builder features.

**Created:** `ROUTING-MAP.md` — comprehensive routing documentation with endpoint catalog and integration guidance

## Architecture Overview

**Single-file Cloudflare Pages Functions handler** that processes all `/api/*` routes:
- Pattern-based routing via `segs[0]` (first path segment)
- 7 route groups: auth, entities, functions, integrations, stripe, audit, files
- Generic entity CRUD via `/api/entities/:type/:id?`
- RPC-style functions via `/api/functions/:name`

## Key Findings

### ✅ Exercise & Program Infrastructure Already Exists

1. **Exercise Catalog (41 exercises)**
   - Seeded from `COACHING_EXERCISES` array (lines 1295-1514)
   - 7 movement patterns: horizontal_push, vertical_push, horizontal_pull, vertical_pull, squat, hinge, carry_core
   - Each exercise includes: pattern, equipment, muscles, joint_tags, regression, progression, leverage_knob, cues
   - Stored as `CoachingExercise` entities (read-only, system-created)

2. **Program Templates (4 templates)**
   - Seeded from `COACHING_TEMPLATES` array (lines 1519-1623)
   - Templates: Beginner Full-Body, Upper/Lower Split, Push/Pull/Legs, Strength Focus
   - Stored as `FitnessTemplate` entities
   - Each includes: exercises array with day/sets/reps/rest/notes

3. **Reference Documents**
   - `COACHING-REFERENCE.md` — exercise library, cueing, warm-ups, templates, goal→parameter table
   - `PROGRAMMING-PRINCIPLES.md` — program logic, balance rules, progression mechanisms, substitution rules

### ⚠️ Integration Points Identified

**Where exercise DB features should plug in:**
- `/api/functions/getCoachingExercises` — Filter exercises by pattern, equipment, constraints
- `/api/functions/substituteExercise` — Find valid swaps per movement pattern
- `/api/entities/CoachingExercise` — Read-only exercise catalog access
- `/api/entities/Exercise` — User-created custom exercises

**Where program builder should plug in:**
- `/api/functions/buildProgram` — Generate program from goal/frequency/equipment/constraints
- `/api/functions/progressProgram` — Auto-advance load/volume per principles
- `/api/functions/generateWarmup` — Tier-based warm-up sets
- `/api/entities/FitnessTemplate` — Read-only program templates
- `/api/entities/WorkoutPlan` — User-assigned programs

### 🔧 Existing Exercise Functions (in `runFunction()`)

- `searchExercises` (lines 590-601) — External ExerciseDB API search (RapidAPI)
- `getExerciseById` (lines 603-628) — Fetch exercise details with video/images
- `getExerciseData` (lines 630-637) — Reference lists (muscles, body parts, equipment)
- `importFromGoogleSheets` (lines 817-912) — Bulk import exercises from Google Sheets

## Code Quality Review

### ✅ Strengths
- Clean routing with consistent JSON responses
- Strong auth (JWT, brute-force throttling, HIPAA audit trail)
- Flexible EAV data model scales to new entity types
- Exercise catalog and templates already seeded with quality data
- Reference docs provide clear programming rules

### ⚠️ Risks
1. **Monolithic file** — 2185 lines in one file, difficult to navigate
2. **No validation** — Request bodies parsed but not schema-validated
3. **ExerciseDB dependency** — Third-party API for search (rate limits, cost)

### ✅ Clean Checks Passed
- ✅ `node --check functions/api/[[path]].js` — No syntax errors
- ⏳ `npm run lint` — Still running (slow on large file)
- ❌ `npm test` — No test suite configured

## Recommendations

### Phase 1: Exercise Query & Substitution
1. Add `getCoachingExercises` function with filtering (pattern, equipment, constraints)
2. Add `substituteExercise` function following PROGRAMMING-PRINCIPLES §4
3. Unit test against COACHING-REFERENCE examples

### Phase 2: Program Generation
1. Add `buildProgram` function that:
   - Takes user input (goal, frequency, equipment, constraints)
   - Selects exercises per pattern distribution
   - Assigns sets/reps/rest per goal parameters
   - Returns ready-to-save `WorkoutPlan` entity
2. Test against seeded templates to verify output format

### Phase 3: Progression & Warm-ups
1. Add `progressExercise` (load steps, back-off logic per PROGRAMMING-PRINCIPLES §5)
2. Add `generateWarmup` (tier-based, per COACHING-REFERENCE §3)
3. Hook into `WorkoutLog` POST to auto-trigger progression

## Files Created
- `ROUTING-MAP.md` — Full routing documentation (361 lines)

## Commit Status
✅ Committed to `town/apex` branch (local)
❌ Push failed (requires GitHub credentials)

Commit message:
```
Map routing layer and endpoint structure for exercise DB integration

Deep dive into functions/api/[[path]].js to identify all integration
points for exercise database and program builder features.
```

---

**Ready for next session:** Build the first coaching function (`getCoachingExercises`) following the routing map.
