-- Seed warm-up activities and program templates
-- Based on COACHING-REFERENCE.md §3 and §4

-- ============================================================================
-- WARM-UP ACTIVITIES (COACHING-REFERENCE.md §3)
-- ============================================================================

-- Practical tier: cardio + mobility
INSERT OR IGNORE INTO warmup_activities (id, name, activity_type, target_area, duration_sec, description, created_date, updated_date) VALUES
  ('row_easy', 'Easy Rowing', 'cardio', 'whole_body', 300, '5 minutes easy pace to raise pulse', datetime('now'), datetime('now')),
  ('bike_easy', 'Easy Bike', 'cardio', 'whole_body', 300, '5 minutes easy cycling to warm up', datetime('now'), datetime('now')),
  ('jump_rope', 'Jump Rope', 'cardio', 'whole_body', 180, '3 minutes light skipping', datetime('now'), datetime('now')),
  ('hip_circles', 'Hip Circles', 'mobility', 'hips', 60, '10 circles each direction to open hips', datetime('now'), datetime('now')),
  ('cat_cow', 'Cat-Cow', 'mobility', 'upper_back', 60, '10 reps to mobilize thoracic spine', datetime('now'), datetime('now')),
  ('world_greatest_stretch', 'World''s Greatest Stretch', 'mobility', 'hips', 90, '3 reps each side for hip and t-spine mobility', datetime('now'), datetime('now'));

-- Dynamic tier: movement sequences for session ranges
INSERT OR IGNORE INTO warmup_activities (id, name, activity_type, target_area, duration_sec, description, created_date, updated_date) VALUES
  ('leg_swings', 'Leg Swings', 'dynamic', 'hips', 60, 'Front-back and side-side, 10 each leg', datetime('now'), datetime('now')),
  ('arm_circles', 'Arm Circles', 'dynamic', 'shoulders', 60, 'Forward and backward, 10 each direction', datetime('now'), datetime('now')),
  ('inchworm', 'Inchworm', 'dynamic', 'whole_body', 90, '5 reps to warm hamstrings and shoulders', datetime('now'), datetime('now')),
  ('spiderman_lunge', 'Spiderman Lunge', 'dynamic', 'hips', 90, '5 each side for hip mobility', datetime('now'), datetime('now')),
  ('scapular_pushup', 'Scapular Push-Up', 'dynamic', 'shoulders', 60, '10 reps to activate scapular muscles', datetime('now'), datetime('now')),
  ('bodyweight_squat_warmup', 'Bodyweight Squat', 'dynamic', 'whole_body', 60, '10 reps to groove squat pattern', datetime('now'), datetime('now'));

-- Full tier: soft-tissue work
INSERT OR IGNORE INTO warmup_activities (id, name, activity_type, target_area, duration_sec, description, created_date, updated_date) VALUES
  ('foam_roll_quads', 'Foam Roll Quads', 'soft_tissue', 'legs', 90, 'Roll each quad for 45 seconds', datetime('now'), datetime('now')),
  ('foam_roll_upper_back', 'Foam Roll Upper Back', 'soft_tissue', 'upper_back', 90, 'Roll thoracic spine for 90 seconds', datetime('now'), datetime('now')),
  ('lacrosse_ball_glutes', 'Lacrosse Ball Glutes', 'soft_tissue', 'hips', 120, 'Target tight spots in glutes, 1 minute each side', datetime('now'), datetime('now'));

-- Static holds (only for chronic tightness in full tier)
INSERT OR IGNORE INTO warmup_activities (id, name, activity_type, target_area, duration_sec, description, created_date, updated_date) VALUES
  ('couch_stretch', 'Couch Stretch', 'static', 'hips', 120, 'Hip flexor stretch, 1 minute each side (only if chronically tight)', datetime('now'), datetime('now')),
  ('doorway_pec_stretch', 'Doorway Pec Stretch', 'static', 'shoulders', 90, 'Chest stretch, 45s each side (only if chronically tight)', datetime('now'), datetime('now'));

