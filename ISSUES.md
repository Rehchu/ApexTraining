# ISSUES — Apex Coach Training Review
**Session:** 2026-09-04 Review (Updated)
**Branch:** town/apex
**Reviewer:** Max (Apex)

---

## Executive Summary

The foundation is **solid**: 41 exercises catalogued across seven movement patterns, four ready-to-ship templates, and pure programming logic that passes self-checks. The **critical gap** is that the AI workout generator the customer actually touches ignores all of it — no catalog lookup, no pattern balance, no goal→parameter mapping, no warm-up generation. The seeded truth never reaches the generated plan.

**Pass/Fail on Existing Checks:**
- ✅ `coachingCatalog.audit.mjs` — 41 exercises, all patterns covered, 0 hard problems
- ✅ `programming.selfcheck.mjs` — 29/29 checks passed
- ⚠️ ESLint — 100+ unused import warnings (cosmetic, not blocking)
- ⚠️ TypeScript — dependency typing issues (not runtime blockers)

---

## P0 — Critical (Blocks honest coaching)

### P0-1: AI Workout Generator bypasses the entire coaching system
**File:** `src/components/ai/AIWorkoutGenerator.jsx`
**Lines:** 25–78 (the LLM prompt), 40 (hardcoded days), 89 (hardcoded difficulty)

**Problem:**
The generator sends a bare "you are an expert trainer" prompt to `InvokeLLM` with zero connection to:
- The 41-exercise `COACHING_EXERCISES` catalog (exercise names are free text → cues/regressions/joint-tags never attach)
- The `programming.js` warm-up/intensity logic (never imported anywhere)
- Pattern coverage or balance checks (PRINCIPLES §1–2)
- Goal→parameter mapping (REFERENCE §5)
- Work-up sets before heavy lifts (PRINCIPLES §7, called "non-negotiable")

**Consequences:**
- Exercise names won't match `CoachingExercise` slugs → the seeded library is decorative
- `days_per_week` hard-coded to 3 regardless of client availability (violates PRINCIPLES §3)
- `difficulty` hard-coded to `intermediate` (no beginner gating)
- No guarantee of push = pull balance → LLM can ship chest-heavy weeks
- No warm-ups generated

**Fix direction:**
Template-first return when goal matches an existing template; otherwise constrain LLM to catalog exercise names, then validate pattern coverage + balance before save. Wire in `src/lib/programming.js` for warm-ups and work-up sets.

---

### P0-2: Goal vocabulary mismatch
**File:** `src/components/ai/AIWorkoutGenerator.jsx`
**Lines:** 153–158

**Problem:**
Dropdown offers `strength / muscle / cardio / balanced / fat_loss`.
The source docs (REFERENCE §5, PRINCIPLES §8) define five goals with parameter tables:
- **strength** → reps 3–5, rest 2–4min, load step progression
- **hypertrophy** → reps 8–15, rest 60–90s, total-rep/volume ramp
- **fat-loss/recomp** → moderate reps, rest <60s, circuit pairing, rest compression
- **conditioning** → intervals, work:rest ratios, density progression
- **power** → reps 1–3, explosive, speed then load step

`muscle`, `cardio`, `balanced` have no row in the goal→parameter table → future mapping layer has nothing to look up.

**Fix:**
Align the goal enum to the five documented goals or add explicit mapping.

---

## P1 — High priority (Violates documented coaching rules)

### P1-3: `programming.js` is dead code
**Files:** `src/lib/programming.js`, everywhere
**Verified:** `grep -r "import.*programming" src/` → zero matches (only imports itself)

**Problem:**
The warm-up tier, intensity classification, and circuit-pairing logic is correct and self-tested (29/29), but never reaches a user. It needs to feed the worker's plan generation or the client-side builder.

**Fix:**
Import and call `programming.js` functions from the AI generator or a server-side plan builder.

---

### P1-4: No balance guardrail implemented
**Docs:** PRINCIPLES §2 ("balance is a hard constraint"), REFERENCE §7

**Problem:**
Templates are balanced by hand, but there is **no code** that:
- Tracks weekly pull sets vs push sets
- Flags a week where pull < push for two weeks running
- Auto-inserts row/face-pull/reverse-fly movements
- Consumes `joint_tags` for pain triage

