For: Apex. Distilled from a training reference the owner supplied; written from scratch in my own words, nothing reproduced.

# Coaching reference — the content the app coaches with

`PROGRAMMING-PRINCIPLES.md` is the *rulebook*: how the app should build a week,
progress a lift, and back off. This document is the *content* those rules act
on — the exercise library, the cues, the warm-ups, and a few ready-to-ship
program templates, shaped so they can seed a database and fill coaching copy.

Nothing here is copied from the reference. The exercise names below are the
common vocabulary of the gym, not anyone's proprietary list; the programs are
standard structures, not the reference's routines. Read it to stock the app,
then keep it honest as the catalog grows.

---

## 1. The exercise library, by movement pattern

Store every exercise against these fields, because selection, substitution and
balance logic all run on them (per the principles doc): **pattern**,
**equipment**, **primary muscles**, **joint-stress tags**,
**bilateral/unilateral**, a **regression**, a **progression**, and a
**leverage knob** (how to make it harder without adding weight).

The seven patterns and representative movements — enough to seed the catalog;
add variants over time:

| Pattern | Representative movements | Primary muscles | Watch (joint tags) |
|---|---|---|---|
| **Horizontal push** | bench press, dumbbell press, push-up, dip | chest, front shoulder, triceps | shoulder, elbow |
| **Vertical push** | overhead press, landmine press, pike push-up | shoulders, triceps, upper chest | shoulder |
| **Horizontal pull** | barbell row, one-arm dumbbell row, inverted row, chest-supported row | mid-back, rear shoulder, biceps | lower back (unsupported) |
| **Vertical pull** | pull-up, chin-up, lat pulldown, band pulldown | lats, biceps, forearms | shoulder, elbow |
| **Squat** | back squat, front squat, goblet squat, split squat | quads, glutes, trunk | knee, lower back |
| **Hinge** | deadlift, Romanian deadlift, hip thrust, kettlebell swing | hamstrings, glutes, back | lower back |
| **Carry / core-brace** | farmer carry, suitcase carry, plank, dead bug | trunk, grip, whole body | lower back |

Two content rules that keep the library coherent:

- **Every pattern needs a bodyweight fallback,** pulling included (inverted row,
  door row). A user with no equipment should never hit a dead end.
- **Direct arm, calf, neck and trap work are garnish,** tagged separately and
  only ever appended after the pattern lifts — never the spine of a session.

## 2. Cueing — the coaching copy layer

Each exercise carries at most **three cues**, and at least one must be a stop
rule or a range-of-motion limit. Draw them from these eight buckets so the
copy stays consistent across the whole catalog and a pain report can be mapped
back to a category:

1. **Spine position** — keep the natural lower-back arch; don't round; don't
   sink so deep the pelvis tucks.
2. **Bracing** — abs tight, glutes squeezed, grip firm; this is how the trunk
   trains on every compound.
3. **Joint alignment** — knees track over the feet, elbows under the wrists,
   elbows tucked rather than flared on presses.
4. **Anti-movement** — hips level, shoulders square, no sway or twist.
5. **Range limits** — "as deep as you can *without* losing the arch"; depth is
   always conditional on a spine or alignment cue, never absolute.
6. **Tempo and pauses** — control the lowering, pause at the hard point.
7. **Force direction** — drive the feet into the floor; push the floor away.
8. **Stop rules** — end the set when form breaks; leave one or two reps in the
   tank; rest briefly and finish rather than grind a rep with bad form.

When a user reports pain, ask *where*, map the joint to buckets 1, 3 and 5 for
that exercise, and offer the friendly variant before proposing a full swap.

## 3. Warm-ups, tiered by time

Ask *minutes available today* at session start and branch:

- **Under 45 min → practical:** a few minutes on a cardio machine plus one or
  two mobility drills for hips and upper back.
- **45–60 min → practical + dynamic:** add a movement sequence that takes the
  session's joints through their working ranges.
- **Over 60 min, or an injury flag → full:** soft-tissue work on habitual tight
  spots, easy pulse-raising, the dynamic sequence, then static holds only for
  chronically tight areas.

**Work-up sets are mandatory before any heavy lift** and are generated from the
day's top load: start with an empty bar or trivial resistance, add weight in
steps while dropping reps to save energy, and arrive at the working weight
ready. For a heavy top set of 4–8 reps, an intermediate can do a single or
double *slightly above* the working weight first, so the real set feels light.
Even on a split day, warm the whole body with one drill for the other half.

## 4. Program templates, ready to ship

Four standard structures the generator can offer directly. Sets × reps are
starting points; the progression column tells the app which knob to turn (see
the principles doc for the mechanisms).

