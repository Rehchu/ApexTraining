#!/usr/bin/env node
// Seed script that populates the normalized exercise database schema
// from COACHING-REFERENCE.md and PROGRAMMING-PRINCIPLES.md
//
// This script generates SQL INSERT statements matching the schema in
// schema-exercises.sql, organizing exercises by movement pattern with
// proper fields for selection, substitution, and progression.
//
// Usage:
//   node scripts/seed-from-reference.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const nowISO = () => new Date().toISOString();

console.log(`\n🏋️  Apex Coach Training — Seeding from COACHING-REFERENCE.md\n`);

// ============================================================================
// EXERCISE CATALOG by Movement Pattern
// Structured per COACHING-REFERENCE.md §1
// ============================================================================

const EXERCISES_BY_PATTERN = {
  horizontal_push: [
    {
      id: 'bench_press_bb',
      name: 'Barbell Bench Press',
      equipment: 'barbell',
      primary_muscles: ['chest', 'front_shoulder', 'triceps'],
      secondary_muscles: ['trunk'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'shoulder', level: 'moderate' },
        { tag: 'elbow', level: 'moderate' }
      ],
      leverage_knobs: ['tempo', 'pause_at_bottom', 'feet_elevated'],
      regression_id: 'pushup',
      progression_id: null,
      description: 'Classic barbell bench press',
      cues: [
        { category: 'joint_alignment', text: 'Elbows tucked about 45 degrees, not flared straight out', is_critical: false },
        { category: 'bracing', text: 'Squeeze shoulder blades together and keep them pinned to the bench', is_critical: false },
        { category: 'stop_rules', text: 'Leave 1-2 reps in the tank; stop when form breaks', is_critical: true }
      ]
    },
    {
      id: 'bench_press_db',
      name: 'Dumbbell Bench Press',
      equipment: 'dumbbell',
      primary_muscles: ['chest', 'front_shoulder', 'triceps'],
      secondary_muscles: ['trunk'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'shoulder', level: 'low' },
        { tag: 'elbow', level: 'low' }
      ],
      leverage_knobs: ['tempo', 'unilateral', 'pause_at_bottom'],
      regression_id: 'pushup',
      progression_id: 'bench_press_bb',
      description: 'Dumbbell bench press with greater ROM',
      cues: [
        { category: 'joint_alignment', text: 'Elbows tucked, forearms vertical at the bottom', is_critical: false },
        { category: 'tempo_pauses', text: 'Squeeze the chest for one second at the top', is_critical: false },
        { category: 'range_limits', text: 'Lower only as deep as you can without the shoulders rolling forward', is_critical: true }
      ]
    },
    {
      id: 'incline_press_db',
      name: 'Incline Dumbbell Press',
      equipment: 'dumbbell',
      primary_muscles: ['upper_chest', 'front_shoulder', 'triceps'],
      secondary_muscles: ['trunk'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'shoulder', level: 'low' }
      ],
      leverage_knobs: ['tempo', 'unilateral'],
      regression_id: 'pushup',
      progression_id: 'bench_press_db',
      description: 'Joint-friendly incline variant',
      cues: [
        { category: 'spine_position', text: 'Set a slight incline and keep the ribs down', is_critical: false },
        { category: 'force_direction', text: 'Press up and slightly back over the collarbones', is_critical: false },
        { category: 'range_limits', text: 'Stop lowering the moment the front of the shoulder complains', is_critical: true }
      ]
    },
    {
      id: 'pushup',
      name: 'Push-Up',
      equipment: 'bodyweight',
      primary_muscles: ['chest', 'front_shoulder', 'triceps'],
      secondary_muscles: ['trunk', 'glutes'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'shoulder', level: 'low' },
        { tag: 'wrist', level: 'moderate' }
      ],
      leverage_knobs: ['feet_elevated', 'tempo', 'pause_at_bottom', 'single_arm'],
      regression_id: null,
      progression_id: 'bench_press_db',
      description: 'Bodyweight pressing fallback',
      cues: [
        { category: 'bracing', text: 'Abs tight, glutes squeezed, body in a straight line', is_critical: false },
        { category: 'range_limits', text: 'Lower as far as you can without shoulders rounding forward', is_critical: true },
        { category: 'tempo_pauses', text: 'Control the descent over 2 seconds', is_critical: false }
      ]
    },
    {
      id: 'dip',
      name: 'Dip',
      equipment: 'bodyweight',
      primary_muscles: ['chest', 'front_shoulder', 'triceps'],
      secondary_muscles: ['trunk'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'shoulder', level: 'high' },
        { tag: 'elbow', level: 'moderate' }
      ],
      leverage_knobs: ['tempo', 'weighted', 'pause_at_bottom'],
      regression_id: 'pushup',
      progression_id: null,
      description: 'Advanced bodyweight press',
      cues: [
        { category: 'bracing', text: 'Keep the shoulders down away from the ears', is_critical: false },
        { category: 'spine_position', text: 'Brace the abs and stay tall through the trunk', is_critical: false },
        { category: 'range_limits', text: 'Descend only until the upper arms reach parallel — no deeper', is_critical: true }
      ]
    }
  ],

  vertical_push: [
    {
      id: 'ohp_bb',
      name: 'Barbell Overhead Press',
      equipment: 'barbell',
      primary_muscles: ['shoulders', 'triceps', 'upper_chest'],
      secondary_muscles: ['trunk'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'shoulder', level: 'high' }
      ],
      leverage_knobs: ['tempo', 'pause_at_bottom'],
      regression_id: 'pike_pushup',
      progression_id: null,
      description: 'Standing overhead press',
      cues: [
        { category: 'bracing', text: 'Abs braced hard, glutes squeezed to protect lower back', is_critical: false },
        { category: 'force_direction', text: 'Press the bar up and slightly back so it finishes over your mid-foot', is_critical: false },
        { category: 'stop_rules', text: 'Stop when you cannot complete a rep without leaning back excessively', is_critical: true }
      ]
    },
    {
      id: 'ohp_db',
      name: 'Dumbbell Overhead Press',
      equipment: 'dumbbell',
      primary_muscles: ['shoulders', 'triceps'],
      secondary_muscles: ['trunk'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'shoulder', level: 'moderate' }
      ],
      leverage_knobs: ['tempo', 'unilateral', 'seated'],
      regression_id: 'pike_pushup',
      progression_id: 'ohp_bb',
      description: 'Dumbbell shoulder press',
      cues: [
        { category: 'spine_position', text: 'Sit tall with the lower back supported and ribs down', is_critical: false },
        { category: 'force_direction', text: 'Press up and slightly in without banging the dumbbells', is_critical: false },
        { category: 'range_limits', text: 'Lower only to ear height, then stop if the shoulder pinches', is_critical: true }
      ]
    },
    {
      id: 'landmine_press',
      name: 'Landmine Press',
      equipment: 'barbell',
      primary_muscles: ['front_shoulder', 'triceps', 'upper_chest'],
      secondary_muscles: ['trunk'],
      is_bilateral: false,
      is_compound: true,
      joint_tags: [
        { tag: 'shoulder', level: 'low' }
      ],
      leverage_knobs: ['unilateral', 'tempo'],
      regression_id: 'pike_pushup',
      progression_id: 'ohp_db',
      description: 'Joint-friendly angled press',
      cues: [
        { category: 'bracing', text: 'Brace the abs so the low back does not arch', is_critical: false },
        { category: 'force_direction', text: 'Press the bar up along its arc and reach tall', is_critical: false },
        { category: 'anti_movement', text: 'Keep the shoulders square — stop if either side starts to twist', is_critical: true }
      ]
    },
    {
      id: 'pike_pushup',
      name: 'Pike Push-Up',
      equipment: 'bodyweight',
      primary_muscles: ['shoulders', 'triceps'],
      secondary_muscles: ['upper_chest'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'shoulder', level: 'moderate' },
        { tag: 'wrist', level: 'moderate' }
      ],
      leverage_knobs: ['feet_elevated', 'tempo', 'hands_elevated'],
      regression_id: null,
      progression_id: 'ohp_db',
      description: 'Bodyweight overhead press fallback',
      cues: [
        { category: 'spine_position', text: 'Hips high, body in an inverted V', is_critical: false },
        { category: 'tempo_pauses', text: 'Lower the crown of the head toward the floor under control', is_critical: false },
        { category: 'stop_rules', text: 'Stop before the neck or shoulders take the load — end the set there', is_critical: true }
      ]
    }
  ],

  horizontal_pull: [
    {
      id: 'barbell_row',
      name: 'Barbell Row',
      equipment: 'barbell',
      primary_muscles: ['mid_back', 'lats', 'rear_shoulder'],
      secondary_muscles: ['biceps', 'forearms', 'lower_back'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'lower_back', level: 'high' }
      ],
      leverage_knobs: ['tempo', 'pause_at_top'],
      regression_id: 'inverted_row',
      progression_id: null,
      description: 'Bent-over barbell row',
      cues: [
        { category: 'spine_position', text: 'Keep natural lower-back arch; never round the spine', is_critical: true },
        { category: 'force_direction', text: 'Pull elbows back and up toward your hips, not just hands to chest', is_critical: false },
        { category: 'tempo_pauses', text: 'Squeeze shoulder blades together at the top for a one-count', is_critical: false }
      ]
    },
    {
      id: 'db_row_1arm',
      name: 'One-Arm Dumbbell Row',
      equipment: 'dumbbell',
      primary_muscles: ['mid_back', 'lats', 'rear_shoulder'],
      secondary_muscles: ['biceps', 'forearms', 'trunk'],
      is_bilateral: false,
      is_compound: true,
      joint_tags: [
        { tag: 'lower_back', level: 'low' }
      ],
      leverage_knobs: ['tempo', 'pause_at_top'],
      regression_id: 'inverted_row',
      progression_id: 'barbell_row',
      description: 'Unilateral supported row',
      cues: [
        { category: 'spine_position', text: 'Brace the free hand and keep the spine long and neutral', is_critical: false },
        { category: 'force_direction', text: 'Drive the elbow back toward the hip, squeezing the shoulder blade', is_critical: false },
        { category: 'anti_movement', text: 'Keep the hips and shoulders square — stop if the torso rotates to finish a rep', is_critical: true }
      ]
    },
    {
      id: 'chest_supported_row',
      name: 'Chest-Supported Row',
      equipment: 'dumbbell',
      primary_muscles: ['mid_back', 'rear_shoulder'],
      secondary_muscles: ['biceps', 'forearms'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'lower_back', level: 'low' }
      ],
      leverage_knobs: ['tempo', 'pause_at_top'],
      regression_id: 'cable_row',
      progression_id: 'db_row_1arm',
      description: 'Lower-back-friendly row variant',
      cues: [
        { category: 'bracing', text: 'Let the bench take the spine so the lower back is out of it', is_critical: false },
        { category: 'force_direction', text: 'Row both dumbbells to the ribs and pinch the shoulder blades', is_critical: false },
        { category: 'stop_rules', text: 'Lower fully but stop the set when you can no longer pause at the top', is_critical: true }
      ]
    },
    {
      id: 'inverted_row',
      name: 'Inverted Row',
      equipment: 'bodyweight',
      primary_muscles: ['mid_back', 'rear_shoulder'],
      secondary_muscles: ['biceps', 'forearms', 'trunk'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'shoulder', level: 'low' }
      ],
      leverage_knobs: ['feet_elevated', 'tempo', 'pause_at_top', 'single_arm'],
      regression_id: null,
      progression_id: 'db_row_1arm',
      description: 'Bodyweight horizontal pull fallback',
      cues: [
        { category: 'bracing', text: 'Body rigid like a plank from heels to head', is_critical: false },
        { category: 'force_direction', text: 'Pull chest to the bar, leading with elbows', is_critical: false },
        { category: 'stop_rules', text: 'Stop when hips sag or you cannot reach full range', is_critical: true }
      ]
    },
    {
      id: 'cable_row',
      name: 'Seated Cable Row',
      equipment: 'cable',
      primary_muscles: ['mid_back', 'rear_shoulder'],
      secondary_muscles: ['biceps', 'forearms'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'lower_back', level: 'low' }
      ],
      leverage_knobs: ['tempo', 'pause_at_top'],
      regression_id: null,
      progression_id: 'barbell_row',
      description: 'Machine-based row for joint recovery',
      cues: [
        { category: 'spine_position', text: 'Sit tall and keep the chest up without leaning back hard', is_critical: false },
        { category: 'force_direction', text: 'Pull to the stomach and drive the elbows past the ribs', is_critical: false },
        { category: 'range_limits', text: 'Let the weight stretch you forward only as far as the back stays flat', is_critical: true }
      ]
    }
  ],

  vertical_pull: [
    {
      id: 'pullup',
      name: 'Pull-Up',
      equipment: 'bodyweight',
      primary_muscles: ['lats', 'biceps'],
      secondary_muscles: ['mid_back', 'forearms', 'trunk'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'shoulder', level: 'moderate' },
        { tag: 'elbow', level: 'moderate' }
      ],
      leverage_knobs: ['weighted', 'tempo', 'pause_at_top'],
      regression_id: 'band_pulldown',
      progression_id: null,
      description: 'Overhand pull-up',
      cues: [
        { category: 'bracing', text: 'Engage abs and glutes; avoid excessive swinging', is_critical: false },
        { category: 'force_direction', text: 'Pull elbows down and back, think chest to bar', is_critical: false },
        { category: 'stop_rules', text: 'Stop when you cannot reach chin over bar with control', is_critical: true }
      ]
    },
    {
      id: 'chinup',
      name: 'Chin-Up',
      equipment: 'bodyweight',
      primary_muscles: ['lats', 'biceps'],
      secondary_muscles: ['mid_back', 'forearms'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'shoulder', level: 'low' },
        { tag: 'elbow', level: 'moderate' }
      ],
      leverage_knobs: ['weighted', 'tempo', 'pause_at_top'],
      regression_id: 'band_pulldown',
      progression_id: 'pullup',
      description: 'Underhand pull-up, more bicep',
      cues: [
        { category: 'bracing', text: 'Palms facing you, start from a full hang', is_critical: false },
        { category: 'force_direction', text: 'Lead with the chest and drive the elbows to the ribs', is_critical: false },
        { category: 'stop_rules', text: 'Stop when the reps break down — do not kip to finish', is_critical: true }
      ]
    },
    {
      id: 'lat_pulldown',
      name: 'Lat Pulldown',
      equipment: 'cable',
      primary_muscles: ['lats', 'biceps'],
      secondary_muscles: ['mid_back', 'forearms'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'shoulder', level: 'low' }
      ],
      leverage_knobs: ['tempo', 'pause_at_bottom'],
      regression_id: 'band_pulldown',
      progression_id: 'chinup',
      description: 'Assisted vertical pull for building to pull-ups',
      cues: [
        { category: 'bracing', text: 'Sit tall and set the shoulders down before pulling', is_critical: false },
        { category: 'force_direction', text: 'Pull the bar to the collarbone and squeeze the lats', is_critical: false },
        { category: 'range_limits', text: 'Pull only to the collarbone — never behind the neck', is_critical: true }
      ]
    },
    {
      id: 'band_pulldown',
      name: 'Band Pulldown',
      equipment: 'band',
      primary_muscles: ['lats', 'biceps'],
      secondary_muscles: ['mid_back'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'shoulder', level: 'low' }
      ],
      leverage_knobs: ['tempo', 'pause_at_bottom', 'single_arm'],
      regression_id: null,
      progression_id: 'lat_pulldown',
      description: 'Minimal-equipment vertical pull',
      cues: [
        { category: 'bracing', text: 'Anchor the band overhead and set the shoulders down', is_critical: false },
        { category: 'force_direction', text: 'Pull the elbows to the ribs and squeeze the lats', is_critical: false },
        { category: 'stop_rules', text: 'Return under control and stop when you can no longer pause at the bottom', is_critical: true }
      ]
    }
  ],

  squat: [
    {
      id: 'back_squat',
      name: 'Back Squat',
      equipment: 'barbell',
      primary_muscles: ['quads', 'glutes'],
      secondary_muscles: ['hamstrings', 'trunk', 'lower_back'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'knee', level: 'moderate' },
        { tag: 'lower_back', level: 'moderate' }
      ],
      leverage_knobs: ['tempo', 'pause_at_bottom'],
      regression_id: 'goblet_squat',
      progression_id: null,
      description: 'Barbell back squat',
      cues: [
        { category: 'spine_position', text: 'Chest up, maintain natural lower-back arch throughout', is_critical: true },
        { category: 'joint_alignment', text: 'Knees track over toes, not caving inward', is_critical: false },
        { category: 'range_limits', text: 'Descend as deep as you can without tailbone tuck or lower-back rounding', is_critical: true }
      ]
    },
    {
      id: 'front_squat',
      name: 'Front Squat',
      equipment: 'barbell',
      primary_muscles: ['quads', 'glutes'],
      secondary_muscles: ['trunk', 'upper_back'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'knee', level: 'moderate' },
        { tag: 'lower_back', level: 'low' }
      ],
      leverage_knobs: ['tempo', 'pause_at_bottom'],
      regression_id: 'goblet_squat',
      progression_id: 'back_squat',
      description: 'Front-loaded squat, more upright',
      cues: [
        { category: 'bracing', text: 'Keep the elbows high so the bar stays on the shoulders', is_critical: false },
        { category: 'spine_position', text: 'Stay tall through the chest and brace hard', is_critical: false },
        { category: 'range_limits', text: 'Sink only as low as the torso stays upright, then drive the floor away', is_critical: true }
      ]
    },
    {
      id: 'goblet_squat',
      name: 'Goblet Squat',
      equipment: 'dumbbell',
      primary_muscles: ['quads', 'glutes'],
      secondary_muscles: ['trunk'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'knee', level: 'low' }
      ],
      leverage_knobs: ['tempo', 'pause_at_bottom'],
      regression_id: 'bodyweight_squat',
      progression_id: 'front_squat',
      description: 'Beginner-friendly squat with front load',
      cues: [
        { category: 'bracing', text: 'Hold weight at chest, elbows pointing down', is_critical: false },
        { category: 'range_limits', text: 'Squat until elbows touch inside of knees, or as deep as form allows', is_critical: true },
        { category: 'force_direction', text: 'Drive through the full foot, not just the toes', is_critical: false }
      ]
    },
    {
      id: 'split_squat',
      name: 'Split Squat',
      equipment: 'dumbbell',
      primary_muscles: ['quads', 'glutes'],
      secondary_muscles: ['trunk', 'balance'],
      is_bilateral: false,
      is_compound: true,
      joint_tags: [
        { tag: 'knee', level: 'low' }
      ],
      leverage_knobs: ['tempo', 'pause_at_bottom', 'rear_foot_elevated'],
      regression_id: 'bodyweight_squat',
      progression_id: 'goblet_squat',
      description: 'Unilateral squat pattern',
      cues: [
        { category: 'spine_position', text: 'Set the rear foot on the bench and stay tall through the torso', is_critical: false },
        { category: 'joint_alignment', text: 'Drop the back knee straight down, front knee tracking over the foot', is_critical: false },
        { category: 'range_limits', text: 'Descend only as far as balance and the front knee stay comfortable', is_critical: true }
      ]
    },
    {
      id: 'bodyweight_squat',
      name: 'Bodyweight Squat',
      equipment: 'bodyweight',
      primary_muscles: ['quads', 'glutes'],
      secondary_muscles: ['trunk'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'knee', level: 'low' }
      ],
      leverage_knobs: ['tempo', 'pause_at_bottom', 'single_leg'],
      regression_id: null,
      progression_id: 'goblet_squat',
      description: 'Bodyweight squat fallback',
      cues: [
        { category: 'joint_alignment', text: 'Track the knees over the toes and drive the floor away through the heels', is_critical: false },
        { category: 'spine_position', text: 'Keep the chest up and the lower-back arch — do not round at the bottom', is_critical: true },
        { category: 'range_limits', text: 'Squat only as deep as you can hold the arch, then stand', is_critical: true }
      ]
    }
  ],

  hinge: [
    {
      id: 'deadlift',
      name: 'Deadlift',
      equipment: 'barbell',
      primary_muscles: ['hamstrings', 'glutes', 'back'],
      secondary_muscles: ['forearms', 'trunk', 'quads'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'lower_back', level: 'high' }
      ],
      leverage_knobs: ['tempo', 'pause_at_top'],
      regression_id: 'glute_bridge',
      progression_id: null,
      description: 'Conventional deadlift',
      cues: [
        { category: 'spine_position', text: 'Spine neutral from start to finish; never round the lower back', is_critical: true },
        { category: 'bracing', text: 'Deep breath and brace abs before every rep', is_critical: false },
        { category: 'force_direction', text: 'Drive the floor away with your feet; hips and shoulders rise together', is_critical: false }
      ]
    },
    {
      id: 'rdl',
      name: 'Romanian Deadlift',
      equipment: 'barbell',
      primary_muscles: ['hamstrings', 'glutes', 'lower_back'],
      secondary_muscles: ['forearms', 'trunk'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'lower_back', level: 'high' }
      ],
      leverage_knobs: ['tempo', 'pause_at_bottom'],
      regression_id: 'glute_bridge',
      progression_id: 'deadlift',
      description: 'Hip-hinge emphasis deadlift',
      cues: [
        { category: 'joint_alignment', text: 'Soft knees, push the hips back and keep the bar against the legs', is_critical: false },
        { category: 'spine_position', text: 'Hold the natural arch and brace the abs', is_critical: true },
        { category: 'range_limits', text: 'Lower only until you feel the hamstring stretch without rounding — then stand', is_critical: true }
      ]
    },
    {
      id: 'db_rdl',
      name: 'Dumbbell RDL',
      equipment: 'dumbbell',
      primary_muscles: ['hamstrings', 'glutes'],
      secondary_muscles: ['lower_back', 'trunk'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'lower_back', level: 'moderate' }
      ],
      leverage_knobs: ['tempo', 'unilateral'],
      regression_id: 'glute_bridge',
      progression_id: 'rdl',
      description: 'Dumbbell Romanian deadlift',
      cues: [
        { category: 'joint_alignment', text: 'Soft knees, hinge at the hips', is_critical: false },
        { category: 'spine_position', text: 'Keep the natural arch, no rounding', is_critical: true },
        { category: 'range_limits', text: 'Lower only as far as hamstring flexibility allows without back rounding', is_critical: true }
      ]
    },
    {
      id: 'hip_thrust',
      name: 'Barbell Hip Thrust',
      equipment: 'barbell',
      primary_muscles: ['glutes', 'hamstrings'],
      secondary_muscles: ['trunk'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'lower_back', level: 'low' }
      ],
      leverage_knobs: ['tempo', 'pause_at_top', 'single_leg'],
      regression_id: 'glute_bridge',
      progression_id: null,
      description: 'Glute-dominant hip extension',
      cues: [
        { category: 'force_direction', text: 'Drive through heels and squeeze glutes hard at the top', is_critical: false },
        { category: 'range_limits', text: 'Stop at full hip extension; do not hyperextend the lower back', is_critical: true },
        { category: 'tempo_pauses', text: 'Hold the top position for a one-count squeeze', is_critical: false }
      ]
    },
    {
      id: 'kb_swing',
      name: 'Kettlebell Swing',
      equipment: 'kettlebell',
      primary_muscles: ['glutes', 'hamstrings', 'back'],
      secondary_muscles: ['forearms', 'shoulders'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'lower_back', level: 'moderate' }
      ],
      leverage_knobs: ['single_arm', 'higher_reps'],
      regression_id: 'glute_bridge',
      progression_id: 'rdl',
      description: 'Explosive hip hinge',
      cues: [
        { category: 'force_direction', text: 'Hinge at the hips, not a squat — the bell floats from hip snap', is_critical: false },
        { category: 'bracing', text: 'Snap the hips forward and squeeze the glutes at the top', is_critical: false },
        { category: 'stop_rules', text: 'Keep the spine neutral and stop the set when the hinge gets sloppy', is_critical: true }
      ]
    },
    {
      id: 'glute_bridge',
      name: 'Glute Bridge',
      equipment: 'bodyweight',
      primary_muscles: ['glutes', 'hamstrings'],
      secondary_muscles: ['trunk'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'lower_back', level: 'low' }
      ],
      leverage_knobs: ['tempo', 'pause_at_top', 'single_leg'],
      regression_id: null,
      progression_id: 'hip_thrust',
      description: 'Bodyweight hinge fallback',
      cues: [
        { category: 'bracing', text: 'Squeeze the glutes to lift and keep the ribs down — do not arch the low back', is_critical: false },
        { category: 'force_direction', text: 'Drive through the heels', is_critical: false },
        { category: 'range_limits', text: 'Stop short of any lower-back pinch; finish with the hips level with the knees', is_critical: true }
      ]
    }
  ],

  carry_brace: [
    {
      id: 'farmer_carry',
      name: 'Farmer Carry',
      equipment: 'dumbbell',
      primary_muscles: ['trunk', 'grip', 'forearms'],
      secondary_muscles: ['shoulders', 'glutes', 'whole_body'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'lower_back', level: 'low' }
      ],
      leverage_knobs: ['single_arm', 'longer_distance'],
      regression_id: 'plank',
      progression_id: null,
      description: 'Bilateral loaded carry',
      cues: [
        { category: 'bracing', text: 'Shoulders packed, chest up, abs braced tight', is_critical: false },
        { category: 'anti_movement', text: 'Walk with control; no leaning, twisting, or shoulder hiking', is_critical: false },
        { category: 'stop_rules', text: 'Stop when you cannot maintain upright posture or grip fails', is_critical: true }
      ]
    },
    {
      id: 'suitcase_carry',
      name: 'Suitcase Carry',
      equipment: 'dumbbell',
      primary_muscles: ['trunk', 'grip', 'obliques'],
      secondary_muscles: ['shoulders', 'glutes'],
      is_bilateral: false,
      is_compound: true,
      joint_tags: [
        { tag: 'lower_back', level: 'low' }
      ],
      leverage_knobs: ['heavier_load', 'longer_distance'],
      regression_id: 'plank',
      progression_id: 'farmer_carry',
      description: 'Unilateral anti-lateral-flexion carry',
      cues: [
        { category: 'bracing', text: 'Load one hand and brace hard against the pull', is_critical: false },
        { category: 'anti_movement', text: 'Keep the hips level and the shoulders square — do not lean toward the weight', is_critical: false },
        { category: 'stop_rules', text: 'Stop the set the moment the torso tips sideways', is_critical: true }
      ]
    },
    {
      id: 'plank',
      name: 'Plank',
      equipment: 'bodyweight',
      primary_muscles: ['trunk', 'abs'],
      secondary_muscles: ['shoulders', 'glutes'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'lower_back', level: 'low' },
        { tag: 'shoulder', level: 'low' }
      ],
      leverage_knobs: ['longer_duration', 'feet_elevated', 'single_arm'],
      regression_id: null,
      progression_id: 'farmer_carry',
      description: 'Bodyweight anti-extension hold',
      cues: [
        { category: 'spine_position', text: 'Body in a straight line from head to heels; do not let hips sag', is_critical: true },
        { category: 'bracing', text: 'Squeeze glutes and brace abs as if taking a punch', is_critical: false },
        { category: 'stop_rules', text: 'End the hold when hips drop or form breaks', is_critical: true }
      ]
    },
    {
      id: 'dead_bug',
      name: 'Dead Bug',
      equipment: 'bodyweight',
      primary_muscles: ['trunk', 'abs'],
      secondary_muscles: [],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [
        { tag: 'lower_back', level: 'low' }
      ],
      leverage_knobs: ['tempo', 'add_band'],
      regression_id: null,
      progression_id: 'plank',
      description: 'Anti-extension with limb movement',
      cues: [
        { category: 'spine_position', text: 'Press the lower back flat to the floor before you move', is_critical: true },
        { category: 'bracing', text: 'Extend the opposite arm and leg slowly while keeping the ribs down', is_critical: false },
        { category: 'stop_rules', text: 'Stop the rep if the lower back lifts off the floor', is_critical: true }
      ]
    },
    {
      id: 'pallof_press',
      name: 'Pallof Press',
      equipment: 'band',
      primary_muscles: ['trunk', 'obliques'],
      secondary_muscles: ['shoulders'],
      is_bilateral: true,
      is_compound: true,
      joint_tags: [],
      leverage_knobs: ['tempo', 'add_movement'],
      regression_id: 'dead_bug',
      progression_id: 'suitcase_carry',
      description: 'Anti-rotation press',
      cues: [
        { category: 'bracing', text: 'Stand side-on to the anchor and brace the abs', is_critical: false },
        { category: 'anti_movement', text: 'Press the handle straight out and resist the twist', is_critical: false },
        { category: 'stop_rules', text: 'Stop the set when you can no longer keep the hips and shoulders square', is_critical: true }
      ]
    }
  ]
};

