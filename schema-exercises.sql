-- Exercise database schema for Apex Coach Training
-- Extends schema.sql with exercise library, patterns, warm-ups and templates
-- Based on PROGRAMMING-PRINCIPLES.md and COACHING-REFERENCE.md

-- ============================================================================
-- MOVEMENT PATTERNS & EXERCISE LIBRARY
-- ============================================================================

-- Movement patterns (the seven patterns from COACHING-REFERENCE.md §1)
CREATE TABLE IF NOT EXISTS movement_patterns (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL UNIQUE,
  description       TEXT,
  primary_muscles   TEXT NOT NULL,              -- JSON array of muscle groups
  created_date      TEXT NOT NULL,
  updated_date      TEXT NOT NULL
);

-- Equipment types for exercise selection and substitution
CREATE TABLE IF NOT EXISTS equipment_types (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,            -- e.g., 'barbell', 'dumbbell', 'bodyweight'
  priority     INTEGER DEFAULT 0,               -- for equipment progression (barbell→dumbbell→band→bodyweight)
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL
);

-- Joint stress tags for pain-based filtering (PROGRAMMING-PRINCIPLES.md §6)
CREATE TABLE IF NOT EXISTS joint_tags (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,            -- 'shoulder', 'elbow', 'wrist', 'knee', 'lower_back'
  description  TEXT,
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL
);

-- Main exercise catalog
-- Per COACHING-REFERENCE.md §1: pattern, equipment, muscles, joint-stress,
-- bilateral/unilateral, regression, progression, leverage knob
CREATE TABLE IF NOT EXISTS exercises (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  pattern_id        TEXT NOT NULL,              -- FK to movement_patterns
  equipment_id      TEXT NOT NULL,              -- FK to equipment_types
  primary_muscles   TEXT NOT NULL,              -- JSON array
  secondary_muscles TEXT DEFAULT '[]',          -- JSON array
  is_bilateral      INTEGER DEFAULT 1,          -- 1=bilateral, 0=unilateral
  is_compound       INTEGER DEFAULT 1,          -- 1=compound, 0=isolation
  regression_id     TEXT,                       -- FK to exercises (easier variant)
  progression_id    TEXT,                       -- FK to exercises (harder variant)
  leverage_knobs    TEXT DEFAULT '[]',          -- JSON array: ways to make harder without weight
  description       TEXT,
  demo_video_url    TEXT,
  created_date      TEXT NOT NULL,
  updated_date      TEXT NOT NULL,
  FOREIGN KEY (pattern_id) REFERENCES movement_patterns(id),
  FOREIGN KEY (equipment_id) REFERENCES equipment_types(id),
  FOREIGN KEY (regression_id) REFERENCES exercises(id),
  FOREIGN KEY (progression_id) REFERENCES exercises(id)
);

CREATE INDEX IF NOT EXISTS idx_exercises_pattern ON exercises(pattern_id);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment_id);
CREATE INDEX IF NOT EXISTS idx_exercises_compound ON exercises(is_compound);

-- Junction table: exercises to joint stress tags
CREATE TABLE IF NOT EXISTS exercise_joint_stress (
  exercise_id  TEXT NOT NULL,
  joint_tag_id TEXT NOT NULL,
  stress_level TEXT DEFAULT 'moderate',          -- 'low', 'moderate', 'high'
  PRIMARY KEY (exercise_id, joint_tag_id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id),
  FOREIGN KEY (joint_tag_id) REFERENCES joint_tags(id)
);

-- ============================================================================
-- CUEING SYSTEM (COACHING-REFERENCE.md §2)
-- ============================================================================

-- Cue categories (the eight buckets from COACHING-REFERENCE.md)
CREATE TABLE IF NOT EXISTS cue_categories (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  sort_order   INTEGER DEFAULT 0,
  description  TEXT,
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL
);

-- Individual cues for exercises (max 3 per exercise, one must be stop/ROM)
CREATE TABLE IF NOT EXISTS exercise_cues (
  id           TEXT PRIMARY KEY,
  exercise_id  TEXT NOT NULL,
  category_id  TEXT NOT NULL,
  cue_text     TEXT NOT NULL,
  is_critical  INTEGER DEFAULT 0,               -- 1 if this is the stop/ROM rule
  sort_order   INTEGER DEFAULT 0,
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id),
  FOREIGN KEY (category_id) REFERENCES cue_categories(id)
);

CREATE INDEX IF NOT EXISTS idx_cues_exercise ON exercise_cues(exercise_id);

-- ============================================================================
-- WARM-UP TIERS (COACHING-REFERENCE.md §3)
-- ============================================================================