This is called out as "one of the most avoidable plateaus" and a shoulder-safety issue in the docs.

**Fix:**
Pure function that takes a week's exercises, calculates push/pull ratio, returns warnings/suggestions. UI to surface the ratio.

---

### P1-5: No substitution engine
**Docs:** PRINCIPLES §6, REFERENCE §6

**Problem:**
Every exercise has `regression`, `equipment`, `joint_tags`, `leverage_knob` fields — the inputs for substitution logic — but there's **no function** that does:
- "Shoulder hurts on this press → surface palms-facing/incline/machine variant of the **same pattern**"
- "Only one pair of dumbbells → switch to total-rep/density progression, offer tempo→unilateral→rest→circuit→higher-reps ladder"
- "Never substitute across patterns; report 'no pull available'"

The data is seeded, the rule is documented, but the lookup isn't implemented.

**Fix:**
Function `substituteExercise(exercise, constraint, catalog)` that filters by (pattern, equipment, joint flags) and never crosses patterns.

---

### P1-6: No progression mechanism selector
**Docs:** PRINCIPLES §4 (six mechanisms), REFERENCE §5

**Problem:**
Exercises name a progression in prose ("Load step — add increment"), but the app has no notion of:
- Which knob a given goal turns (strength = load step, hypertrophy = volume ramp, fat-loss = rest compression, etc.)
- Per-mechanism metric to headline (density user sees "reps in 20 min", not bar weight)
- Advance/reset triggers (target hit → next step; two misses → back off)

This is the engine behind "log a set → tell me my next target."

**Fix:**
Extract §5 goal→parameter table, add progression state machine per mechanism.

---

## P2 — Medium priority (Missing features, not blocking MVP)

### P2-7: No back-off / deload trigger
**Docs:** PRINCIPLES §5, REFERENCE §7

**Problem:**
No code watches for the four back-off triggers:
- Two consecutive missed top sets on one lift
- Joint-pain flag twice in 7 days
- Low sleep/soreness scores three sessions running
- Six-week block end

And no code produces a back-off week (keep patterns, −10–20% load, drop last set).

`SleepStressLogger` and readiness components exist and could feed this — the trigger logic is missing.

**Fix:**
Function that takes workout logs + readiness data, returns back-off recommendation.

---

### P2-8: Beginner/intermediate gating not modeled
**Docs:** PRINCIPLES §10, REFERENCE §7

**Problem:**
Templates carry a `difficulty` string, but there's no:
- Classifier (≈12 logged weeks + lower-body strength benchmark)
- Feature gating that hides supersets/dropsets/max-effort/specialty blocks from beginners

The AI builder hard-codes `intermediate`, which sidesteps the question.

**Fix:**
User progression state, feature gating by level.

---

### P2-9: Static NASM fallback has no pattern tags
**File:** `src/components/resources/NASMExerciseLibrary.jsx` (EXERCISES array, lines 7–48)

**Problem:**
The 41-item fallback catalog is tagged by `bodyPart`/`difficulty` only — no `pattern` field — so if the DB seed hasn't run, the pattern filter shows an unfiltered list. It's a second, un-reconciled exercise list drifting from the seeded catalog.

**Fix:**
Derive fallback from the same source or tag it with patterns.

---

### P2-10: Templates hard-code rest/reps; no shared goal→parameter map
**File:** `COACHING_TEMPLATES` in worker

**Problem:**
Templates bake in reps/rest/RIR by hand (correctly), but there's no shared goal→parameter constant that the builder and templates both read (REFERENCE §5). Future exercises might invent their own rest/rep ranges.

**Fix:**
Extract §5 into `src/lib/programming.js` as a constant, import from both.

---

## Recommended Build Order (shippable increments)

1. ✅ **DONE:** Extract goal→parameter table into `programming.js` as `GOAL_PARAMETERS` constant (2026-09-04)
   - Added six goals: strength, hypertrophy, fat_loss, recomposition, conditioning, power
   - Each has reps, rest, pairing, progression mechanism + note
   - Unlocks P0-2, P1-6, P2-10