// ============================================================================
// GENERATE SQL STATEMENTS
// ============================================================================

const now = nowISO();
const statements = [];

// Reference data is already in schema-exercises.sql, so we only add exercises and cues

console.log('Generating exercise INSERT statements...\n');

for (const [patternId, exercises] of Object.entries(EXERCISES_BY_PATTERN)) {
  for (const ex of exercises) {
    // Insert exercise
    statements.push(
      `INSERT OR IGNORE INTO exercises (id, name, pattern_id, equipment_id, primary_muscles, secondary_muscles, is_bilateral, is_compound, regression_id, progression_id, leverage_knobs, description, created_date, updated_date) VALUES (` +
      `'${ex.id}', ` +
      `'${ex.name.replace(/'/g, "''")}', ` +
      `'${patternId}', ` +
      `'${ex.equipment}', ` +
      `'${JSON.stringify(ex.primary_muscles).replace(/'/g, "''")}', ` +
      `'${JSON.stringify(ex.secondary_muscles).replace(/'/g, "''")}', ` +
      `${ex.is_bilateral ? 1 : 0}, ` +
      `${ex.is_compound ? 1 : 0}, ` +
      `${ex.regression_id ? `'${ex.regression_id}'` : 'NULL'}, ` +
      `${ex.progression_id ? `'${ex.progression_id}'` : 'NULL'}, ` +
      `'${JSON.stringify(ex.leverage_knobs).replace(/'/g, "''")}', ` +
      `'${ex.description.replace(/'/g, "''")}', ` +
      `datetime('now'), datetime('now'));`
    );

    // Insert joint stress tags
    for (const joint of ex.joint_tags) {
      statements.push(
        `INSERT OR IGNORE INTO exercise_joint_stress (exercise_id, joint_tag_id, stress_level) VALUES (` +
        `'${ex.id}', '${joint.tag}', '${joint.level}');`
      );
    }

    // Insert cues
    for (let i = 0; i < ex.cues.length; i++) {
      const cue = ex.cues[i];
      statements.push(
        `INSERT OR IGNORE INTO exercise_cues (id, exercise_id, category_id, cue_text, is_critical, sort_order, created_date, updated_date) VALUES (` +
        `'${ex.id}_cue${i + 1}', ` +
        `'${ex.id}', ` +
        `'${cue.category}', ` +
        `'${cue.text.replace(/'/g, "''")}', ` +
        `${cue.is_critical ? 1 : 0}, ` +
        `${i + 1}, ` +
        `datetime('now'), datetime('now'));`
      );
    }
  }
}

console.log(`Generated ${statements.length} SQL statements\n`);

// Write to temp file and execute
const tmpFile = join(here, '.seed-exercises-temp.sql');
writeFileSync(tmpFile, statements.join('\n'));

try {
  console.log(`📝 Executing seed statements...\n`);
  execSync(`npx wrangler d1 execute DB --local --file=${tmpFile}`, { stdio: 'inherit' });

  // Count total exercises
  const totalExercises = Object.values(EXERCISES_BY_PATTERN).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`\n✅ Seed complete! ${totalExercises} exercises seeded across 7 movement patterns.\n`);

  // Show breakdown
  console.log('Exercise count by pattern:');
  for (const [pattern, exercises] of Object.entries(EXERCISES_BY_PATTERN)) {
    console.log(`  ${pattern}: ${exercises.length} exercises`);
  }
  console.log('');
} catch (err) {
  console.error(`\n❌ Seed failed:`, err.message);
  process.exit(1);
} finally {
  // Keep the temp file for inspection
  console.log(`SQL file saved to: ${tmpFile}\n`);
}
