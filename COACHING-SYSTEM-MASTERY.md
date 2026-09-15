# Coaching System Mastery — Full Reference Synthesis
*Read and internalized: 2026-09-15*

This is my complete mental model of the coaching system, distilled from PROGRAMMING-PRINCIPLES.md and COACHING-REFERENCE.md. Every feature build must hit clean against these rules.

---

## Core Architecture: Movement Patterns, Not Body Parts

**The Foundation:** Everything revolves around 7 movement patterns, not muscle groups.

1. **Horizontal Push** (chest, front shoulder, triceps) — bench press, dumbbell press, push-up, dip
2. **Vertical Push** (shoulders, triceps, upper chest) — overhead press, landmine press, pike push-up
3. **Horizontal Pull** (mid-back, rear shoulder, biceps) — barbell row, one-arm dumbbell row, inverted row
4. **Vertical Pull** (lats, biceps, forearms) — pull-up, chin-up, lat pulldown
5. **Squat** (quads, glutes, trunk) — back squat, front squat, goblet squat, split squat
6. **Hinge** (hamstrings, glutes, back) — deadlift, Romanian deadlift, hip thrust, kettlebell swing
7. **Carry / Core-Brace** (trunk, grip, whole body) — farmer carry, suitcase carry, plank, dead bug

**Every exercise must store:**
- Pattern tag
- Equipment tag (barbell, dumbbell, band, bodyweight, etc.)
- Primary muscles
- Joint-stress tags (shoulder, elbow, knee, lower-back)
- Bilateral/unilateral flag
- Regression option
- Progression option
- Leverage knob (how to make it harder without weight)

**Critical rules:**
- Selection, substitution, and balance logic run on TAGS, never names
- Every pattern needs a bodyweight fallback (including pulling: inverted row, door row)
- Direct arm/calf/trap work is GARNISH — tagged separately, appended AFTER pattern lifts, never the spine of a session

---

## Balance: A Hard Constraint, Not a Suggestion

**The Warning:** Over-development on one side (chest vs upper back, front vs rear shoulder) causes stalls and raises injury risk, especially shoulder injuries in heavy pressers.

