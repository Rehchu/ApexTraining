-- Seed exercise data for Apex Coach Training
-- Representative movements from COACHING-REFERENCE.md §1
-- Each pattern must have a bodyweight fallback per content rules

-- ============================================================================
-- HORIZONTAL PUSH EXERCISES
-- ============================================================================

INSERT OR IGNORE INTO exercises (id, name, pattern_id, equipment_id, primary_muscles, secondary_muscles, is_bilateral, is_compound, leverage_knobs, description, created_date, updated_date) VALUES
  -- Barbell horizontal push
  ('bench_press_bb', 'Barbell Bench Press', 'horizontal_push', 'barbell', '["chest", "front_shoulder", "triceps"]', '["trunk"]', 1, 1, '["tempo", "pause_at_bottom", "feet_elevated"]', 'Classic barbell bench press', datetime('now'), datetime('now')),

  -- Dumbbell horizontal push
  ('bench_press_db', 'Dumbbell Bench Press', 'horizontal_push', 'dumbbell', '["chest", "front_shoulder", "triceps"]', '["trunk"]', 1, 1, '["tempo", "unilateral", "pause_at_bottom"]', 'Dumbbell bench press with greater ROM', datetime('now'), datetime('now')),
  ('incline_press_db', 'Incline Dumbbell Press', 'horizontal_push', 'dumbbell', '["upper_chest", "front_shoulder", "triceps"]', '["trunk"]', 1, 1, '["tempo", "unilateral"]', 'Joint-friendly incline variant', datetime('now'), datetime('now')),

  -- Bodyweight horizontal push (mandatory fallback)
  ('pushup', 'Push-Up', 'horizontal_push', 'bodyweight', '["chest", "front_shoulder", "triceps"]', '["trunk", "glutes"]', 1, 1, '["feet_elevated", "tempo", "pause_at_bottom", "single_arm"]', 'Bodyweight pressing fallback', datetime('now'), datetime('now')),
  ('dip', 'Dip', 'horizontal_push', 'bodyweight', '["chest", "front_shoulder", "triceps"]', '["trunk"]', 1, 1, '["tempo", "weighted", "pause_at_bottom"]', 'Advanced bodyweight press', datetime('now'), datetime('now'));

-- Joint stress for horizontal push
INSERT OR IGNORE INTO exercise_joint_stress (exercise_id, joint_tag_id, stress_level) VALUES
  ('bench_press_bb', 'shoulder', 'moderate'),
  ('bench_press_bb', 'elbow', 'moderate'),
  ('bench_press_db', 'shoulder', 'low'),
  ('bench_press_db', 'elbow', 'low'),
  ('incline_press_db', 'shoulder', 'low'),
  ('pushup', 'shoulder', 'low'),
  ('pushup', 'wrist', 'moderate'),
  ('dip', 'shoulder', 'high'),
  ('dip', 'elbow', 'moderate');