-- Assign activities to tiers
-- Practical tier (under 45 min)
INSERT OR IGNORE INTO warmup_tier_activities (tier_id, activity_id, is_required, sort_order) VALUES
  ('practical', 'row_easy', 1, 1),
  ('practical', 'bike_easy', 0, 2),  -- alternative to rowing
  ('practical', 'jump_rope', 0, 3),   -- alternative cardio
  ('practical', 'hip_circles', 1, 4),
  ('practical', 'cat_cow', 1, 5);

-- Practical plus tier (45-60 min): practical + dynamic
INSERT OR IGNORE INTO warmup_tier_activities (tier_id, activity_id, is_required, sort_order) VALUES
  ('practical_plus', 'row_easy', 1, 1),
  ('practical_plus', 'hip_circles', 1, 2),
  ('practical_plus', 'cat_cow', 1, 3),
  ('practical_plus', 'leg_swings', 1, 4),
  ('practical_plus', 'arm_circles', 1, 5),
  ('practical_plus', 'inchworm', 1, 6),
  ('practical_plus', 'spiderman_lunge', 1, 7),
  ('practical_plus', 'bodyweight_squat_warmup', 1, 8);

-- Full tier (60+ min or injury flag): all components
INSERT OR IGNORE INTO warmup_tier_activities (tier_id, activity_id, is_required, sort_order) VALUES
  ('full', 'foam_roll_quads', 1, 1),
  ('full', 'foam_roll_upper_back', 1, 2),
  ('full', 'lacrosse_ball_glutes', 0, 3),
  ('full', 'row_easy', 1, 4),
  ('full', 'bike_easy', 0, 5),
  ('full', 'hip_circles', 1, 6),
  ('full', 'cat_cow', 1, 7),
  ('full', 'world_greatest_stretch', 1, 8),
  ('full', 'leg_swings', 1, 9),
  ('full', 'arm_circles', 1, 10),
  ('full', 'inchworm', 1, 11),
  ('full', 'spiderman_lunge', 1, 12),
  ('full', 'scapular_pushup', 1, 13),
  ('full', 'bodyweight_squat_warmup', 1, 14),
  ('full', 'couch_stretch', 0, 15),      -- only if tight
  ('full', 'doorway_pec_stretch', 0, 16); -- only if tight

-- ============================================================================
-- PROGRAM TEMPLATES (COACHING-REFERENCE.md §4)
-- ============================================================================

-- Template A: Beginner full-body, 3 days (the default)
INSERT OR IGNORE INTO program_templates (id, name, goal_id, experience_level, days_per_week, split_type, block_weeks, description, created_date, updated_date) VALUES
  ('beginner_fullbody_3day', 'Beginner Full-Body 3-Day', 'hypertrophy', 'beginner', 3, 'full_body', 6,
   'Default for anyone new or short on time. Variety from rotating rep schemes, not new exercises.',
   datetime('now'), datetime('now'));

-- Sessions for beginner full-body template
INSERT OR IGNORE INTO template_sessions (id, template_id, day_number, session_name, rep_feel, notes, created_date, updated_date) VALUES
  ('beginner_fb_day1', 'beginner_fullbody_3day', 1, 'Day 1 - Heavy', 'heavy (5s)', 'Monday: squat, horizontal push, horizontal pull, brace', datetime('now'), datetime('now')),
  ('beginner_fb_day2', 'beginner_fullbody_3day', 3, 'Day 2 - Moderate', 'moderate (8-10s)', 'Wednesday: hinge, vertical push, vertical pull, carry', datetime('now'), datetime('now')),
  ('beginner_fb_day3', 'beginner_fullbody_3day', 5, 'Day 3 - Higher-Rep', 'higher-rep (12-15s)', 'Friday: squat, horizontal push, horizontal pull, brace', datetime('now'), datetime('now'));

-- Day 1 exercises (pattern-based, specific exercise chosen at runtime)
INSERT OR IGNORE INTO session_exercises (id, session_id, pattern_id, exercise_id, sets, reps_min, reps_max, rest_sec, sort_order, notes, created_date, updated_date) VALUES
  ('beginner_d1_ex1', 'beginner_fb_day1', 'squat', NULL, 3, 5, 5, 180, 1, 'Main lower-body lift', datetime('now'), datetime('now')),
  ('beginner_d1_ex2', 'beginner_fb_day1', 'horizontal_push', NULL, 3, 5, 5, 150, 2, 'Main push', datetime('now'), datetime('now')),
  ('beginner_d1_ex3', 'beginner_fb_day1', 'horizontal_pull', NULL, 3, 5, 5, 150, 3, 'Main pull', datetime('now'), datetime('now')),
  ('beginner_d1_ex4', 'beginner_fb_day1', 'carry_brace', NULL, 3, 30, 60, 90, 4, 'Core work (seconds for carries, reps for planks)', datetime('now'), datetime('now'));

