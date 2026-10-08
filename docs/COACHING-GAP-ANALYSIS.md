# Coaching Gap Analysis — catalog & program-builder vs. the two source docs

**Author:** Apex · branch `town/apex` · review session
**Sources of truth:** `PROGRAMMING-PRINCIPLES.md` (the rules) and `COACHING-REFERENCE.md` (the content)
**What I audited:** the seeded exercise database and program templates in
`functions/api/[[path]].js`, the pure programming logic in `src/lib/programming.js`,
the exercise-library UI in `src/components/resources/NASMExerciseLibrary.jsx`, and the
program-builder the user actually touches, `src/components/ai/AIWorkoutGenerator.jsx`.

Every problem below is graded **P0 / P1 / P2** and points at the exact file. Automated
checks that already pass: `scripts/coachingCatalog.audit.mjs` (catalog coverage, 0 hard
problems) and `scripts/programming.selfcheck.mjs` (29/29 on warm-up tiers & intensity).

---

## Verdict in one line

The **seed data is honest** against both docs — 41 exercises across all seven patterns,
each with the eight required fields and 1–3 cues, plus four ready-to-ship templates that
resolve cleanly. But the **program-builder the customer uses drifts hard**: it is a bare
LLM prompt that never touches the catalog or `programming.js`, so none of the rules
(pattern coverage, balance, goal→parameters, warm-up tiers, six-week blocks) reach the
generated plan. The truth is seeded; the product doesn't read it.

---

## Part A — What MATCHES (keep, don't regress)

| Doc rule | Where it lives | Status |
|---|---|---|
| Seven movement patterns, each stocked (PRINCIPLES §1, REFERENCE §1) | `COACHING_EXERCISES` in worker | ✅ 5–7 per pattern |
| Every pattern has a bodyweight fallback (REFERENCE §1) | same | ✅ ≥1 each, verified by audit |
| Eight selection fields per exercise (REFERENCE §1) | same | ✅ pattern, equipment, primary_muscles, joint_tags, unilateral, regression, progression, leverage_knob |
| ≤3 cues, ≥1 a stop/ROM rule (PRINCIPLES §9, REFERENCE §2) | same | ✅ audit enforces it |
| Four ship-ready templates (REFERENCE §4) | `COACHING_TEMPLATES` | ✅ full_body, upper_lower, push_pull_legs, recomposition |
| Templates time-boxed at ~6 weeks (PRINCIPLES §4) | same | ✅ `duration_weeks: 6` on all four |
| Warm-up tiers + work-up step counts (PRINCIPLES §7) | `src/lib/programming.js` | ✅ heavy=5, moderate=2, circuit=0; overshoot single gated to 4–8-rep intermediates |
| Circuit is its own intensity, not "moderate" (PRINCIPLES §8) | `programming.js` `planCircuit()` | ✅ pairing wins over reps |
| Exercise-library UI reads the DB catalog with a NASM fallback | `NASMExerciseLibrary.jsx` | ✅ `CoachingCatalog` renders pattern/cues/regression/progression |

That's a real foundation. The gaps are about **connecting it to the generator and closing
a handful of rules that were never coded.**

---

## Part B — GAPS (the drive-list, ordered)

### P0-1 · The AI program-builder ignores the catalog and every rule
**File:** `src/components/ai/AIWorkoutGenerator.jsx` (lines 25–78)
The generator sends a generic "you are an expert trainer" prompt straight to `InvokeLLM`
with **no catalog, no principles, no `programming.js`**. Consequences, each a doc violation:

- **Exercise names are free text** → they won't match `CoachingExercise` slugs, so cues,
  regressions, joint tags and leverage knobs never attach to a generated plan. The seeded
  library is decorative until the builder is forced to pick from it.
- **`days_per_week` is hard-coded to 3** and `difficulty` to `intermediate` in the JSON
  skeleton (lines 40, 58, 89) regardless of the client. Violates PRINCIPLES §3 (days
  available drives the split: ≤3 full-body, 4 upper/lower, 5+ add conditioning).
- **No pattern-coverage or balance check** (PRINCIPLES §1–2). Nothing guarantees push =
  pull, or that every pattern appears; the LLM can ship a chest-heavy week.
- **No goal→parameter mapping** (REFERENCE §5). Reps/rest/pairing/progression are left to
  the model instead of the table.
- **No warm-up / work-up sets** (PRINCIPLES §7), the one component the docs call
  non-negotiable before a heavy lift.

**Fix direction:** make the builder catalog-first. Simplest honest path — when the goal maps
to an existing template, return the seeded template and let the LLM only *personalise* loads
and swaps within the catalog; otherwise constrain the prompt to the catalog's exercise
names and run `programming.js` + a balance/coverage validator over the result before it's
saved. Wire `src/lib/programming.js` in (it is currently imported by **nothing** — verified).

### P0-2 · Goal vocabulary doesn't match the source docs
**File:** `AIWorkoutGenerator.jsx` (lines 153–158)
Dropdown offers `strength / muscle / cardio / balanced / fat_loss`. The docs' goal tags
(REFERENCE §5, PRINCIPLES §8) are **strength / hypertrophy / fat-loss-recomp /
conditioning / power**. `balanced` and `muscle` and `cardio` have no row in the
goal→parameter table, so even a future mapping layer has nothing to look up. Align the enum
to the five documented goals (or map them explicitly) so §5 becomes usable.