-- Cues for bench press (max 3, one must be stop/ROM)
INSERT OR IGNORE INTO exercise_cues (id, exercise_id, category_id, cue_text, is_critical, sort_order, created_date, updated_date) VALUES
  ('bench_bb_cue1', 'bench_press_bb', 'bracing', 'Squeeze shoulder blades together and keep them pinned to the bench', 0, 1, datetime('now'), datetime('now')),
  ('bench_bb_cue2', 'bench_press_bb', 'joint_alignment', 'Elbows tucked about 45 degrees, not flared straight out', 0, 2, datetime('now'), datetime('now')),
  ('bench_bb_cue3', 'bench_press_bb', 'stop_rules', 'Leave 1-2 reps in the tank; stop when form breaks', 1, 3, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO exercise_cues (id, exercise_id, category_id, cue_text, is_critical, sort_order, created_date, updated_date) VALUES
  ('pushup_cue1', 'pushup', 'bracing', 'Abs tight, glutes squeezed, body in a straight line', 0, 1, datetime('now'), datetime('now')),
  ('pushup_cue2', 'pushup', 'range_limits', 'Lower as far as you can without shoulders rounding forward', 1, 2, datetime('now'), datetime('now')),
  ('pushup_cue3', 'pushup', 'tempo_pauses', 'Control the descent over 2 seconds', 0, 3, datetime('now'), datetime('now'));

-- ============================================================================
-- VERTICAL PUSH EXERCISES
-- ============================================================================

INSERT OR IGNORE INTO exercises (id, name, pattern_id, equipment_id, primary_muscles, secondary_muscles, is_bilateral, is_compound, leverage_knobs, description, created_date, updated_date) VALUES
  ('ohp_bb', 'Barbell Overhead Press', 'vertical_push', 'barbell', '["shoulders", "triceps", "upper_chest"]', '["trunk"]', 1, 1, '["tempo", "pause_at_bottom"]', 'Standing overhead press', datetime('now'), datetime('now')),
  ('ohp_db', 'Dumbbell Overhead Press', 'vertical_push', 'dumbbell', '["shoulders", "triceps"]', '["trunk"]', 1, 1, '["tempo", "unilateral", "seated"]', 'Dumbbell shoulder press', datetime('now'), datetime('now')),
  ('landmine_press', 'Landmine Press', 'vertical_push', 'barbell', '["front_shoulder", "triceps", "upper_chest"]', '["trunk"]', 0, 1, '["unilateral", "tempo"]', 'Joint-friendly angled press', datetime('now'), datetime('now')),
  ('pike_pushup', 'Pike Push-Up', 'vertical_push', 'bodyweight', '["shoulders", "triceps"]', '["upper_chest"]', 1, 1, '["feet_elevated", "tempo", "hands_elevated"]', 'Bodyweight overhead press fallback', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO exercise_joint_stress (exercise_id, joint_tag_id, stress_level) VALUES
  ('ohp_bb', 'shoulder', 'high'),
  ('ohp_db', 'shoulder', 'moderate'),
  ('landmine_press', 'shoulder', 'low'),
  ('pike_pushup', 'shoulder', 'moderate'),
  ('pike_pushup', 'wrist', 'moderate');

INSERT OR IGNORE INTO exercise_cues (id, exercise_id, category_id, cue_text, is_critical, sort_order, created_date, updated_date) VALUES
  ('ohp_cue1', 'ohp_bb', 'bracing', 'Abs braced hard, glutes squeezed to protect lower back', 0, 1, datetime('now'), datetime('now')),
  ('ohp_cue2', 'ohp_bb', 'force_direction', 'Press the bar up and slightly back so it finishes over your mid-foot', 0, 2, datetime('now'), datetime('now')),
  ('ohp_cue3', 'ohp_bb', 'stop_rules', 'Stop when you cannot complete a rep without leaning back excessively', 1, 3, datetime('now'), datetime('now'));

-- ============================================================================
-- HORIZONTAL PULL EXERCISES
-- ============================================================================

INSERT OR IGNORE INTO exercises (id, name, pattern_id, equipment_id, primary_muscles, secondary_muscles, is_bilateral, is_compound, leverage_knobs, description, created_date, updated_date) VALUES
  ('barbell_row', 'Barbell Row', 'horizontal_pull', 'barbell', '["mid_back", "lats", "rear_shoulder"]', '["biceps", "forearms", "lower_back"]', 1, 1, '["tempo", "pause_at_top"]', 'Bent-over barbell row', datetime('now'), datetime('now')),
  ('db_row_1arm', 'One-Arm Dumbbell Row', 'horizontal_pull', 'dumbbell', '["mid_back", "lats", "rear_shoulder"]', '["biceps", "forearms", "trunk"]', 0, 1, '["tempo", "pause_at_top"]', 'Unilateral supported row', datetime('now'), datetime('now')),
  ('chest_supported_row', 'Chest-Supported Row', 'horizontal_pull', 'dumbbell', '["mid_back", "rear_shoulder"]', '["biceps", "forearms"]', 1, 1, '["tempo", "pause_at_top"]', 'Lower-back-friendly row variant', datetime('now'), datetime('now')),
  ('inverted_row', 'Inverted Row', 'horizontal_pull', 'bodyweight', '["mid_back", "rear_shoulder"]', '["biceps", "forearms", "trunk"]', 1, 1, '["feet_elevated", "tempo", "pause_at_top", "single_arm"]', 'Bodyweight horizontal pull fallback', datetime('now'), datetime('now')),
  ('cable_row', 'Seated Cable Row', 'horizontal_pull', 'cable', '["mid_back", "rear_shoulder"]', '["biceps", "forearms"]', 1, 1, '["tempo", "pause_at_top"]', 'Machine-based row for joint recovery', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO exercise_joint_stress (exercise_id, joint_tag_id, stress_level) VALUES
  ('barbell_row', 'lower_back', 'high'),
  ('db_row_1arm', 'lower_back', 'low'),
  ('chest_supported_row', 'lower_back', 'low'),
  ('inverted_row', 'shoulder', 'low'),
  ('cable_row', 'lower_back', 'low');

INSERT OR IGNORE INTO exercise_cues (id, exercise_id, category_id, cue_text, is_critical, sort_order, created_date, updated_date) VALUES
  ('bb_row_cue1', 'barbell_row', 'spine_position', 'Keep natural lower-back arch; never round the spine', 1, 1, datetime('now'), datetime('now')),
  ('bb_row_cue2', 'barbell_row', 'force_direction', 'Pull elbows back and up toward your hips, not just hands to chest', 0, 2, datetime('now'), datetime('now')),
  ('bb_row_cue3', 'barbell_row', 'tempo_pauses', 'Squeeze shoulder blades together at the top for a one-count', 0, 3, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO exercise_cues (id, exercise_id, category_id, cue_text, is_critical, sort_order, created_date, updated_date) VALUES
  ('inv_row_cue1', 'inverted_row', 'bracing', 'Body rigid like a plank from heels to head', 0, 1, datetime('now'), datetime('now')),
  ('inv_row_cue2', 'inverted_row', 'force_direction', 'Pull chest to the bar, leading with elbows', 0, 2, datetime('now'), datetime('now')),
  ('inv_row_cue3', 'inverted_row', 'stop_rules', 'Stop when hips sag or you cannot reach full range', 1, 3, datetime('now'), datetime('now'));

-- ============================================================================
-- VERTICAL PULL EXERCISES
-- ============================================================================

INSERT OR IGNORE INTO exercises (id, name, pattern_id, equipment_id, primary_muscles, secondary_muscles, is_bilateral, is_compound, leverage_knobs, description, created_date, updated_date) VALUES
  ('pullup', 'Pull-Up', 'vertical_pull', 'bodyweight', '["lats", "biceps"]', '["mid_back", "forearms", "trunk"]', 1, 1, '["weighted", "tempo", "pause_at_top"]', 'Overhand pull-up', datetime('now'), datetime('now')),
  ('chinup', 'Chin-Up', 'vertical_pull', 'bodyweight', '["lats", "biceps"]', '["mid_back", "forearms"]', 1, 1, '["weighted", "tempo", "pause_at_top"]', 'Underhand pull-up, more bicep', datetime('now'), datetime('now')),
  ('lat_pulldown', 'Lat Pulldown', 'vertical_pull', 'cable', '["lats", "biceps"]', '["mid_back", "forearms"]', 1, 1, '["tempo", "pause_at_bottom"]', 'Assisted vertical pull for building to pull-ups', datetime('now'), datetime('now')),
  ('band_pulldown', 'Band Pulldown', 'vertical_pull', 'band', '["lats", "biceps"]', '["mid_back"]', 1, 1, '["tempo", "pause_at_bottom", "single_arm"]', 'Minimal-equipment vertical pull', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO exercise_joint_stress (exercise_id, joint_tag_id, stress_level) VALUES
  ('pullup', 'shoulder', 'moderate'),
  ('pullup', 'elbow', 'moderate'),
  ('chinup', 'shoulder', 'low'),
  ('chinup', 'elbow', 'moderate'),
  ('lat_pulldown', 'shoulder', 'low'),
  ('band_pulldown', 'shoulder', 'low');

INSERT OR IGNORE INTO exercise_cues (id, exercise_id, category_id, cue_text, is_critical, sort_order, created_date, updated_date) VALUES
  ('pullup_cue1', 'pullup', 'bracing', 'Engage abs and glutes; avoid excessive swinging', 0, 1, datetime('now'), datetime('now')),
  ('pullup_cue2', 'pullup', 'force_direction', 'Pull elbows down and back, think chest to bar', 0, 2, datetime('now'), datetime('now')),
  ('pullup_cue3', 'pullup', 'stop_rules', 'Stop when you cannot reach chin over bar with control', 1, 3, datetime('now'), datetime('now'));

-- ============================================================================
-- SQUAT EXERCISES
-- ============================================================================

INSERT OR IGNORE INTO exercises (id, name, pattern_id, equipment_id, primary_muscles, secondary_muscles, is_bilateral, is_compound, leverage_knobs, description, created_date, updated_date) VALUES
  ('back_squat', 'Back Squat', 'squat', 'barbell', '["quads", "glutes"]', '["hamstrings", "trunk", "lower_back"]', 1, 1, '["tempo", "pause_at_bottom"]', 'Barbell back squat', datetime('now'), datetime('now')),
  ('front_squat', 'Front Squat', 'squat', 'barbell', '["quads", "glutes"]', '["trunk", "upper_back"]', 1, 1, '["tempo", "pause_at_bottom"]', 'Front-loaded squat, more upright', datetime('now'), datetime('now')),
  ('goblet_squat', 'Goblet Squat', 'squat', 'dumbbell', '["quads", "glutes"]', '["trunk"]', 1, 1, '["tempo", "pause_at_bottom"]', 'Beginner-friendly squat with front load', datetime('now'), datetime('now')),
  ('split_squat', 'Split Squat', 'squat', 'dumbbell', '["quads", "glutes"]', '["trunk", "balance"]', 0, 1, '["tempo", "pause_at_bottom", "rear_foot_elevated"]', 'Unilateral squat pattern', datetime('now'), datetime('now')),
  ('bodyweight_squat', 'Bodyweight Squat', 'squat', 'bodyweight', '["quads", "glutes"]', '["trunk"]', 1, 1, '["tempo", "pause_at_bottom", "single_leg"]', 'Bodyweight squat fallback', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO exercise_joint_stress (exercise_id, joint_tag_id, stress_level) VALUES
  ('back_squat', 'knee', 'moderate'),
  ('back_squat', 'lower_back', 'moderate'),
  ('front_squat', 'knee', 'moderate'),
  ('front_squat', 'lower_back', 'low'),
  ('goblet_squat', 'knee', 'low'),
  ('split_squat', 'knee', 'low'),
  ('bodyweight_squat', 'knee', 'low');

INSERT OR IGNORE INTO exercise_cues (id, exercise_id, category_id, cue_text, is_critical, sort_order, created_date, updated_date) VALUES
  ('squat_cue1', 'back_squat', 'spine_position', 'Chest up, maintain natural lower-back arch throughout', 1, 1, datetime('now'), datetime('now')),
  ('squat_cue2', 'back_squat', 'joint_alignment', 'Knees track over toes, not caving inward', 0, 2, datetime('now'), datetime('now')),
  ('squat_cue3', 'back_squat', 'range_limits', 'Descend as deep as you can without tailbone tuck or lower-back rounding', 1, 3, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO exercise_cues (id, exercise_id, category_id, cue_text, is_critical, sort_order, created_date, updated_date) VALUES
  ('goblet_cue1', 'goblet_squat', 'bracing', 'Hold weight at chest, elbows pointing down', 0, 1, datetime('now'), datetime('now')),
  ('goblet_cue2', 'goblet_squat', 'range_limits', 'Squat until elbows touch inside of knees, or as deep as form allows', 1, 2, datetime('now'), datetime('now')),
  ('goblet_cue3', 'goblet_squat', 'force_direction', 'Drive through the full foot, not just the toes', 0, 3, datetime('now'), datetime('now'));

-- ============================================================================
-- HINGE EXERCISES
-- ============================================================================

INSERT OR IGNORE INTO exercises (id, name, pattern_id, equipment_id, primary_muscles, secondary_muscles, is_bilateral, is_compound, leverage_knobs, description, created_date, updated_date) VALUES
  ('deadlift', 'Deadlift', 'hinge', 'barbell', '["hamstrings", "glutes", "back"]', '["forearms", "trunk", "quads"]', 1, 1, '["tempo", "pause_at_top"]', 'Conventional deadlift', datetime('now'), datetime('now')),
  ('rdl', 'Romanian Deadlift', 'hinge', 'barbell', '["hamstrings", "glutes", "lower_back"]', '["forearms", "trunk"]', 1, 1, '["tempo", "pause_at_bottom"]', 'Hip-hinge emphasis deadlift', datetime('now'), datetime('now')),
  ('db_rdl', 'Dumbbell RDL', 'hinge', 'dumbbell', '["hamstrings", "glutes"]', '["lower_back", "trunk"]', 1, 1, '["tempo", "unilateral"]', 'Dumbbell Romanian deadlift', datetime('now'), datetime('now')),
  ('hip_thrust', 'Barbell Hip Thrust', 'hinge', 'barbell', '["glutes", "hamstrings"]', '["trunk"]', 1, 1, '["tempo", "pause_at_top", "single_leg"]', 'Glute-dominant hip extension', datetime('now'), datetime('now')),
  ('kb_swing', 'Kettlebell Swing', 'hinge', 'kettlebell', '["glutes", "hamstrings", "back"]', '["forearms", "shoulders"]', 1, 1, '["single_arm", "higher_reps"]', 'Explosive hip hinge', datetime('now'), datetime('now')),
  ('glute_bridge', 'Glute Bridge', 'hinge', 'bodyweight', '["glutes", "hamstrings"]', '["trunk"]', 1, 1, '["tempo", "pause_at_top", "single_leg"]', 'Bodyweight hinge fallback', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO exercise_joint_stress (exercise_id, joint_tag_id, stress_level) VALUES
  ('deadlift', 'lower_back', 'high'),
  ('rdl', 'lower_back', 'high'),
  ('db_rdl', 'lower_back', 'moderate'),
  ('hip_thrust', 'lower_back', 'low'),
  ('kb_swing', 'lower_back', 'moderate'),
  ('glute_bridge', 'lower_back', 'low');

INSERT OR IGNORE INTO exercise_cues (id, exercise_id, category_id, cue_text, is_critical, sort_order, created_date, updated_date) VALUES
  ('deadlift_cue1', 'deadlift', 'spine_position', 'Spine neutral from start to finish; never round the lower back', 1, 1, datetime('now'), datetime('now')),
  ('deadlift_cue2', 'deadlift', 'bracing', 'Deep breath and brace abs before every rep', 0, 2, datetime('now'), datetime('now')),
  ('deadlift_cue3', 'deadlift', 'force_direction', 'Drive the floor away with your feet; hips and shoulders rise together', 0, 3, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO exercise_cues (id, exercise_id, category_id, cue_text, is_critical, sort_order, created_date, updated_date) VALUES
  ('hip_thrust_cue1', 'hip_thrust', 'force_direction', 'Drive through heels and squeeze glutes hard at the top', 0, 1, datetime('now'), datetime('now')),
  ('hip_thrust_cue2', 'hip_thrust', 'range_limits', 'Stop at full hip extension; do not hyperextend the lower back', 1, 2, datetime('now'), datetime('now')),
  ('hip_thrust_cue3', 'hip_thrust', 'tempo_pauses', 'Hold the top position for a one-count squeeze', 0, 3, datetime('now'), datetime('now'));

-- ============================================================================
-- CARRY / CORE-BRACE EXERCISES
-- ============================================================================

INSERT OR IGNORE INTO exercises (id, name, pattern_id, equipment_id, primary_muscles, secondary_muscles, is_bilateral, is_compound, leverage_knobs, description, created_date, updated_date) VALUES
  ('farmer_carry', 'Farmer Carry', 'carry_brace', 'dumbbell', '["trunk", "grip", "forearms"]', '["shoulders", "glutes", "whole_body"]', 1, 1, '["single_arm", "longer_distance"]', 'Bilateral loaded carry', datetime('now'), datetime('now')),
  ('suitcase_carry', 'Suitcase Carry', 'carry_brace', 'dumbbell', '["trunk", "grip", "obliques"]', '["shoulders", "glutes"]', 0, 1, '["heavier_load", "longer_distance"]', 'Unilateral anti-lateral-flexion carry', datetime('now'), datetime('now')),
  ('plank', 'Plank', 'carry_brace', 'bodyweight', '["trunk", "abs"]', '["shoulders", "glutes"]', 1, 1, '["longer_duration", "feet_elevated", "single_arm"]', 'Bodyweight anti-extension hold', datetime('now'), datetime('now')),
  ('dead_bug', 'Dead Bug', 'carry_brace', 'bodyweight', '["trunk", "abs"]', '[]', 1, 1, '["tempo", "add_band"]', 'Anti-extension with limb movement', datetime('now'), datetime('now')),
  ('pallof_press', 'Pallof Press', 'carry_brace', 'band', '["trunk", "obliques"]', '["shoulders"]', 1, 1, '["tempo", "add_movement"]', 'Anti-rotation press', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO exercise_joint_stress (exercise_id, joint_tag_id, stress_level) VALUES
  ('farmer_carry', 'lower_back', 'low'),
  ('suitcase_carry', 'lower_back', 'low'),
  ('plank', 'lower_back', 'low'),
  ('plank', 'shoulder', 'low');

INSERT OR IGNORE INTO exercise_cues (id, exercise_id, category_id, cue_text, is_critical, sort_order, created_date, updated_date) VALUES
  ('farmer_cue1', 'farmer_carry', 'bracing', 'Shoulders packed, chest up, abs braced tight', 0, 1, datetime('now'), datetime('now')),
  ('farmer_cue2', 'farmer_carry', 'anti_movement', 'Walk with control; no leaning, twisting, or shoulder hiking', 0, 2, datetime('now'), datetime('now')),
  ('farmer_cue3', 'farmer_carry', 'stop_rules', 'Stop when you cannot maintain upright posture or grip fails', 1, 3, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO exercise_cues (id, exercise_id, category_id, cue_text, is_critical, sort_order, created_date, updated_date) VALUES
  ('plank_cue1', 'plank', 'spine_position', 'Body in a straight line from head to heels; do not let hips sag', 1, 1, datetime('now'), datetime('now')),
  ('plank_cue2', 'plank', 'bracing', 'Squeeze glutes and brace abs as if taking a punch', 0, 2, datetime('now'), datetime('now')),
  ('plank_cue3', 'plank', 'stop_rules', 'End the hold when hips drop or form breaks', 1, 3, datetime('now'), datetime('now'));

-- ============================================================================
-- EXERCISE SUBSTITUTIONS (joint-friendly and equipment swaps)
-- ============================================================================

-- Shoulder-friendly push substitutions
INSERT OR IGNORE INTO exercise_substitutions (id, base_exercise_id, sub_exercise_id, reason, constraint_type, explanation, created_date, updated_date) VALUES
  ('sub_bench_to_incline', 'bench_press_bb', 'incline_press_db', 'shoulder_friendly', 'joint_pain', 'Incline with neutral grip reduces shoulder stress', datetime('now'), datetime('now')),
  ('sub_ohp_to_landmine', 'ohp_bb', 'landmine_press', 'shoulder_friendly', 'joint_pain', 'Angled press path is gentler on the shoulder joint', datetime('now'), datetime('now')),
  ('sub_dip_to_pushup', 'dip', 'pushup', 'shoulder_friendly', 'joint_pain', 'Lower stress position for shoulder', datetime('now'), datetime('now'));

-- Lower-back-friendly pull substitutions
INSERT OR IGNORE INTO exercise_substitutions (id, base_exercise_id, sub_exercise_id, reason, constraint_type, explanation, created_date, updated_date) VALUES
  ('sub_bbrow_to_supported', 'barbell_row', 'chest_supported_row', 'lower_back_friendly', 'joint_pain', 'Chest support removes lower-back load', datetime('now'), datetime('now')),
  ('sub_bbrow_to_cable', 'barbell_row', 'cable_row', 'lower_back_friendly', 'joint_pain', 'Seated position protects lower back', datetime('now'), datetime('now'));

-- Equipment fallbacks (barbell → dumbbell → bodyweight)
INSERT OR IGNORE INTO exercise_substitutions (id, base_exercise_id, sub_exercise_id, reason, constraint_type, explanation, created_date, updated_date) VALUES
  ('sub_bench_bb_to_db', 'bench_press_bb', 'bench_press_db', 'missing_barbell', 'missing_equipment', 'Dumbbell alternative with similar pattern', datetime('now'), datetime('now')),
  ('sub_bench_db_to_bw', 'bench_press_db', 'pushup', 'missing_weights', 'missing_equipment', 'Bodyweight fallback for horizontal push', datetime('now'), datetime('now')),
  ('sub_squat_to_goblet', 'back_squat', 'goblet_squat', 'missing_barbell', 'missing_equipment', 'Front-loaded squat with dumbbells', datetime('now'), datetime('now')),
  ('sub_goblet_to_bw', 'goblet_squat', 'bodyweight_squat', 'missing_weights', 'missing_equipment', 'Bodyweight squat pattern', datetime('now'), datetime('now')),
  ('sub_pullup_to_band', 'pullup', 'band_pulldown', 'missing_bar', 'missing_equipment', 'Band-based vertical pull', datetime('now'), datetime('now'));

-- Load-too-light progressions (COACHING-REFERENCE.md §6)
INSERT OR IGNORE INTO exercise_substitutions (id, base_exercise_id, sub_exercise_id, reason, constraint_type, explanation, created_date, updated_date) VALUES
  ('sub_db_to_single', 'bench_press_db', 'bench_press_db', 'single_arm_progression', 'load_too_light', 'Work one arm at a time to increase difficulty', datetime('now'), datetime('now')),
  ('sub_pushup_elevated', 'pushup', 'pushup', 'feet_elevated', 'load_too_light', 'Elevate feet to shift more weight to upper body', datetime('now'), datetime('now'));
