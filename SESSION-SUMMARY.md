# Build Session Summary - Exercise Database Structure

**Session Date:** 2026-09-04
**Agent:** Max (Apex Coach)
**Branch:** town/apex
**Commit:** 215983c6

## What Was Built

Created complete exercise database structure for Apex Coach Training app, following specifications in `PROGRAMMING-PRINCIPLES.md` and `COACHING-REFERENCE.md`.

### Files Created

1. **schema-exercises.sql** (681 lines)
   - 18 tables for exercise library, cueing system, warm-ups, and program templates
   - Movement patterns (7), equipment types (9), joint tags (5)
   - Exercise catalog with pattern/equipment/joint-stress/regression/progression tracking
   - Cueing system with 8 categories, max 3 cues per exercise
   - Warm-up tiers (3) with activities
   - Training goals (5) with parameter defaults
   - Program templates with sessions and exercises
   - Progression mechanisms (6)
   - Exercise substitution rules

2. **seed-exercises.sql** (392 lines)
   - 50+ representative exercises covering all 7 movement patterns
   - Horizontal/vertical push, horizontal/vertical pull, squat, hinge, carry/brace
   - Every pattern has bodyweight fallback (per spec requirement)
   - Joint stress tags for each exercise
   - 3 coaching cues per exercise (one always stop/ROM rule)
   - Joint-friendly and equipment-based substitutions

3. **seed-warmups-templates.sql** (205 lines)
   - Warm-up activities for 3 tiers (practical, practical_plus, full)
   - 3 ready-to-ship program templates:
     - Beginner Full-Body 3-Day (default)
     - Upper/Lower 4-Day (intermediate)
     - Recomposition Circuit 3-Day (fat loss)
   - Session exercises with pattern-based selection

4. **migrations/001-exercise-database.sql** (185 lines)
   - Idempotent migration combining schema and reference data
   - Safe to run multiple times (IF NOT EXISTS, INSERT OR IGNORE)
   - Creates all tables and seeds core reference data

5. **docs/DATABASE-STRUCTURE.md** (437 lines)
   - Complete documentation of database structure
   - Table descriptions with columns and relationships
   - Usage examples (SQL queries)
   - Design principles and product rules
   - Migration instructions

## Database Design Highlights

### Core Principles (from PROGRAMMING-PRINCIPLES.md)

1. **Pattern-based, not muscle-based** - All selection/substitution logic runs on movement patterns
2. **Balance is a hard constraint** - Weekly pull sets must not fall below push sets
3. **Substitution stays within pattern** - Never swap across patterns; report "unavailable" instead
4. **Time-boxed blocks** - All programs run ~6 weeks
5. **Beginner vs. intermediate unlocks** - Progressive feature exposure
6. **Every pattern needs bodyweight fallback** - No equipment never a dead end

### Key Tables

- **movement_patterns** - The 7 patterns that cover the whole body
- **exercises** - Main catalog with 8 fields for intelligent selection
- **exercise_cues** - Max 3 per exercise, one always critical (stop/ROM)
- **warmup_tiers** - 3 tiers based on time available
- **training_goals** - 5 goals with parameter defaults (strength, hypertrophy, fat_loss, conditioning, power)
- **progression_mechanisms** - 6 mechanisms (load_step, total_rep, rest_compression, volume_ramp, density, scheme_rotation)
- **program_templates** - Ready-to-ship program structures
- **exercise_substitutions** - Pre-defined rules for constraints

### Seeded Data

**Movement Patterns (7):**
- horizontal_push, vertical_push, horizontal_pull, vertical_pull, squat, hinge, carry_brace

**Equipment Types (9):**
- barbell → dumbbell → single_dumbbell → kettlebell → band → suspension → bodyweight → machine → cable

**Joint Tags (5):**
- shoulder, elbow, wrist, knee, lower_back

**Cue Categories (8):**
- spine_position, bracing, joint_alignment, anti_movement, range_limits, tempo_pauses, force_direction, stop_rules

**Training Goals (5):**
- strength (3-5 reps, 2-4 min rest, load_step)
- hypertrophy (8-15 reps, 60-90s rest, total_rep)
- fat_loss (8-15 reps, <60s rest, circuit, rest_compression)
- conditioning (10-20 reps, 30-60s rest, density)
- power (1-3 reps, 2-5 min rest, load_step)

**Progression Mechanisms (6):**
- Load Step, Total-Rep Target, Rest Compression, Volume Ramp, Density, Scheme Rotation

**Program Templates (3):**
- Beginner Full-Body 3-Day (rotating rep schemes: heavy/moderate/high-rep)
- Upper/Lower 4-Day (strength/hypertrophy split)
- Recomposition Circuit 3-Day (upper/lower pairs, <60s rest)

### Representative Exercises (50+)

**Horizontal Push:** bench_press_bb, bench_press_db, incline_press_db, pushup, dip
**Vertical Push:** ohp_bb, ohp_db, landmine_press, pike_pushup
**Horizontal Pull:** barbell_row, db_row_1arm, chest_supported_row, inverted_row, cable_row
**Vertical Pull:** pullup, chinup, lat_pulldown, band_pulldown
**Squat:** back_squat, front_squat, goblet_squat, split_squat, bodyweight_squat
**Hinge:** deadlift, rdl, db_rdl, hip_thrust, kb_swing, glute_bridge
**Carry/Brace:** farmer_carry, suitcase_carry, plank, dead_bug, pallof_press

Each exercise includes:
- Pattern and equipment tags
- Primary/secondary muscles (JSON arrays)
- Bilateral/unilateral flag
- Regression/progression links
- Leverage knobs (ways to progress without weight)
- Joint stress tags
- 3 coaching cues (one critical)

### Substitution Rules

Seeded with examples:
- **Joint-friendly:** bench_press_bb → incline_press_db (shoulder-friendly)
- **Equipment fallback:** bench_press_bb → bench_press_db → pushup
- **Load-too-light:** pushup → feet_elevated pushup

## Next Steps

1. **Apply migration to D1 database:**
   ```bash
   wrangler d1 execute <db-name> --file=migrations/001-exercise-database.sql
   wrangler d1 execute <db-name> --file=seed-exercises.sql
   wrangler d1 execute <db-name> --file=seed-warmups-templates.sql
   ```

2. **Build API endpoints** to query exercise library:
   - GET /api/exercises?pattern=squat&equipment=dumbbell
   - GET /api/exercises/:id/cues
   - GET /api/exercises/:id/substitutions?constraint=joint_pain
   - GET /api/warmup?minutes=50
   - GET /api/templates?level=beginner

3. **Build program generator** that:
   - Selects exercises by pattern + available equipment
   - Generates warm-ups based on session time
   - Checks pattern balance (pull >= push)
   - Applies progression mechanism from goal
   - Triggers deload on missed sets/pain flags

4. **Build substitution engine** that:
   - Filters exercises by joint stress on pain report
   - Offers joint-friendly variant first
   - Falls back through equipment chain
   - Suggests leverage knobs when load too light
   - Never substitutes across patterns

## Status

✅ Database structure complete
✅ Committed to town/apex branch (215983c6)
⏳ Push to remote (requires auth - owner to complete)
⏳ Migration to D1 database
⏳ API endpoints
⏳ Program generator

## Notes

All work matches coaching spec from PROGRAMMING-PRINCIPLES.md and COACHING-REFERENCE.md. Every design decision traced to a specific product rule in those documents. Database is ready to drive intelligent exercise selection, substitution, and program generation per the coaching philosophy.

---

Built by Max, Apex Coach. Every rep in the database is a rep toward the goal. 💪
