# Exercise Database Seeding Scripts

Scripts for populating the Apex Coach Training exercise database from the coaching references.

## Overview

The exercise database uses a normalized schema (defined in `schema-exercises.sql`) that organizes exercises by movement pattern, equipment, joint stress, and coaching cues. This structure enables:

- **Pattern-based selection**: Find all horizontal push exercises
- **Equipment substitution**: Swap barbell → dumbbell → bodyweight
- **Joint-friendly filtering**: Exclude exercises that stress an injured joint
- **Progression tracking**: Link regressions and progressions
- **Coaching consistency**: Store max 3 cues per exercise, one always a stop/ROM rule

## Scripts

### `seed-from-reference.mjs`

**Purpose**: Populates the normalized exercise database from COACHING-REFERENCE.md

**Usage**:
```bash
node scripts/seed-from-reference.mjs
```

**What it does**:
1. Reads exercise definitions organized by movement pattern from the script
2. Generates SQL INSERT statements for:
   - Exercises with all 8 required fields (pattern, equipment, muscles, joints, bilateral/unilateral, regression, progression, leverage knobs)
   - Joint stress mappings (which joints does this exercise stress, and how much)
   - Exercise cues (max 3, following the 8 cueing buckets, one always critical)
3. Writes SQL to a temp file and executes via wrangler d1

**Source of truth**:
- Exercise catalog structure: `COACHING-REFERENCE.md` §1 (the seven patterns + representative movements)
- Cueing system: `COACHING-REFERENCE.md` §2 (the eight cueing buckets)
- Selection/substitution rules: `PROGRAMMING-PRINCIPLES.md` §6

**Output**:
- ~35 exercises across 7 movement patterns
- ~90 joint stress mappings
- ~105 coaching cues
- Total: ~179 SQL statements

**Exercise count by pattern**:
- horizontal_push: 5 exercises (barbell bench, dumbbell bench, incline DB press, push-up, dip)
- vertical_push: 4 exercises (barbell OHP, dumbbell OHP, landmine press, pike push-up)
- horizontal_pull: 5 exercises (barbell row, 1-arm DB row, chest-supported row, inverted row, cable row)
- vertical_pull: 4 exercises (pull-up, chin-up, lat pulldown, band pulldown)
- squat: 5 exercises (back squat, front squat, goblet squat, split squat, bodyweight squat)
- hinge: 6 exercises (deadlift, RDL, DB RDL, hip thrust, KB swing, glute bridge)
- carry_brace: 5 exercises (farmer carry, suitcase carry, plank, dead bug, pallof press)

### `seed-exercises.mjs`

**Purpose**: Legacy script that seeds from the COACHING_EXERCISES array in the worker source

**Usage**:
```bash
node scripts/seed-exercises.mjs
```

**What it does**:
- Extracts COACHING_EXERCISES and COACHING_TEMPLATES arrays from `functions/api/[[path]].js`
- Seeds them as JSON blobs into the `entities` table (entity_type: 'CoachingExercise', 'FitnessTemplate')

**Note**: This script uses the older entity-blob approach. For the normalized schema, use `seed-from-reference.mjs` instead.

## Schema Reference

The exercise database schema (defined in `schema-exercises.sql`) includes:

### Core Tables

- **movement_patterns**: The 7 movement patterns (horizontal/vertical push/pull, squat, hinge, carry/brace)
- **equipment_types**: Equipment with progression priority (barbell→dumbbell→band→bodyweight)
- **joint_tags**: Joint stress locations (shoulder, elbow, wrist, knee, lower_back)
- **exercises**: Main catalog with 8 required fields per COACHING-REFERENCE.md
- **exercise_joint_stress**: Junction table mapping exercises to stressed joints
- **cue_categories**: The 8 cueing buckets (spine, bracing, joint alignment, anti-movement, range limits, tempo, force direction, stop rules)
- **exercise_cues**: Individual cues (max 3 per exercise, one always is_critical)

### Reference Data

Reference data (patterns, equipment types, joint tags, cue categories, training goals, progression mechanisms, warmup tiers) is inserted by `schema-exercises.sql` itself — the seed scripts only add exercises and cues.

## Content Rules

Per `COACHING-REFERENCE.md` §1:

1. **Every pattern needs a bodyweight fallback** — a user with no equipment should never hit a dead end
2. **Direct arm, calf, neck and trap work are garnish** — tagged separately and only ever appended after the pattern lifts

Per `COACHING-REFERENCE.md` §2:

1. **Each exercise carries at most three cues**
2. **At least one must be a stop rule or ROM limit** (is_critical = 1)
3. **Cues draw from the eight buckets** so coaching copy stays consistent

## Adding New Exercises

To add exercises to the database:

1. Add the exercise definition to the appropriate pattern array in `seed-from-reference.mjs`
2. Ensure all 8 required fields are present:
   - pattern_id (one of the 7 patterns)
   - equipment_id (barbell, dumbbell, bodyweight, etc.)
   - primary_muscles (JSON array)
   - joint_tags (array of {tag, level} objects)
   - is_bilateral (true/false)
   - regression_id (easier variant, or null if this is the regression)
   - progression_id (harder variant, or null if this is the top)
   - leverage_knobs (JSON array: ways to make it harder without weight)
3. Add 1-3 cues, ensuring:
   - At least one has is_critical: true (stop rule or ROM limit)
   - Each cue has a category from the 8 buckets
4. Run the seed script to update the database

## Troubleshooting

**"workerd platform mismatch" error**: This happens when running in WSL or a container with node_modules from a different platform. The SQL file is still generated correctly at `scripts/.seed-exercises-temp.sql` — you can inspect it or run it manually.

**"missing equipment type" error**: Check that all equipment values in your exercise definitions match the equipment_types inserted by schema-exercises.sql (barbell, dumbbell, bodyweight, etc.)

**"missing pattern" error**: Ensure pattern_id is one of the 7 patterns: horizontal_push, vertical_push, horizontal_pull, vertical_pull, squat, hinge, carry_brace

## Files

- `seed-from-reference.mjs` — Normalized schema seeding (recommended)
- `seed-exercises.mjs` — Legacy entity-blob seeding
- `.seed-exercises-temp.sql` — Generated SQL (gitignored, created at runtime)
- `README.md` — This file