-- Warm-up components (tiered by time available)
CREATE TABLE IF NOT EXISTS warmup_tiers (
  id           TEXT PRIMARY KEY,
  tier_name    TEXT NOT NULL,                   -- 'practical', 'practical_plus', 'full'
  min_minutes  INTEGER NOT NULL,                -- minimum session time for this tier
  description  TEXT,
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL
);

-- Individual warm-up activities
CREATE TABLE IF NOT EXISTS warmup_activities (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  activity_type   TEXT NOT NULL,               -- 'cardio', 'mobility', 'dynamic', 'soft_tissue', 'static'
  target_area     TEXT,                        -- 'hips', 'upper_back', 'shoulders', 'whole_body'
  duration_sec    INTEGER,                     -- suggested duration
  description     TEXT,
  demo_video_url  TEXT,
  created_date    TEXT NOT NULL,
  updated_date    TEXT NOT NULL
);

-- Junction: which activities belong to which tier
CREATE TABLE IF NOT EXISTS warmup_tier_activities (
  tier_id      TEXT NOT NULL,
  activity_id  TEXT NOT NULL,
  is_required  INTEGER DEFAULT 0,              -- 1=mandatory, 0=optional
  sort_order   INTEGER DEFAULT 0,
  PRIMARY KEY (tier_id, activity_id),
  FOREIGN KEY (tier_id) REFERENCES warmup_tiers(id),
  FOREIGN KEY (activity_id) REFERENCES warmup_activities(id)
);

-- ============================================================================
-- PROGRAM TEMPLATES (COACHING-REFERENCE.md §4)
-- ============================================================================

-- Training goals and their parameter defaults (COACHING-REFERENCE.md §5)
CREATE TABLE IF NOT EXISTS training_goals (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL UNIQUE,       -- 'strength', 'hypertrophy', 'fat_loss', 'conditioning', 'power'
  rep_range_min     INTEGER,
  rep_range_max     INTEGER,
  rest_sec_min      INTEGER,
  rest_sec_max      INTEGER,
  pairing_mode      TEXT,                       -- 'straight', 'superset', 'circuit'
  progression_mech  TEXT,                       -- 'load_step', 'total_rep', 'rest_compression', 'density', 'volume_ramp'
  description       TEXT,
  created_date      TEXT NOT NULL,
  updated_date      TEXT NOT NULL
);

-- Program templates (ready-to-ship structures)
CREATE TABLE IF NOT EXISTS program_templates (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  goal_id           TEXT,                       -- FK to training_goals
  experience_level  TEXT NOT NULL,              -- 'beginner', 'intermediate', 'advanced'
  days_per_week     INTEGER NOT NULL,
  split_type        TEXT NOT NULL,              -- 'full_body', 'upper_lower', 'ppl', 'circuit'
  block_weeks       INTEGER DEFAULT 6,          -- time-box duration
  description       TEXT,
  created_date      TEXT NOT NULL,
  updated_date      TEXT NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES training_goals(id)
);

-- Template sessions (days within a template)
CREATE TABLE IF NOT EXISTS template_sessions (
  id               TEXT PRIMARY KEY,
  template_id      TEXT NOT NULL,
  day_number       INTEGER NOT NULL,            -- 1=Mon, 2=Tue, etc. or just sequence
  session_name     TEXT,                        -- 'heavy', 'moderate', 'high_rep' or 'upper', 'lower'
  rep_feel         TEXT,                        -- 'heavy (5s)', 'moderate (8-10s)', etc.
  notes            TEXT,
  created_date     TEXT NOT NULL,
  updated_date     TEXT NOT NULL,
  FOREIGN KEY (template_id) REFERENCES program_templates(id)
);