2. **Fix goal enum** in `AIWorkoutGenerator` to match the six documented goals (P0-2)
   - Current: `strength / muscle / cardio / balanced / fat_loss`
   - Target: `strength / hypertrophy / fat_loss / recomposition / conditioning / power`
3. **Ground the builder in the catalog** → template-first return, LLM constrained to catalog names, pattern-coverage + balance validation before save (P0-1, P1-4)
4. **Substitution engine** on (pattern, equipment, joint_tags) with never-cross-pattern rule (P1-5)
5. **Progression mechanisms** keyed by goal, with per-mechanism headline metric (P1-6)
6. **Back-off triggers** fed by existing sleep/soreness/readiness loggers (P2-7)
7. **Beginner classifier + feature gating** (P2-8)
8. Reconcile static NASM fallback with seeded catalog (P2-9)

---

## Code Quality Notes

- **Unused imports:** 100+ ESLint warnings across Layout, BottomNav, ClientLayout, admin components, etc. — cosmetic, not blocking.
- **TypeScript errors:** Mostly in dependencies (`react-grid-layout`, `canvas-confetti`) and JSDoc type mismatches — not runtime issues.
- **No test suite:** `npm test` doesn't exist. Self-check scripts exist for coaching catalog and programming logic, but no unit/integration tests for components.

---

## User Signups

No new user activity detected in available data sources (checked dashboard-data references). Will monitor on next review.

---

## Updates — 2026-09-04 Review Session

**Completed:**
- ✅ Re-ran all audit scripts: `coachingCatalog.audit.mjs` (41 exercises, PASS), `programming.selfcheck.mjs` (29/29 PASS)
- ✅ Added `GOAL_PARAMETERS` constant to `src/lib/programming.js` with all six goals from COACHING-REFERENCE §5
- ✅ Each goal specifies: reps, rest_seconds, rest_range, pairing, progression mechanism, progression_note
- ✅ Verified all existing checks still pass after changes

**Findings:**
- No regression — all previously identified issues (P0-1 through P2-10) remain valid
- The COACHING_EXERCISES catalog is excellent: 41 exercises, all with pattern/equipment/joint_tags/regression/progression/leverage_knob/cues
- The COACHING_TEMPLATES are well-built and balanced
- The core gap persists: AIWorkoutGenerator.jsx bypasses all coaching logic and catalog

**Next session focus:** Implement item #2 from build order (fix goal enum in AIWorkoutGenerator) then item #3 (ground the builder in the catalog with template-first logic).

---

## Updates — 2026-09-04 Review Session #2 (Spec Gap Documentation)

**Audit Results:**
- ✅ `coachingCatalog.audit.mjs` — 41 exercises, all patterns covered, 0 hard problems, 0 warnings → **PASS**
- ✅ `programming.selfcheck.mjs` — 29/29 checks passed
- ✅ `coaching.selfcheck.mjs` — 59/59 checks passed → **NEW** comprehensive coaching engine exists!
- ✅ Core library syntax checks (programming.js, coaching.js) — all pass

**MAJOR DISCOVERY: Full Coaching Engine Exists in `src/lib/coaching.js`**

The coaching gap has been **substantially closed** since the last review. A complete coaching engine now exists with:
- ✅ All seven movement patterns (PATTERN constants)
- ✅ Full goal→parameters table (GOAL_PARAMS) with all six goals
- ✅ Six progression mechanisms (MECHANISM_SPEC) with advance/reset rules
- ✅ Substitution engine (`substitute()`) that never crosses patterns, honors joint flags & equipment
- ✅ Balance checker (`balanceCheck()`) with auto-prescription for 2-week pull deficit
- ✅ Back-off triggers (`backoffTrigger()`, `applyBackoffWeek()`) with all four signals
- ✅ Week composer (`buildWeek()`) that validates coverage, balance, and seeds warm-ups
- ✅ Session and week coverage validators
- ✅ Equipment ladder for bodyweight fallbacks
- ✅ "Too light weight" ladder (`lighterKnobs()`)

**Updated Issue Status:**

**P0-1 STILL VALID** — AIWorkoutGenerator.jsx (lines 25-78) still bypasses all of the above
- coaching.js exists but has **ZERO imports** anywhere in src/ or functions/
- The generator's LLM prompt is unchanged — no catalog lookup, no pattern validation, no balance check
- Generated exercise names are free text → won't match CoachingExercise slugs → cues/regressions never attach