-- Day 2 exercises
INSERT OR IGNORE INTO session_exercises (id, session_id, pattern_id, exercise_id, sets, reps_min, reps_max, rest_sec, sort_order, notes, created_date, updated_date) VALUES
  ('beginner_d2_ex1', 'beginner_fb_day2', 'hinge', NULL, 3, 8, 10, 120, 1, 'Hip-dominant lower', datetime('now'), datetime('now')),
  ('beginner_d2_ex2', 'beginner_fb_day2', 'vertical_push', NULL, 3, 8, 10, 120, 2, 'Overhead press', datetime('now'), datetime('now')),
  ('beginner_d2_ex3', 'beginner_fb_day2', 'vertical_pull', NULL, 3, 8, 10, 120, 3, 'Vertical pull', datetime('now'), datetime('now')),
  ('beginner_d2_ex4', 'beginner_fb_day2', 'carry_brace', NULL, 3, 40, 60, 90, 4, 'Carries or holds', datetime('now'), datetime('now'));

-- Day 3 exercises
INSERT OR IGNORE INTO session_exercises (id, session_id, pattern_id, exercise_id, sets, reps_min, reps_max, rest_sec, sort_order, notes, created_date, updated_date) VALUES
  ('beginner_d3_ex1', 'beginner_fb_day3', 'squat', NULL, 3, 12, 15, 90, 1, 'Higher-rep squat', datetime('now'), datetime('now')),
  ('beginner_d3_ex2', 'beginner_fb_day3', 'horizontal_push', NULL, 3, 12, 15, 90, 2, 'Higher-rep push', datetime('now'), datetime('now')),
  ('beginner_d3_ex3', 'beginner_fb_day3', 'horizontal_pull', NULL, 3, 12, 15, 90, 3, 'Higher-rep pull', datetime('now'), datetime('now')),
  ('beginner_d3_ex4', 'beginner_fb_day3', 'carry_brace', NULL, 2, 30, 60, 60, 4, 'Lighter core finish', datetime('now'), datetime('now'));

-- Template B: Upper/Lower 4-day (for intermediates with 12+ weeks logged)
INSERT OR IGNORE INTO program_templates (id, name, goal_id, experience_level, days_per_week, split_type, block_weeks, description, created_date, updated_date) VALUES
  ('upper_lower_4day', 'Upper/Lower 4-Day', 'hypertrophy', 'intermediate', 4, 'upper_lower', 6,
   'First split after ~12 logged weeks. Each day covers push+pull (upper) or squat+hinge (lower).',
   datetime('now'), datetime('now'));

-- Sessions for upper/lower
INSERT OR IGNORE INTO template_sessions (id, template_id, day_number, session_name, rep_feel, notes, created_date, updated_date) VALUES
  ('ul_day1', 'upper_lower_4day', 1, 'Upper A - Strength', 'heavy (5-8)', 'Monday: heavy horizontal push/pull focus', datetime('now'), datetime('now')),
  ('ul_day2', 'upper_lower_4day', 2, 'Lower A - Strength', 'heavy (5-8)', 'Tuesday: squat emphasis', datetime('now'), datetime('now')),
  ('ul_day3', 'upper_lower_4day', 4, 'Upper B - Hypertrophy', 'moderate (10-12)', 'Thursday: vertical push/pull focus', datetime('now'), datetime('now')),
  ('ul_day4', 'upper_lower_4day', 5, 'Lower B - Hypertrophy', 'moderate (10-12)', 'Friday: hinge emphasis', datetime('now'), datetime('now'));

