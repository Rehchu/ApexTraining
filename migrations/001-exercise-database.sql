-- Migration 001: Exercise Database Structure
-- Creates tables and seeds initial data for exercise library, patterns, warm-ups, and templates
-- Run this migration to set up the complete coaching database per PROGRAMMING-PRINCIPLES.md and COACHING-REFERENCE.md

-- This migration is idempotent (safe to run multiple times) due to IF NOT EXISTS and INSERT OR IGNORE

BEGIN TRANSACTION;

-- ============================================================================
-- STEP 1: Create all tables (schema-exercises.sql)
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
  name         TEXT NOT NULL UNIQUE,
  priority     INTEGER DEFAULT 0,               -- for equipment progression (barbell→dumbbell→band→bodyweight)
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL
);

-- Joint stress tags for pain-based filtering
CREATE TABLE IF NOT EXISTS joint_tags (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  description  TEXT,
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL
);

-- Main exercise catalog
CREATE TABLE IF NOT EXISTS exercises (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  pattern_id        TEXT NOT NULL,
  equipment_id      TEXT NOT NULL,
  primary_muscles   TEXT NOT NULL,              -- JSON array
  secondary_muscles TEXT DEFAULT '[]',
  is_bilateral      INTEGER DEFAULT 1,
  is_compound       INTEGER DEFAULT 1,
  regression_id     TEXT,
  progression_id    TEXT,
  leverage_knobs    TEXT DEFAULT '[]',          -- JSON array
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
  stress_level TEXT DEFAULT 'moderate',
  PRIMARY KEY (exercise_id, joint_tag_id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id),
  FOREIGN KEY (joint_tag_id) REFERENCES joint_tags(id)
);

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

-- Warm-up components (tiered by time available)
CREATE TABLE IF NOT EXISTS warmup_tiers (
  id           TEXT PRIMARY KEY,
  tier_name    TEXT NOT NULL,
  min_minutes  INTEGER NOT NULL,
  description  TEXT,
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL
);

-- Individual warm-up activities
CREATE TABLE IF NOT EXISTS warmup_activities (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  activity_type   TEXT NOT NULL,
  target_area     TEXT,
  duration_sec    INTEGER,
  description     TEXT,
  demo_video_url  TEXT,
  created_date    TEXT NOT NULL,
  updated_date    TEXT NOT NULL
);

-- Junction: which activities belong to which tier
CREATE TABLE IF NOT EXISTS warmup_tier_activities (
  tier_id      TEXT NOT NULL,
  activity_id  TEXT NOT NULL,
  is_required  INTEGER DEFAULT 0,
  sort_order   INTEGER DEFAULT 0,
  PRIMARY KEY (tier_id, activity_id),
  FOREIGN KEY (tier_id) REFERENCES warmup_tiers(id),
  FOREIGN KEY (activity_id) REFERENCES warmup_activities(id)
);

-- Training goals and their parameter defaults
CREATE TABLE IF NOT EXISTS training_goals (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL UNIQUE,
  rep_range_min     INTEGER,
  rep_range_max     INTEGER,
  rest_sec_min      INTEGER,
  rest_sec_max      INTEGER,
  pairing_mode      TEXT,
  progression_mech  TEXT,
  description       TEXT,
  created_date      TEXT NOT NULL,
  updated_date      TEXT NOT NULL
);

-- Program templates (ready-to-ship structures)
CREATE TABLE IF NOT EXISTS program_templates (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  goal_id           TEXT,
  experience_level  TEXT NOT NULL,
  days_per_week     INTEGER NOT NULL,
  split_type        TEXT NOT NULL,
  block_weeks       INTEGER DEFAULT 6,
  description       TEXT,
  created_date      TEXT NOT NULL,
  updated_date      TEXT NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES training_goals(id)
);

-- Template sessions (days within a template)
CREATE TABLE IF NOT EXISTS template_sessions (
  id               TEXT PRIMARY KEY,
  template_id      TEXT NOT NULL,
  day_number       INTEGER NOT NULL,
  session_name     TEXT,
  rep_feel         TEXT,
  notes            TEXT,
  created_date     TEXT NOT NULL,
  updated_date     TEXT NOT NULL,
  FOREIGN KEY (template_id) REFERENCES program_templates(id)
);