**Product rules:**
- Track weekly pull sets against push sets
- If pull falls below push two weeks running → auto-insert rows/face-pulls/reverse-flys and SHOW the user the ratio
- On "my chest stopped growing" → check balance ratio FIRST
- On shoulder discomfort during pressing → reduce pressing intensity AND RAISE upper-back volume (don't just delete pressing)

---

## Week Structure by Availability

**The default for time-poor or inexperienced:** 3 full-body sessions on non-consecutive days, with 2 rest days before cycle repeats. Variety comes from ROTATING REP SCHEMES (heavy, moderate, high-rep), not new exercises.

**Other cadences:**
- Short circuit/conditioning → up to 4×/week on alternating days
- Genuinely heavy sessions on a main lift → capped at 2×/week, 3 days apart
- Small muscles get less weekly volume than large ones
- Specialty add-ons → once a week at end of related session, a day away from same muscles

**Product rules:**
- Onboarding asks: days available & minutes per session
  - ≤3 days → full-body rotation
  - 4 days → upper/lower alternating
  - ≥5 days → same, with extra days for conditioning (NOT more lifting)
- NEVER place two heavy sessions on consecutive days
- NEVER place heavy lower day after sprint/interval day
- Rotate rep schemes across the week automatically and SHOW the rotation
- On missed session → SHIFT rotation rather than skip the missed scheme; every scheme should touch inside any 10-day window

---

## Progression Mechanisms: Which Knob to Turn

Six distinct mechanisms, each with different metrics and triggers:

| Mechanism | Tracks | Advance When | Reset When |
|-----------|--------|--------------|------------|
| **Load step** | top-set weight | target reps hit at prescribed rest | 2 consecutive misses → drop 5–10% |
| **Total-rep target** | reps accumulated at fixed load, any # of sets | total reached under set cap | cap hit → raise load, drop target to floor |
| **Rest compression** | seconds between sets | every ~2 weeks, cut a slice | rest reaches floor → raise load, restore rest |
| **Volume ramp** | sets per exercise | add a set every 1–2 weeks | block ends at ~6 weeks |
| **Density** | total reps in fixed window | more work than last time, same window | change exercise pair |
| **Scheme rotation** | which set×rep combo was used | cycle combos with similar rep total | full cycle done → add load |

**Assign by goal:**
- Strength → load step + scheme rotation
- Hypertrophy → total-rep or volume ramp
- Fat-loss/recomposition → rest compression
- Time-poor → density

**Product rules:**
- Make the mechanism's metric the HEADLINE number (density user sees "reps in 20 min", not bar weight)
- On "I only have one pair of dumbbells" → switch to total-rep or density (load stepping unavailable)
- Time-box every block: ~6 weeks (long enough to force adaptation, short enough body doesn't habituate)
- After block → change scheme OR variant, NOT everything at once

---

## Deload & Back-Off Logic

**Baseline instruction everywhere:** Leave 1–2 reps in the tank. Failure is a labelled technique for intermediates on isolation work ONLY.

**Trigger back-off week when ANY fire:**
- Two consecutive missed top sets on one lift
- Joint-pain flag on 2 sessions in 7 days
- Low sleep/soreness scores 3 sessions running
- End of 6-week block

**Back-off week structure:**
- Keep exercises and pattern coverage
- Drop load 10–20%
- Remove last set of everything
- User STILL SHOWS UP (session not cancelled)

**On joint pain:**
- Offer joint-friendly variant first (§6)
- Machine- or band-based session as full alternative for the week
- Machines are the SENSIBLE choice for someone banged up (they stabilize the load)

---

## Exercise Selection & Substitution

**The premise:** The CONSTRAINT (equipment, space, time, joints) picks the exercise; the PATTERN stays fixed.

### Substitution by Equipment
Same pattern, different tool:
Barbell → Dumbbells → Single dumbbell → Band → Suspension trainer → Bodyweight → Playground bar

### Substitution by Joint Tolerance
- Palms-facing grip for pressing when shoulder complains (lets upper arm clear joint)
- Slight incline vs flat
- Curved bar vs straight when wrists/elbows ache
- Machines when everything hurts (stabilize load)

### Substitution by Available Load
When weight insufficient, reach for (in order):
1. Slow the tempo
2. Work one limb at a time
3. Shorten rest
4. Run a circuit
5. Raise reps
6. Change leverage (elevate feet, lengthen body angle)

**Mismatched dumbbells are a FEATURE** — asymmetry makes trunk work.

### Substitution by Sequencing
- Heavy compound FIRST, isolation LAST
- Light activation move before hard single-leg lift
- Circuit pairings must be NON-COMPETING (upper with lower, push with pull) so fatigue doesn't carry
- In fixed-load complex, weakest movement sets the load
- When ability unknown, prescribe reps for TIME so strong & weak users both get useful set

**Product rules:**
- Substitution is lookup on (pattern, equipment, joint flags) in THAT PRIORITY
- NEVER substitute across patterns — report "no pull available" rather than quietly swap in push
- On "weight too light" → offer knobs in order: tempo → unilateral → rest compression → circuit → higher reps
- On joint pain → filter out exercises with that joint's stress tag, surface friendly variant with one-line reason
- Circuit generation rejects any adjacent pair sharing primary muscle

---

## Warm-Up Structure: Tiered by Time & Injury

**Ask "minutes available today" at session start:**

- **Under 45 min → Practical:** Few min cardio machine + 1–2 mobility drills (hips, upper back)
- **45–60 min → Practical + Dynamic:** Add movement sequence taking session's joints through working ranges
- **Over 60 min OR injury flag → Full:** Soft-tissue work on tight spots, easy pulse-raising, dynamic sequence, static holds ONLY for chronically tight areas

**Work-up sets (MANDATORY before any heavy lift):**
- Generate from day's target load: 4–5 steps for heavy top set, 2 for moderate, none for circuits
- Start with empty bar/trivial resistance, add weight in steps while cutting reps to save energy
- For 4–8-rep working set (intermediate users): do final single SLIGHTLY ABOVE working weight so real set feels lighter
- For true max attempt: back off one set before climbing again (loads feel heaviest near 90%, lighter set restores confidence)
- Warm whole body even on split day (lower-body warm-up includes one upper drill, vice versa)
- Interval sessions carry own warm-up in first easy rounds

---

## Goal Parameters: What Changes by Training Goal

| Goal | Reps | Rest | Pairing | Progression |
|------|------|------|---------|-------------|
| **Strength** | low (3–5) | long (2–4 min) | straight sets | load step + scheme rotation |
| **Hypertrophy** | moderate (8–15) | medium (60–90s) | straight or superset | total-rep or volume ramp |
| **Fat loss / recomp** | moderate | short (<60s) | upper/lower or push/pull | rest compression |
| **Conditioning** | intervals | work:rest ratios | circuits | density (work in fixed window) |
| **Power** | very low (1–3), fast | full | straight, explosive | speed, then small load step |

**Strength specifics:**
- Low reps, heavy loads, sets with reps summing to ~24 on main lift
- First few sets treated as warm-ups, only last couple truly heavy
- Progression is bar weight
- Forced reps, dropsets, holds demoted below "add weight"

**Hypertrophy specifics:**
- Moderate reps (8–15), 3 working sets as sweet spot
- Deliberate tempo (slow lowering, squeeze at top)
- Several angles per muscle
- Sets stopped shy of failure
- Blood-flow tricks (stretch between sets, peak contractions) belong here

**Recomposition / Fat loss specifics:**
- Same moderate reps, but paired upper-with-lower or push-with-pull
- Rests under 1 min (rising lactate drives hormonal response)
- Progression is rest compression
- BLUNT: long slow cardio is NOT the efficient fat-loss tool; circuits & intervals are

**Conditioning specifics:**
- Intervals as % of estimated max HR (220 - age as fallback)
- Work:rest ratios (2:1 for very short all-out, 1:2 for longer)
- Ladders that climb & descend
- Density blocks scored on work in window
- No-monitor method: 6-second pulse count × 10

**Power specifics:**
- Very few reps, maximum speed
- Implements that can be released (throws) so body needn't decelerate
- Light, fast barbell reps also clear sticking points
- Intermediate-only add-on with eased-in, hill-style progression

**Product rules:**
- Goal tag sets 4 defaults: rep range, rest range, pairing mode, progression mechanism
- Users may override ONE, but app WARNS when override contradicts goal (strength user cutting rest to 30s)
- On "I want to lose fat, give me running plan" → offer circuit/interval plan FIRST with trade-off explained, still allow running for users who enjoy it

---

## Form Cue Categories: The Coaching Vocabulary

Each exercise carries **at most 3 cues**, and **at least one must be a stop rule or ROM limit**.

### The 8 Buckets

1. **Spine position** — keep natural lower-back arch; never round; don't go so deep tailbone tucks or lower back leaves seat
2. **Bracing** — abs braced, glutes squeezed, grip tight (how trunk trains on compounds)
3. **Joint alignment** — knees over feet, elbows in line with wrists, elbows tucked ~45° on presses, upper arms pinned on curls
4. **Anti-movement** — hips level, shoulders square, no sway/twist/hip drop
5. **Range-of-motion limits** — "as low as you can WITHOUT losing X"; depth always conditional on spine/alignment cue
6. **Tempo and pauses** — 1-sec squeeze at top, 3–5 sec lowering, pause at sticking point (bottom of squat is favorite)
7. **Force direction** — drive feet into floor, explode through hips
8. **Stop rules** — end set when form breaks; stop 1–2 reps before failure; rest briefly and finish rather than grind

**Product rules:**
- Each exercise carries max 3 cues, one MUST be stop rule or ROM limit
- On pain report: ask WHERE, map location to categories 1, 3, 5 for that exercise before proposing substitution
- Form-feedback features classify user issues into these 8 buckets for consistent coaching across exercises

---

## Beginner vs Intermediate: What Unlocks When

**Classify as beginner until:**
- ~12 consecutive logged weeks AND
- Load benchmark on main lower-body lift (reference uses squat at 1.5× bodyweight; use softer bar but USE one)

**Beginner mode shows:**
- Full-body rotation
- Work-up sets
- 3 cues per lift
- 1 progression mechanism
- Machines allowed if they reduce risk
- Pyramid sets (lighter/higher-rep first, heavier later) to teach movement while warming up

**Beginner mode HIDES:**
- Supersets
- Dropsets
- Tempo beyond "control the lowering"
- Max-effort days
- Specialty blocks

**Intermediate mode unlocks:**
- Upper/lower splits
- Body-part emphasis days (still obey balance rule)
- Max-effort work
- Supersets and trisets
- Dropsets ordered by mechanical advantage (hardest grip first)
- 6-week specialty blocks
- "Shock" protocols for stale body part (used sparingly)
- Techniques unlocked ONE AT A TIME, each with block length & exit condition

**At any level:**
- "Same thing for months, stalled" gets scheme rotation or 6-week block FIRST — NOT a new exercise list

---

## Ready-to-Ship Program Templates

### A. Beginner Full-Body, 3 Days (Non-Consecutive)
Default for anyone new or short on time. Variety from ROTATING REP SCHEME, not new exercises.

- **Mon:** squat · horizontal push · horizontal pull · brace | heavy (5s)
- **Wed:** hinge · vertical push · vertical pull · carry | moderate (8–10s)
- **Fri:** squat · horizontal push · horizontal pull · brace | higher-rep (12–15s)

Progression: load step on main lift; if 2 sessions miss target reps, drop load 5–10% and climb again.

### B. Upper/Lower, 4 Days
First split, once beginner has ~12 logged weeks. Each day still covers push & pull (upper) or squat & hinge (lower). Balance check runs weekly.

### C. Push/Pull/Legs, 3 or 6 Days
For intermediate who wants body-part emphasis while obeying balance rule. NEVER place two heavy sessions sharing muscle on consecutive days.

### D. Recomposition Circuit, 3 Days
Moderate reps paired upper-with-lower or push-with-pull, rests under 1 min. Progression is rest compression. App should say plainly: long slow cardio is NOT the efficient fat-loss tool; circuits & intervals are.

**All templates time-boxed at ~6 weeks.** At end: rotate rep scheme OR swap variant — NOT everything at once.

---

## Critical Product Checks

### Session Completeness
A session is complete when it covers: push, pull, lower.

### Week Completeness
A week is complete when each pattern appears at least 2×. FLAG any generated week that fails either check.

### Never Do
- Substitute across patterns (report "no pull available" vs quiet swap to push)
- Skip balance checks (pull vs push ratio is HARD constraint)
- Place heavy sessions on consecutive days
- Place heavy lower after sprint/interval day
- Skip work-up sets for heavy lifts
- Train to failure as default (1–2 reps in tank is baseline)
- Change everything at once (rotate scheme OR variant after block)
- Assign beginner: supersets, dropsets, max-effort, specialty blocks
- Use slow cardio as primary fat-loss tool (circuits/intervals instead)

### Always Do
- Tag exercises by pattern, equipment, joint stress, leverage knob
- Build weeks from patterns with balance check
- Let goal tag set reps, rest, pairing, progression mechanism
- Tier warm-ups by time & injury flags
- Generate work-up sets for heavy lifts
- Substitute on constraints, never across patterns
- Time-box blocks at 6 weeks
- Back off on: missed reps, pain flags, or block end
- Leave 1–2 reps in tank as baseline
- Warm whole body even on split day

---

## The Mental Model in One Paragraph

Pattern-based training with 7 movements covering the whole body. Balance is a hard check: pull must match push weekly or the system auto-corrects. Build weeks by availability (3-day full-body default), rotate rep schemes for variety, assign progression mechanism by goal (load step for strength, rest compression for fat loss, density for time-poor). Tier warm-ups by time, always generate work-up sets for heavy lifts. Substitute on constraints (equipment, joints) never across patterns; every pattern has bodyweight fallback. Time-box blocks at 6 weeks, back off on pain/misses/block-end. Beginners get 3 patterns, 3 days, 3 cues, straight sets; intermediates unlock techniques one at a time. Coaching copy draws from 8 cue buckets, max 3 per exercise, one always a stop/ROM rule. Leave reps in tank; failure is for intermediate isolation only.

---

**Status:** Internalized. Next build session hits clean against this.
