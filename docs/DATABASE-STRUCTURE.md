# Exercise Database Structure

Complete database schema for the Apex Coach Training exercise library, warm-ups, and program templates. Built to match the coaching specifications in `PROGRAMMING-PRINCIPLES.md` and `COACHING-REFERENCE.md`.

## Overview

The database is organized around **movement patterns** (not muscle groups) as the fundamental unit of programming. Every exercise is tagged with its pattern, equipment, joint stress, and progression/regression options to enable intelligent selection, substitution, and balance checking.

## Core Tables

### Movement Patterns

**Table:** `movement_patterns`

The seven movement patterns that cover the whole body (COACHING-REFERENCE.md §1):

- `horizontal_push` - chest, front shoulder, triceps
- `vertical_push` - shoulders, triceps, upper chest
- `horizontal_pull` - mid-back, rear shoulder, biceps
- `vertical_pull` - lats, biceps, forearms
- `squat` - quads, glutes, trunk
- `hinge` - hamstrings, glutes, back
- `carry_brace` - trunk, grip, whole body

**Columns:**
- `id` - pattern identifier
- `name` - display name
- `description` - what this pattern covers
- `primary_muscles` - JSON array of muscle groups

**Product rules:**
- A session is complete when it covers push, pull, and lower
- A week is complete when each pattern appears at least twice
- Balance check: pull sets must not fall below push sets for two consecutive weeks

### Equipment Types

**Table:** `equipment_types`

Equipment hierarchy for substitution chains (PROGRAMMING-PRINCIPLES.md §6):

`barbell → dumbbell → single dumbbell → band → suspension → bodyweight`

**Columns:**
- `id` - equipment identifier
- `name` - display name
- `priority` - lower number = higher priority (barbell=1, bodyweight=7)

**Product rules:**
- Every pattern must have a bodyweight fallback
- Substitution stays within pattern, only equipment changes

### Joint Stress Tags

**Table:** `joint_tags`

Five joint stress categories for pain-based filtering:

- `shoulder`, `elbow`, `wrist`, `knee`, `lower_back`

**Product rules:**
- On joint pain report, filter out exercises tagged for that joint
- Offer joint-friendly variant before full substitution

### Exercises

**Table:** `exercises`

The main exercise catalog. Each exercise carries eight fields for intelligent selection:

**Columns:**
- `id` - unique exercise identifier
- `name` - display name
- `pattern_id` - FK to movement_patterns (REQUIRED)
- `equipment_id` - FK to equipment_types (REQUIRED)
- `primary_muscles` - JSON array of main muscles worked
- `secondary_muscles` - JSON array of supporting muscles
- `is_bilateral` - 1=both sides, 0=single-side
- `is_compound` - 1=multi-joint, 0=isolation
- `regression_id` - FK to easier variant
- `progression_id` - FK to harder variant
- `leverage_knobs` - JSON array of ways to progress without adding weight
  - Examples: `["tempo", "pause_at_bottom", "feet_elevated", "single_arm"]`
- `description` - text explanation
- `demo_video_url` - optional video link

**Indexes:**
- `pattern_id` - fast lookup by movement pattern
- `equipment_id` - fast lookup by available equipment
- `is_compound` - filter compound vs. isolation

**Related tables:**
- `exercise_joint_stress` - junction table linking exercises to joint tags with stress level (low/moderate/high)

**Product rules:**
- Substitution is a lookup on `(pattern, equipment, joint flags)` in that priority
- Never substitute across patterns
- Heavy compound lifts first, isolation last in session order

## Cueing System

### Cue Categories

**Table:** `cue_categories`

The eight cueing buckets (COACHING-REFERENCE.md §2):

1. `spine_position` - maintaining natural curves
2. `bracing` - core and whole-body tension
3. `joint_alignment` - proper stacking and tracking
4. `anti_movement` - resisting unwanted motion
5. `range_limits` - conditional depth/ROM
6. `tempo_pauses` - movement speed and holds
7. `force_direction` - where to apply force
8. `stop_rules` - when to end the set

### Exercise Cues

**Table:** `exercise_cues`

Individual coaching cues tied to exercises.

**Columns:**
- `id` - unique cue identifier
- `exercise_id` - FK to exercises
- `category_id` - FK to cue_categories
- `cue_text` - the actual coaching instruction
- `is_critical` - 1 if this is the stop/ROM rule (required)
- `sort_order` - display order

**Product rules:**
- Max 3 cues per exercise
- At least one must be a stop rule or ROM limit (`is_critical=1`)
- On pain report, map location to categories 1, 3, 5 for that exercise

## Warm-Up System

### Warm-Up Tiers

**Table:** `warmup_tiers`

Three tiers based on time available (COACHING-REFERENCE.md §3):

- `practical` - under 45 min: cardio + mobility
- `practical_plus` - 45-60 min: practical + dynamic sequence
- `full` - 60+ min or injury flag: soft-tissue, pulse-raising, dynamic, static

**Columns:**
- `id` - tier identifier
- `tier_name` - display name
- `min_minutes` - minimum session time for this tier
- `description` - what's included