-- Session exercises (which patterns/exercises go into each session)
CREATE TABLE IF NOT EXISTS session_exercises (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL,
  pattern_id       TEXT,
  exercise_id      TEXT,
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

-- Progression mechanism definitions
CREATE TABLE IF NOT EXISTS progression_mechanisms (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  tracks          TEXT NOT NULL,
  advance_when    TEXT NOT NULL,
  reset_when      TEXT NOT NULL,
  headline_metric TEXT NOT NULL,
  description     TEXT,
  created_date    TEXT NOT NULL,
  updated_date    TEXT NOT NULL
);

-- Exercise substitutions for constraints
CREATE TABLE IF NOT EXISTS exercise_substitutions (
  id               TEXT PRIMARY KEY,
  base_exercise_id TEXT NOT NULL,
  sub_exercise_id  TEXT NOT NULL,
  reason           TEXT NOT NULL,
  constraint_type  TEXT NOT NULL,
  explanation      TEXT,
  created_date     TEXT NOT NULL,
  updated_date     TEXT NOT NULL,
  FOREIGN KEY (base_exercise_id) REFERENCES exercises(id),
  FOREIGN KEY (sub_exercise_id) REFERENCES exercises(id)
);

CREATE INDEX IF NOT EXISTS idx_substitutions_base ON exercise_substitutions(base_exercise_id);
CREATE INDEX IF NOT EXISTS idx_substitutions_constraint ON exercise_substitutions(constraint_type);

-- ============================================================================
-- STEP 2: Seed reference data (movement patterns, equipment, joints, cues, goals, mechanisms)
-- ============================================================================

-- Movement patterns
INSERT OR IGNORE INTO movement_patterns (id, name, description, primary_muscles, created_date, updated_date) VALUES
  ('horizontal_push', 'Horizontal Push', 'Pressing movements away from the body horizontally', '["chest", "front_shoulder", "triceps"]', datetime('now'), datetime('now')),
  ('vertical_push', 'Vertical Push', 'Pressing movements overhead', '["shoulders", "triceps", "upper_chest"]', datetime('now'), datetime('now')),
  ('horizontal_pull', 'Horizontal Pull', 'Pulling movements toward the body horizontally', '["mid_back", "rear_shoulder", "biceps"]', datetime('now'), datetime('now')),
  ('vertical_pull', 'Vertical Pull', 'Pulling movements downward from overhead', '["lats", "biceps", "forearms"]', datetime('now'), datetime('now')),
  ('squat', 'Squat', 'Knee-dominant lower body movements', '["quads", "glutes", "trunk"]', datetime('now'), datetime('now')),
  ('hinge', 'Hinge', 'Hip-dominant lower body movements', '["hamstrings", "glutes", "back"]', datetime('now'), datetime('now')),
  ('carry_brace', 'Carry / Core-Brace', 'Anti-movement and loaded carries', '["trunk", "grip", "whole_body"]', datetime('now'), datetime('now'));

-- Equipment types
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

-- Joint tags
INSERT OR IGNORE INTO joint_tags (id, name, description, created_date, updated_date) VALUES
  ('shoulder', 'Shoulder', 'Stress on shoulder joint', datetime('now'), datetime('now')),
  ('elbow', 'Elbow', 'Stress on elbow joint', datetime('now'), datetime('now')),
  ('wrist', 'Wrist', 'Stress on wrist joint', datetime('now'), datetime('now')),
  ('knee', 'Knee', 'Stress on knee joint', datetime('now'), datetime('now')),
  ('lower_back', 'Lower Back', 'Stress on lower back/spine', datetime('now'), datetime('now'));

-- Cue categories
INSERT OR IGNORE INTO cue_categories (id, name, sort_order, description, created_date, updated_date) VALUES
  ('spine_position', 'Spine Position', 1, 'Maintaining natural spinal curves', datetime('now'), datetime('now')),
  ('bracing', 'Bracing', 2, 'Core and whole-body tension', datetime('now'), datetime('now')),
  ('joint_alignment', 'Joint Alignment', 3, 'Proper joint stacking and tracking', datetime('now'), datetime('now')),
  ('anti_movement', 'Anti-Movement', 4, 'Resisting unwanted rotation or sway', datetime('now'), datetime('now')),
  ('range_limits', 'Range Limits', 5, 'Conditional depth and ROM', datetime('now'), datetime('now')),
  ('tempo_pauses', 'Tempo & Pauses', 6, 'Movement speed and holds', datetime('now'), datetime('now')),
  ('force_direction', 'Force Direction', 7, 'Where to apply force', datetime('now'), datetime('now')),
  ('stop_rules', 'Stop Rules', 8, 'When to end the set', datetime('now'), datetime('now'));

-- Warm-up tiers
INSERT OR IGNORE INTO warmup_tiers (id, tier_name, min_minutes, description, created_date, updated_date) VALUES
  ('practical', 'Practical', 0, 'Under 45 min: quick cardio + mobility drills', datetime('now'), datetime('now')),
  ('practical_plus', 'Practical Plus', 45, '45-60 min: practical + dynamic sequence', datetime('now'), datetime('now')),
  ('full', 'Full', 60, 'Over 60 min or injury flag: soft-tissue, pulse-raising, dynamic, static holds', datetime('now'), datetime('now'));

-- Training goals
INSERT OR IGNORE INTO training_goals (id, name, rep_range_min, rep_range_max, rest_sec_min, rest_sec_max, pairing_mode, progression_mech, description, created_date, updated_date) VALUES
  ('strength', 'Strength', 3, 5, 120, 240, 'straight', 'load_step', 'Build maximum force production', datetime('now'), datetime('now')),
  ('hypertrophy', 'Hypertrophy', 8, 15, 60, 90, 'straight', 'total_rep', 'Maximize muscle growth', datetime('now'), datetime('now')),
  ('fat_loss', 'Fat Loss / Recomp', 8, 15, 30, 60, 'circuit', 'rest_compression', 'Maximize calorie burn and metabolic effect', datetime('now'), datetime('now')),
  ('conditioning', 'Conditioning', 10, 20, 30, 60, 'circuit', 'density', 'Improve work capacity and endurance', datetime('now'), datetime('now')),
  ('power', 'Power', 1, 3, 120, 300, 'straight', 'load_step', 'Develop explosive strength (intermediate+)', datetime('now'), datetime('now'));

-- Progression mechanisms
INSERT OR IGNORE INTO progression_mechanisms (id, name, tracks, advance_when, reset_when, headline_metric, description, created_date, updated_date) VALUES
  ('load_step', 'Load Step', 'Top-set weight', 'Target reps hit at prescribed rest', 'Two consecutive misses → drop 5-10%', 'Bar weight', 'Classic progressive overload', datetime('now'), datetime('now')),
  ('total_rep', 'Total-Rep Target', 'Reps accumulated at fixed load', 'Total reached under set cap', 'Cap hit → raise load, drop target', 'Total reps completed', 'Fixed weight, climbing reps', datetime('now'), datetime('now')),
  ('rest_compression', 'Rest Compression', 'Seconds between sets', 'Every ~2 weeks, cut a slice', 'Rest reaches floor → raise load, restore rest', 'Rest interval', 'Same work, less time', datetime('now'), datetime('now')),
  ('volume_ramp', 'Volume Ramp', 'Sets per exercise', 'Add a set every 1-2 weeks', 'Block ends at ~6 weeks', 'Total sets', 'Accumulating volume', datetime('now'), datetime('now')),
  ('density', 'Density', 'Total reps in fixed window', 'More work than last time, same window', 'Change the exercise pair', 'Reps in time block', 'Work capacity', datetime('now'), datetime('now')),
  ('scheme_rotation', 'Scheme Rotation', 'Which set×rep combination', 'Cycle combinations with similar rep total', 'Full cycle done → add load', 'Rotation phase', 'Varied stimulus', datetime('now'), datetime('now'));

COMMIT;

-- Note: Exercise seed data, warm-up activities, and program templates should be loaded
-- separately using seed-exercises.sql and seed-warmups-templates.sql
-- This keeps the migration focused on structure and core reference data