-- Upper A exercises
INSERT OR IGNORE INTO session_exercises (id, session_id, pattern_id, exercise_id, sets, reps_min, reps_max, rest_sec, sort_order, notes, created_date, updated_date) VALUES
  ('ul_ua_ex1', 'ul_day1', 'horizontal_push', NULL, 4, 5, 8, 180, 1, 'Heavy bench or dumbbell press', datetime('now'), datetime('now')),
  ('ul_ua_ex2', 'ul_day1', 'horizontal_pull', NULL, 4, 5, 8, 180, 2, 'Heavy row', datetime('now'), datetime('now')),
  ('ul_ua_ex3', 'ul_day1', 'vertical_push', NULL, 3, 8, 10, 120, 3, 'Overhead press secondary', datetime('now'), datetime('now')),
  ('ul_ua_ex4', 'ul_day1', 'vertical_pull', NULL, 3, 8, 10, 120, 4, 'Pull-ups or pulldowns', datetime('now'), datetime('now'));

-- Lower A exercises
INSERT OR IGNORE INTO session_exercises (id, session_id, pattern_id, exercise_id, sets, reps_min, reps_max, rest_sec, sort_order, notes, created_date, updated_date) VALUES
  ('ul_la_ex1', 'ul_day2', 'squat', NULL, 4, 5, 8, 180, 1, 'Heavy squat variant', datetime('now'), datetime('now')),
  ('ul_la_ex2', 'ul_day2', 'hinge', NULL, 3, 8, 10, 150, 2, 'RDL or hip thrust', datetime('now'), datetime('now')),
  ('ul_la_ex3', 'ul_day2', 'squat', NULL, 3, 10, 12, 120, 3, 'Secondary squat pattern (split squat)', datetime('now'), datetime('now')),
  ('ul_la_ex4', 'ul_day2', 'carry_brace', NULL, 3, 40, 60, 90, 4, 'Core work', datetime('now'), datetime('now'));

-- Upper B exercises
INSERT OR IGNORE INTO session_exercises (id, session_id, pattern_id, exercise_id, sets, reps_min, reps_max, rest_sec, sort_order, notes, created_date, updated_date) VALUES
  ('ul_ub_ex1', 'ul_day3', 'vertical_push', NULL, 4, 8, 12, 120, 1, 'Overhead press emphasis', datetime('now'), datetime('now')),
  ('ul_ub_ex2', 'ul_day3', 'vertical_pull', NULL, 4, 8, 12, 120, 2, 'Pull-up or pulldown emphasis', datetime('now'), datetime('now')),
  ('ul_ub_ex3', 'ul_day3', 'horizontal_push', NULL, 3, 10, 12, 90, 3, 'Push-up or dumbbell press', datetime('now'), datetime('now')),
  ('ul_ub_ex4', 'ul_day3', 'horizontal_pull', NULL, 3, 10, 12, 90, 4, 'Cable or dumbbell row', datetime('now'), datetime('now'));

-- Lower B exercises
INSERT OR IGNORE INTO session_exercises (id, session_id, pattern_id, exercise_id, sets, reps_min, reps_max, rest_sec, sort_order, notes, created_date, updated_date) VALUES
  ('ul_lb_ex1', 'ul_day4', 'hinge', NULL, 4, 8, 10, 150, 1, 'Deadlift or RDL emphasis', datetime('now'), datetime('now')),
  ('ul_lb_ex2', 'ul_day4', 'squat', NULL, 3, 10, 12, 120, 2, 'Goblet squat or split squat', datetime('now'), datetime('now')),
  ('ul_lb_ex3', 'ul_day4', 'hinge', NULL, 3, 12, 15, 90, 3, 'Hip thrust or glute bridge', datetime('now'), datetime('now')),
  ('ul_lb_ex4', 'ul_day4', 'carry_brace', NULL, 3, 40, 60, 90, 4, 'Farmer or suitcase carry', datetime('now'), datetime('now'));

-- Template C: Recomposition Circuit 3-day
INSERT OR IGNORE INTO program_templates (id, name, goal_id, experience_level, days_per_week, split_type, block_weeks, description, created_date, updated_date) VALUES
  ('recomp_circuit_3day', 'Recomposition Circuit 3-Day', 'fat_loss', 'beginner', 3, 'circuit', 6,
   'Moderate reps paired upper/lower or push/pull, rests under 60s. Progression is rest compression.',
   datetime('now'), datetime('now'));