### Warm-Up Activities

**Table:** `warmup_activities`

Individual warm-up movements and drills.

**Columns:**
- `id` - activity identifier
- `name` - display name
- `activity_type` - `cardio`, `mobility`, `dynamic`, `soft_tissue`, `static`
- `target_area` - `hips`, `upper_back`, `shoulders`, `whole_body`
- `duration_sec` - suggested duration in seconds
- `description` - instructions
- `demo_video_url` - optional video

**Related tables:**
- `warmup_tier_activities` - junction table linking activities to tiers with `is_required` flag

**Product rules:**
- Ask "minutes available today" at session start
- Generate work-up sets from target load (4-5 steps for heavy, 2 for moderate, none for circuits)
- Even on split days, warm the whole body with one drill for the other half

## Programming System

### Training Goals

**Table:** `training_goals`

Five training goals with their parameter defaults (COACHING-REFERENCE.md §5):

**Columns:**
- `id` - goal identifier
- `name` - `strength`, `hypertrophy`, `fat_loss`, `conditioning`, `power`
- `rep_range_min`, `rep_range_max` - rep targets
- `rest_sec_min`, `rest_sec_max` - rest interval range
- `pairing_mode` - `straight`, `superset`, `circuit`
- `progression_mech` - which mechanism to use (FK to progression_mechanisms)
- `description` - text explanation

**Product rules:**
- Goal tag sets four defaults: reps, rest, pairing, progression mechanism
- Users may override one parameter but app warns if contradictory
- Make the goal's metric the headline number (density users see "reps in 20 min", not bar weight)

### Progression Mechanisms

**Table:** `progression_mechanisms`

Six progression mechanisms (PROGRAMMING-PRINCIPLES.md §4):

**Columns:**
- `id` - mechanism identifier
- `name` - `load_step`, `total_rep`, `rest_compression`, `volume_ramp`, `density`, `scheme_rotation`
- `tracks` - what metric this mechanism tracks
- `advance_when` - condition to progress
- `reset_when` - condition to back off
- `headline_metric` - what the user sees as the main number
- `description` - text explanation

**Examples:**

| Mechanism | Tracks | Advance when | Reset when |
|---|---|---|---|
| Load Step | Top-set weight | Target reps hit | Two misses → drop 5-10% |
| Total-Rep | Reps at fixed load | Total reached | Cap hit → raise load |
| Rest Compression | Seconds between sets | Every ~2 weeks | Rest floor → raise load |

**Product rules:**
- Assign mechanism per goal (strength=load_step, hypertrophy=total_rep, fat_loss=rest_compression)
- When "only one pair of dumbbells", switch to total_rep or density
- Time-box every block at ~6 weeks

### Program Templates

**Table:** `program_templates`

Ready-to-ship program structures (COACHING-REFERENCE.md §4).

**Columns:**
- `id` - template identifier
- `name` - display name
- `goal_id` - FK to training_goals
- `experience_level` - `beginner`, `intermediate`, `advanced`
- `days_per_week` - number of training days
- `split_type` - `full_body`, `upper_lower`, `ppl`, `circuit`
- `block_weeks` - time-box duration (default 6)
- `description` - text explanation

**Seeded templates:**
1. `beginner_fullbody_3day` - default for new/time-poor users
2. `upper_lower_4day` - first split after ~12 logged weeks
3. `recomp_circuit_3day` - fat loss / recomposition focus

### Template Sessions

**Table:** `template_sessions`

Individual training days within a template.

**Columns:**
- `id` - session identifier
- `template_id` - FK to program_templates
- `day_number` - day of week or sequence number
- `session_name` - e.g., "Upper A - Strength", "Lower B - Hypertrophy"
- `rep_feel` - e.g., "heavy (5s)", "moderate (8-10s)"
- `notes` - additional context

### Session Exercises

**Table:** `session_exercises`

Exercises/patterns assigned to each session.

**Columns:**
- `id` - exercise slot identifier
- `session_id` - FK to template_sessions
- `pattern_id` - FK to movement_patterns (pattern-based selection)
- `exercise_id` - FK to exercises (specific exercise, optional)
- `sets` - number of sets
- `reps_min`, `reps_max` - rep range
- `rest_sec` - rest interval
- `sort_order` - exercise order
- `notes` - additional context

**Product rules:**
- Pattern-based selection: `pattern_id` specified, actual exercise chosen at runtime based on equipment/user constraints
- Specific exercise: `exercise_id` specified (overrides pattern lookup)
- Circuit pairings: adjacent exercises must not share primary muscle

## Substitution System

### Exercise Substitutions

**Table:** `exercise_substitutions`

Pre-defined substitution rules for constraints.

**Columns:**
- `id` - substitution rule identifier
- `base_exercise_id` - FK to exercises (original)
- `sub_exercise_id` - FK to exercises (replacement)
- `reason` - `shoulder_friendly`, `lower_back_friendly`, `missing_barbell`, etc.
- `constraint_type` - `joint_pain`, `missing_equipment`, `load_too_light`
- `explanation` - one-line reason to show user
- `created_date`, `updated_date`