**P0-2 STILL VALID** — Goal vocabulary mismatch
- AIWorkoutGenerator dropdown: `strength / muscle / cardio / balanced / fat_loss` (lines 153-158)
- coaching.js GOAL enum: `strength / hypertrophy / fat_loss / conditioning / power`
- coaching.js has GOAL_ALIASES that map `muscle→hypertrophy`, `cardio→conditioning`, but the UI doesn't use it
- `balanced` is aliased to `hypertrophy` with `mapped:false` warning — needs user confirmation

**P1-3 RESOLVED** ✅ — programming.js is no longer dead code
- Now imported by coaching.js (line 19-25): `PAIRING, planIntensity, seedWarmup, planCircuit, CIRCUIT_NOTE`
- Still not imported by any UI components or AIWorkoutGenerator

**P1-4 RESOLVED** ✅ — Balance guardrail implemented
- `balanceCheck()` exists in coaching.js (lines 460-486)
- Tracks push vs pull sets, returns ratio and prescription
- Auto-prescribes horizontal_pull exercises when pull < push for 2 weeks
- **Not called anywhere** — needs wiring to the generator or week builder UI

**P1-5 RESOLVED** ✅ — Substitution engine implemented
- `substitute()` exists in coaching.js (lines 377-425)
- Never crosses patterns (returns `ok:false` with honest message instead)
- Filters by equipment and joint_tags
- Prefers machines for joint complaints, bodyweight for equipment limits
- **Not called anywhere** — needs wiring to the UI

**P1-6 RESOLVED** ✅ — Progression mechanisms implemented
- All six mechanisms in MECHANISM_SPEC (lines 184-215)
- `nextTarget()` engine (lines 238-335) with advance/hold/reset logic
- `mechanismForGoal()` chooses correct mechanism, handles equipment limits
- **Not called anywhere** — needs wiring to workout logging UI

**P2-7 RESOLVED** ✅ — Back-off triggers implemented
- `backoffTrigger()` checks all four signals (lines 504-518)
- `applyBackoffWeek()` drops load 10-20% and removes last set (lines 523-531)
- **Not called anywhere** — needs wiring to readiness/sleep data

**P2-8 STILL VALID** — Beginner/intermediate gating not modeled
- coaching.js has a `level` parameter in `buildWeek()` but no classifier function
- No feature gating that hides supersets/dropsets from beginners

**P2-9 STILL VALID** — NASM fallback has no pattern tags
- NASMExerciseLibrary.jsx has pattern filter UI (line showing pattern constants)
- But the EXERCISES array still lacks pattern fields

**P2-10 RESOLVED** ✅ — Shared goal→parameter map exists
- GOAL_PARAMS in coaching.js is the single source of truth
- Templates and generator **should** read this, currently don't

**Critical Path to Ship:**
1. Wire coaching.js into AIWorkoutGenerator (P0-1)
   - Import `buildWeek, substitute, balanceCheck, paramsForGoal, normaliseGoal`
   - For template-matched goals: return template directly
   - For LLM generation: constrain to catalog names, validate with `buildWeek()` before save
2. Fix goal dropdown to match GOAL enum (P0-2), use `normaliseGoal()` to handle aliases
3. Wire `balanceCheck()` to show ratio in plan preview, auto-insert pulling when triggered
4. Wire `substitute()` to "exercise hurts" / "no equipment" UI flows
5. Wire `nextTarget()` to workout completion logger
6. Wire `backoffTrigger()` to readiness data feed

**Code Quality:**
- Syntax checks: all core libraries pass ✅
- Self-checks: 41 exercises, 29 programming tests, 59 coaching tests — all passing ✅
- Zero imports of coaching.js in UI layer — the blocker

**User Signups:**
- No new signups detected (dashboard-data not accessible from current path)

**Overall Assessment:**
The **coaching engine is BUILT and TESTED**. The gap is now **integration only** — the UI doesn't know the engine exists. One import block in AIWorkoutGenerator.jsx + validation before save would close P0-1 and surface all the built logic to users.