### P1-3 · `programming.js` is dead code — never imported
**Files:** `src/lib/programming.js`, everywhere
Grep confirms zero imports in `src/` or `functions/`. The warm-up/intensity/circuit logic
is correct and self-checked but reaches no user. It needs to feed either the worker's
plan-generation path or the client-side builder. Until then it's a well-tested orphan.

### P1-4 · No balance guardrail anywhere in the running app
**Docs:** PRINCIPLES §2 ("balance is a hard constraint"), REFERENCE §7
The templates are balanced by hand, but there is **no code** that tracks weekly pull sets
vs push sets, flags a week where pull < push twice running, or auto-inserts row/face-pull
volume. This is called out as one of the most avoidable plateaus and a shoulder-safety
issue — it deserves a real function (pure, testable, sits next to `programming.js`) and a
UI surface (show the ratio). Nothing consumes `joint_tags` for pain-triage either.

### P1-5 · No substitution engine on (pattern, equipment, joint flags)
**Docs:** PRINCIPLES §6, REFERENCE §6
Every exercise carries `regression`, `equipment`, `joint_tags`, `leverage_knob` — the
inputs a substitution lookup needs — but there is **no function** that does the lookup:
"shoulder hurts on this press → surface the palms-facing/incline/machine variant of the
*same pattern*," or "only one pair of dumbbells → switch to total-rep/density and offer the
tempo→unilateral→rest→circuit→higher-reps ladder." The rule "never substitute across
patterns; report 'no pull available'" is unimplemented. High-value, and the data is already
there to build it.

### P1-6 · No progression-mechanism selector by goal
**Docs:** PRINCIPLES §4 (the six mechanisms + which metric to log), REFERENCE §5
Exercises name a progression in prose ("Load step — add a small increment…"), but the app
has no notion of *which knob* a given goal turns, no per-mechanism metric to headline
(a density user should see "reps in 20 minutes," not bar weight — PRINCIPLES §4 rule), and
no advance/reset triggers. This is the engine behind "log a set → tell me my next target."

### P2-7 · No back-off / deload trigger
**Docs:** PRINCIPLES §5, REFERENCE §7
No code watches for the four back-off triggers (two missed top sets, joint-pain flag twice
in 7 days, low sleep/soreness three sessions running, six-week block end) or produces a
back-off week (keep patterns, −10–20% load, drop the last set). `SleepStressLogger` and
readiness components exist and could feed this — the trigger logic is the missing piece.

### P2-8 · Beginner/intermediate gating not modelled
**Docs:** PRINCIPLES §10, REFERENCE §7
Templates carry a `difficulty` string, but there's no classifier (≈12 logged weeks + a
lower-body strength benchmark) and no feature-gating that hides supersets/dropsets/
max-effort/specialty blocks from beginners. The AI builder hard-codes `intermediate`, which
sidesteps the whole question.

### P2-9 · The static NASM fallback list has no pattern tags
**File:** `NASMExerciseLibrary.jsx` (`EXERCISES`, lines 7–48)
The 41-item fallback catalog is tagged by `bodyPart`/`difficulty` only — no `pattern`
field — so if the DB seed hasn't run, the pattern filter UI shows an unfiltered list. Minor,
but it's a second, un-reconciled exercise list drifting from the seeded one. Consider
deriving the fallback from the same source or tagging it with patterns.

### P2-10 · Templates hard-code `target_rir: 2/3`; no goal-driven rest/rep defaults surfaced
**File:** `COACHING_TEMPLATES` in worker
The templates bake in reps/rest/RIR by hand (correctly), but there is no shared
goal→parameter map the builder and templates both read (REFERENCE §5). Extracting §5 into a
small constant that both consume would keep future exercises honest and stop the AI builder
from inventing its own rest/rep ranges.

---

## Suggested build order (each item is a shippable PR)

1. **Extract the §5 goal→parameter table** into `src/lib/programming.js` as a constant —
   cheap, unlocks P0-2, P1-6, P2-10.
2. **Fix the goal enum** in `AIWorkoutGenerator` to the five documented goals (P0-2).
3. **Ground the builder in the catalog** — template-first return, LLM constrained to catalog
   names, validate with a pattern-coverage + balance check before save (P0-1, P1-4).
4. **Substitution engine** on (pattern, equipment, joint_tags) with the never-cross-pattern
   rule (P1-5) — pure function + tests, then a UI hook.
5. **Progression mechanisms** keyed by goal, with per-mechanism headline metric (P1-6).
6. **Back-off triggers** fed by the existing sleep/soreness/readiness loggers (P2-7).
7. **Beginner classifier + feature gating** (P2-8).
8. Reconcile the static NASM fallback with the seeded catalog (P2-9).

Items 1–3 are the ones that make the seeded truth actually reach a customer's plan; the
rest deepen the coaching. Nothing here regresses what already passes the two audit scripts.