-- Session exercises (which patterns/exercises go into each session)
CREATE TABLE IF NOT EXISTS session_exercises (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL,
  pattern_id       TEXT,                        -- FK to movement_patterns (pattern-based selection)
  exercise_id      TEXT,                        -- FK to exercises (specific exercise, optional)
  sets             INTEGER DEFAULT 3,
  reps_min         INTEGER,
  reps_max         INTEGER,
  rest_sec         INTEGER,
  sort_order       INTEGER DEFAULT 0,
  notes            TEXT,
  created_date     TEXT NOT NULL,
  updated_date     TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES template_sessions(id),
  FOREIGN KEY (pattern_id) REFERENCES movement_patterns(id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

CREATE INDEX IF NOT EXISTS idx_session_ex_session ON session_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_session_ex_pattern ON session_exercises(pattern_id);

-- ============================================================================
-- PROGRESSION MECHANISMS (PROGRAMMING-PRINCIPLES.md §4)
-- ============================================================================

-- Progression mechanism definitions (the six mechanisms from the table)
CREATE TABLE IF NOT EXISTS progression_mechanisms (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,         -- 'load_step', 'total_rep', 'rest_compression', etc.
  tracks          TEXT NOT NULL,                -- what metric this mechanism tracks
  advance_when    TEXT NOT NULL,                -- condition to progress
  reset_when      TEXT NOT NULL,                -- condition to back off
  headline_metric TEXT NOT NULL,                -- what the user sees as the main number
  description     TEXT,
  created_date    TEXT NOT NULL,
  updated_date    TEXT NOT NULL
);

-- ============================================================================
-- SUBSTITUTION RULES (PROGRAMMING-PRINCIPLES.md §6)
-- ============================================================================

-- Exercise substitutions for constraints (joint pain, missing equipment)
CREATE TABLE IF NOT EXISTS exercise_substitutions (
  id               TEXT PRIMARY KEY,
  base_exercise_id TEXT NOT NULL,
  sub_exercise_id  TEXT NOT NULL,
  reason           TEXT NOT NULL,               -- 'shoulder_friendly', 'elbow_friendly', 'bodyweight_fallback', etc.
  constraint_type  TEXT NOT NULL,               -- 'joint_pain', 'missing_equipment', 'load_too_light'
  explanation      TEXT,                        -- one-line reason to show user
  created_date     TEXT NOT NULL,
  updated_date     TEXT NOT NULL,
  FOREIGN KEY (base_exercise_id) REFERENCES exercises(id),
  FOREIGN KEY (sub_exercise_id) REFERENCES exercises(id)
);

CREATE INDEX IF NOT EXISTS idx_substitutions_base ON exercise_substitutions(base_exercise_id);
CREATE INDEX IF NOT EXISTS idx_substitutions_constraint ON exercise_substitutions(constraint_type);

-- ============================================================================
-- REFERENCE DATA INSERTS
-- ============================================================================

-- Insert the seven movement patterns (COACHING-REFERENCE.md §1)
INSERT OR IGNORE INTO movement_patterns (id, name, description, primary_muscles, created_date, updated_date) VALUES
  ('horizontal_push', 'Horizontal Push', 'Pressing movements away from the body horizontally', '["chest", "front_shoulder", "triceps"]', datetime('now'), datetime('now')),
  ('vertical_push', 'Vertical Push', 'Pressing movements overhead', '["shoulders", "triceps", "upper_chest"]', datetime('now'), datetime('now')),
  ('horizontal_pull', 'Horizontal Pull', 'Pulling movements toward the body horizontally', '["mid_back", "rear_shoulder", "biceps"]', datetime('now'), datetime('now')),
  ('vertical_pull', 'Vertical Pull', 'Pulling movements downward from overhead', '["lats", "biceps", "forearms"]', datetime('now'), datetime('now')),
  ('squat', 'Squat', 'Knee-dominant lower body movements', '["quads", "glutes", "trunk"]', datetime('now'), datetime('now')),
  ('hinge', 'Hinge', 'Hip-dominant lower body movements', '["hamstrings", "glutes", "back"]', datetime('now'), datetime('now')),
  ('carry_brace', 'Carry / Core-Brace', 'Anti-movement and loaded carries', '["trunk", "grip", "whole_body"]', datetime('now'), datetime('now'));

-- Insert equipment types with progression priority (barbell→dumbbell→band→bodyweight)
INSERT OR IGNORE INTO equipment_types (id, name, priority, created_date, updated_date) VALUES
  ('barbell', 'Barbell', 1, datetime('now'), datetime('now')),
  ('dumbbell', 'Dumbbell', 2, datetime('now'), datetime('now')),
  ('single_dumbbell', 'Single Dumbbell', 3, datetime('now'), datetime('now')),
  ('kettlebell', 'Kettlebell', 4, datetime('now'), datetime('now')),
  ('band', 'Resistance Band', 5, datetime('now'), datetime('now')),
  ('suspension', 'Suspension Trainer', 6, datetime('now'), datetime('now')),
  ('bodyweight', 'Bodyweight', 7, datetime('now'), datetime('now')),
  ('machine', 'Machine', 8, datetime('now'), datetime('now')),
  ('cable', 'Cable', 9, datetime('now'), datetime('now'));

-- Insert joint stress tags (PROGRAMMING-PRINCIPLES.md §6)
INSERT OR IGNORE INTO joint_tags (id, name, description, created_date, updated_date) VALUES
  ('shoulder', 'Shoulder', 'Stress on shoulder joint', datetime('now'), datetime('now')),
  ('elbow', 'Elbow', 'Stress on elbow joint', datetime('now'), datetime('now')),
  ('wrist', 'Wrist', 'Stress on wrist joint', datetime('now'), datetime('now')),
  ('knee', 'Knee', 'Stress on knee joint', datetime('now'), datetime('now')),
  ('lower_back', 'Lower Back', 'Stress on lower back/spine', datetime('now'), datetime('now'));

-- Insert cue categories (COACHING-REFERENCE.md §2 - the eight buckets)
INSERT OR IGNORE INTO cue_categories (id, name, sort_order, description, created_date, updated_date) VALUES
  ('spine_position', 'Spine Position', 1, 'Maintaining natural spinal curves', datetime('now'), datetime('now')),
  ('bracing', 'Bracing', 2, 'Core and whole-body tension', datetime('now'), datetime('now')),
  ('joint_alignment', 'Joint Alignment', 3, 'Proper joint stacking and tracking', datetime('now'), datetime('now')),
  ('anti_movement', 'Anti-Movement', 4, 'Resisting unwanted rotation or sway', datetime('now'), datetime('now')),
  ('range_limits', 'Range Limits', 5, 'Conditional depth and ROM', datetime('now'), datetime('now')),
  ('tempo_pauses', 'Tempo & Pauses', 6, 'Movement speed and holds', datetime('now'), datetime('now')),
  ('force_direction', 'Force Direction', 7, 'Where to apply force', datetime('now'), datetime('now')),
  ('stop_rules', 'Stop Rules', 8, 'When to end the set', datetime('now'), datetime('now'));

-- Insert warm-up tiers (COACHING-REFERENCE.md §3)
INSERT OR IGNORE INTO warmup_tiers (id, tier_name, min_minutes, description, created_date, updated_date) VALUES
  ('practical', 'Practical', 0, 'Under 45 min: quick cardio + mobility drills', datetime('now'), datetime('now')),
  ('practical_plus', 'Practical Plus', 45, '45-60 min: practical + dynamic sequence', datetime('now'), datetime('now')),
  ('full', 'Full', 60, 'Over 60 min or injury flag: soft-tissue, pulse-raising, dynamic, static holds', datetime('now'), datetime('now'));

-- Insert training goals with parameters (COACHING-REFERENCE.md §5)
INSERT OR IGNORE INTO training_goals (id, name, rep_range_min, rep_range_max, rest_sec_min, rest_sec_max, pairing_mode, progression_mech, description, created_date, updated_date) VALUES
  ('strength', 'Strength', 3, 5, 120, 240, 'straight', 'load_step', 'Build maximum force production', datetime('now'), datetime('now')),
  ('hypertrophy', 'Hypertrophy', 8, 15, 60, 90, 'straight', 'total_rep', 'Maximize muscle growth', datetime('now'), datetime('now')),
  ('fat_loss', 'Fat Loss / Recomp', 8, 15, 30, 60, 'circuit', 'rest_compression', 'Maximize calorie burn and metabolic effect', datetime('now'), datetime('now')),
  ('conditioning', 'Conditioning', 10, 20, 30, 60, 'circuit', 'density', 'Improve work capacity and endurance', datetime('now'), datetime('now')),
  ('power', 'Power', 1, 3, 120, 300, 'straight', 'load_step', 'Develop explosive strength (intermediate+)', datetime('now'), datetime('now'));

-- Insert progression mechanisms (PROGRAMMING-PRINCIPLES.md §4 table)
INSERT OR IGNORE INTO progression_mechanisms (id, name, tracks, advance_when, reset_when, headline_metric, description, created_date, updated_date) VALUES
  ('load_step', 'Load Step', 'Top-set weight', 'Target reps hit at prescribed rest', 'Two consecutive misses → drop 5-10%', 'Bar weight', 'Classic progressive overload', datetime('now'), datetime('now')),
  ('total_rep', 'Total-Rep Target', 'Reps accumulated at fixed load', 'Total reached under set cap', 'Cap hit → raise load, drop target', 'Total reps completed', 'Fixed weight, climbing reps', datetime('now'), datetime('now')),
  ('rest_compression', 'Rest Compression', 'Seconds between sets', 'Every ~2 weeks, cut a slice', 'Rest reaches floor → raise load, restore rest', 'Rest interval', 'Same work, less time', datetime('now'), datetime('now')),
  ('volume_ramp', 'Volume Ramp', 'Sets per exercise', 'Add a set every 1-2 weeks', 'Block ends at ~6 weeks', 'Total sets', 'Accumulating volume', datetime('now'), datetime('now')),
  ('density', 'Density', 'Total reps in fixed window', 'More work than last time, same window', 'Change the exercise pair', 'Reps in time block', 'Work capacity', datetime('now'), datetime('now')),
  ('scheme_rotation', 'Scheme Rotation', 'Which set×rep combination', 'Cycle combinations with similar rep total', 'Full cycle done → add load', 'Rotation phase', 'Varied stimulus', datetime('now'), datetime('now'));