**Indexes:**
- `base_exercise_id` - fast lookup of alternatives
- `constraint_type` - filter by constraint category

**Product rules:**
- Substitution is a lookup on `(pattern, equipment, joint flags)` in that priority
- Never substitute across patterns; report "no pull available" rather than swapping in a push
- On joint pain, filter out exercises with that joint's stress tag and surface friendly variant

## Usage Examples

### 1. Select exercises for a beginner full-body session

```sql
-- Get a squat exercise for someone with only dumbbells
SELECT e.* FROM exercises e
WHERE e.pattern_id = 'squat'
  AND e.equipment_id IN ('dumbbell', 'bodyweight')
ORDER BY e.is_compound DESC, e.equipment_id ASC
LIMIT 1;
-- Returns: goblet_squat
```

### 2. Find joint-friendly alternative for shoulder pain

```sql
-- User reports shoulder pain on barbell bench press
SELECT s.sub_exercise_id, s.explanation, e.name
FROM exercise_substitutions s
JOIN exercises e ON s.sub_exercise_id = e.id
WHERE s.base_exercise_id = 'bench_press_bb'
  AND s.constraint_type = 'joint_pain'
  AND s.reason LIKE '%shoulder%';
-- Returns: incline_press_db, "Incline with neutral grip reduces shoulder stress"
```

### 3. Get coaching cues for an exercise

```sql
-- Fetch cues for deadlift
SELECT c.cue_text, c.is_critical, cat.name as category
FROM exercise_cues c
JOIN cue_categories cat ON c.category_id = cat.id
WHERE c.exercise_id = 'deadlift'
ORDER BY c.sort_order;
-- Returns:
-- 1. "Spine neutral from start to finish; never round the lower back" (critical, spine_position)
-- 2. "Deep breath and brace abs before every rep" (bracing)
-- 3. "Drive the floor away with your feet" (force_direction)
```

### 4. Check pattern balance for a week

```sql
-- Count sets per pattern for user's current week
SELECT se.pattern_id, mp.name, SUM(se.sets) as total_sets
FROM session_exercises se
JOIN movement_patterns mp ON se.pattern_id = mp.id
JOIN template_sessions ts ON se.session_id = ts.id
WHERE ts.template_id = 'beginner_fullbody_3day'
GROUP BY se.pattern_id
HAVING se.pattern_id IN ('horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull');
-- Check: pull_sets >= push_sets (balance rule)
```

### 5. Generate warm-up for session

```sql
-- User has 50 minutes → practical_plus tier
SELECT wa.name, wa.activity_type, wa.duration_sec, wa.description
FROM warmup_tier_activities wta
JOIN warmup_activities wa ON wta.activity_id = wa.id
WHERE wta.tier_id = 'practical_plus'
  AND wta.is_required = 1
ORDER BY wta.sort_order;
-- Returns: cardio + mobility + dynamic sequence
```

## Migration & Setup

**Files:**
- `migrations/001-exercise-database.sql` - creates all tables and seeds reference data
- `seed-exercises.sql` - populates exercise catalog with representative movements
- `seed-warmups-templates.sql` - populates warm-up activities and program templates

**Run order:**
```bash
# 1. Create tables and reference data
wrangler d1 execute <db-name> --file=migrations/001-exercise-database.sql

# 2. Load exercise catalog
wrangler d1 execute <db-name> --file=seed-exercises.sql

# 3. Load warm-ups and templates
wrangler d1 execute <db-name> --file=seed-warmups-templates.sql
```

All migrations are idempotent (safe to run multiple times) using `IF NOT EXISTS` and `INSERT OR IGNORE`.

## Design Principles

From PROGRAMMING-PRINCIPLES.md:

1. **Pattern-based, not muscle-based** - selection, substitution, and balance logic run on movement patterns, never on exercise names
2. **Balance is a hard constraint** - weekly pull sets must not fall below push sets
3. **Substitution stays within pattern** - never swap across patterns; report "unavailable" rather than breaking the rule
4. **Time-boxed blocks** - all programs run ~6 weeks, then rotate scheme or variant
5. **Beginner vs. intermediate unlocks** - beginners get full-body, 3 cues, 1 mechanism; intermediates unlock techniques one at a time
6. **Deload triggers** - two missed top sets, pain flags twice in 7 days, low recovery scores 3x, or block end
7. **Every pattern needs a bodyweight fallback** - no equipment should never be a dead end

From COACHING-REFERENCE.md:

1. **Max 3 cues per exercise** - one must be a stop rule or ROM limit
2. **Warm-up tiers by time** - practical (<45 min), practical_plus (45-60), full (60+ or injury)
3. **Work-up sets are mandatory** - generated from target load (4-5 steps for heavy, 2 for moderate)
4. **Goal sets 4 defaults** - reps, rest, pairing, progression mechanism
5. **Joint-friendly first** - offer variant before full substitution
6. **Load too light → leverage knobs** - tempo, unilateral, rest compression, circuit, higher reps (in that order)

---

Built by Max, Apex Coach. Every set is a rep toward the goal.