-- Sessions for recomp circuit
INSERT OR IGNORE INTO template_sessions (id, template_id, day_number, session_name, rep_feel, notes, created_date, updated_date) VALUES
  ('recomp_day1', 'recomp_circuit_3day', 1, 'Circuit A', 'moderate (10-12)', 'Upper/lower pairs, 45s rest', datetime('now'), datetime('now')),
  ('recomp_day2', 'recomp_circuit_3day', 3, 'Circuit B', 'moderate (10-12)', 'Push/pull pairs, 45s rest', datetime('now'), datetime('now')),
  ('recomp_day3', 'recomp_circuit_3day', 5, 'Circuit C', 'moderate (12-15)', 'Full-body circuit, 30s rest', datetime('now'), datetime('now'));

-- Circuit A exercises (upper/lower pairs)
INSERT OR IGNORE INTO session_exercises (id, session_id, pattern_id, exercise_id, sets, reps_min, reps_max, rest_sec, sort_order, notes, created_date, updated_date) VALUES
  ('recomp_a_ex1', 'recomp_day1', 'squat', NULL, 3, 10, 12, 45, 1, 'Pair 1A: squat', datetime('now'), datetime('now')),
  ('recomp_a_ex2', 'recomp_day1', 'horizontal_push', NULL, 3, 10, 12, 45, 2, 'Pair 1B: push', datetime('now'), datetime('now')),
  ('recomp_a_ex3', 'recomp_day1', 'hinge', NULL, 3, 10, 12, 45, 3, 'Pair 2A: hinge', datetime('now'), datetime('now')),
  ('recomp_a_ex4', 'recomp_day1', 'horizontal_pull', NULL, 3, 10, 12, 45, 4, 'Pair 2B: pull', datetime('now'), datetime('now')),
  ('recomp_a_ex5', 'recomp_day1', 'carry_brace', NULL, 3, 40, 60, 30, 5, 'Finisher: core', datetime('now'), datetime('now'));

-- Circuit B exercises (push/pull pairs)
INSERT OR IGNORE INTO session_exercises (id, session_id, pattern_id, exercise_id, sets, reps_min, reps_max, rest_sec, sort_order, notes, created_date, updated_date) VALUES
  ('recomp_b_ex1', 'recomp_day2', 'vertical_push', NULL, 3, 10, 12, 45, 1, 'Pair 1A: overhead press', datetime('now'), datetime('now')),
  ('recomp_b_ex2', 'recomp_day2', 'vertical_pull', NULL, 3, 10, 12, 45, 2, 'Pair 1B: pull-up/pulldown', datetime('now'), datetime('now')),
  ('recomp_b_ex3', 'recomp_day2', 'squat', NULL, 3, 12, 15, 45, 3, 'Pair 2A: split squat', datetime('now'), datetime('now')),
  ('recomp_b_ex4', 'recomp_day2', 'hinge', NULL, 3, 12, 15, 45, 4, 'Pair 2B: hip thrust', datetime('now'), datetime('now')),
  ('recomp_b_ex5', 'recomp_day2', 'carry_brace', NULL, 3, 40, 60, 30, 5, 'Finisher: carries', datetime('now'), datetime('now'));

-- Circuit C exercises (full-body high-rep)
INSERT OR IGNORE INTO session_exercises (id, session_id, pattern_id, exercise_id, sets, reps_min, reps_max, rest_sec, sort_order, notes, created_date, updated_date) VALUES
  ('recomp_c_ex1', 'recomp_day3', 'squat', NULL, 3, 12, 15, 30, 1, 'Goblet squat', datetime('now'), datetime('now')),
  ('recomp_c_ex2', 'recomp_day3', 'horizontal_push', NULL, 3, 12, 15, 30, 2, 'Push-ups', datetime('now'), datetime('now')),
  ('recomp_c_ex3', 'recomp_day3', 'hinge', NULL, 3, 12, 15, 30, 3, 'KB swing or hip thrust', datetime('now'), datetime('now')),
  ('recomp_c_ex4', 'recomp_day3', 'horizontal_pull', NULL, 3, 12, 15, 30, 4, 'Inverted row', datetime('now'), datetime('now')),
  ('recomp_c_ex5', 'recomp_day3', 'carry_brace', NULL, 3, 30, 45, 30, 5, 'Plank or dead bug', datetime('now'), datetime('now'));