**A. Beginner full-body, 3 days (non-consecutive)** — the default for anyone
new or short on time. Variety comes from rotating the rep scheme across the
three days, not from new exercises.

| Day | Session | Rep feel |
|---|---|---|
| Mon | squat · horizontal push · horizontal pull · brace | heavy (5s) |
| Wed | hinge · vertical push · vertical pull · carry | moderate (8–10s) |
| Fri | squat · horizontal push · horizontal pull · brace | higher-rep (12–15s) |

Progression: load step on the main lift; if two sessions miss the target reps,
drop the load 5–10% and climb again.

**B. Upper / Lower, 4 days** — the first split, once a beginner has ~12 logged
weeks. Each day still covers a push and a pull (upper) or a squat and a hinge
(lower); balance check runs weekly.

**C. Push / Pull / Legs, 3 or 6 days** — for the intermediate who wants body-part
emphasis while still obeying the balance rule. Never place two heavy sessions
that share a muscle on consecutive days.

**D. Recomposition circuit, 3 days** — moderate reps paired upper-with-lower or
push-with-pull, rests under a minute. Progression is rest compression. The app
should say plainly that long slow cardio is *not* the efficient fat-loss tool
here; circuits and intervals are.

Every template is **time-boxed at about six weeks.** At the end, rotate the rep
scheme or swap a variant — not everything at once — so the body adapts without
habituating.

## 5. Goal → parameters, at a glance

The goal tag sets four defaults. This is the table the app reads when a user
picks what they're training for:

| Goal | Reps | Rest | Pairing | Progression |
|---|---|---|---|---|
| **Strength** | low (3–5) | long (2–4 min) | straight sets | load step + scheme rotation |
| **Hypertrophy** | moderate (8–15) | medium (60–90s) | straight or superset | total-rep or volume ramp |
| **Fat loss / recomp** | moderate | short (<60s) | upper/lower or push/pull | rest compression |
| **Conditioning** | intervals | work:rest ratios | circuits | density (work in a fixed window) |
| **Power** | very low (1–3), fast | full | straight, explosive | speed, then a small load step |

Make the goal's own metric the headline number: a density user sees "reps in 20
minutes," not bar weight; a strength user sees the top-set load.

## 6. Joint-friendly and equipment-limited swaps

The app substitutes on the *constraint* while the pattern stays fixed. Two swap
tables it should carry:

**By joint complaint** — a palms-facing grip for pressing when the shoulder
protests; a slight incline instead of flat; a curved bar when wrists or elbows
ache; a machine when the joint needs the load stabilised for it. Filter out any
exercise tagged for the sore joint, and surface the friendly variant with a
one-line reason.

**By missing weight** — when the load is too light, reach for these in order:
slow the tempo, work one limb at a time, shorten the rest, run a circuit, raise
the reps, or change leverage (elevate the feet, lengthen the body angle). A
single pair of dumbbells is not a dead end; it is a cue to switch that exercise
to a total-rep or density target instead of load stepping.

## 7. Backing off, and beginner vs intermediate

Trigger a **back-off week** on any of: two missed top sets on one lift, a joint-
pain flag twice in seven days, low sleep/soreness three sessions running, or the
end of a six-week block. A back-off week keeps the exercises and the pattern
coverage, drops the load 10–20%, and removes the last set of everything — the
user still shows up.

Classify a user as **beginner** until roughly twelve consecutive logged weeks
*and* a strength benchmark on a main lower-body lift. Beginner mode shows the
full-body rotation, work-up sets, three cues per lift, and one progression
mechanism; it hides supersets, dropsets, max-effort days and specialty blocks.
**Intermediate** mode unlocks those one at a time, each with a block length and
an exit condition. At any level, "same thing for months and stalled" gets a
scheme rotation or a fresh six-week block first — never just a longer list of
new exercises.

---

## How the app should use this

- **Seed the exercise table** from §1; every row carries the eight fields so
  selection and substitution are lookups, not guesses.
- **Fill coaching copy** from §2; three cues per exercise, one always a stop or
  ROM rule.
- **Generate warm-ups** from §3 off the day's load and the minutes available.
- **Offer templates** from §4 and let the goal tag in §5 set reps, rest, pairing
  and the progression mechanism.
- **Answer "it hurts" and "the weight's too light"** from §6 without ever
  substituting across patterns.
- Keep it all honest against `PROGRAMMING-PRINCIPLES.md`: balance is a hard
  check, blocks are time-boxed, and failure is never the goal — leave reps in
  the tank.
