// Programming logic distilled from PROGRAMMING-PRINCIPLES.md (the rules) and
// COACHING-REFERENCE.md (the content). Pure functions, no Cloudflare or DB
// imports, so the worker route AND scripts/programming.selfcheck.mjs can share
// them. Everything here is honest against §7 (warm-up tiers) and §8 (what
// changes by goal), which are the source of truth.
//
// Section references below point at PROGRAMMING-PRINCIPLES.md.

/** Intensity labels the app plans a block at. Distinct from the goal tag:
 *  a recomposition CIRCUIT uses moderate reps but is planned as its own
 *  intensity because its work-up/pairing/rest behaviour differs (§7, §8). */
export const INTENSITY = Object.freeze({
  HEAVY: 'heavy',
  MODERATE: 'moderate',
  CIRCUIT: 'circuit',
});

/** Pairing modes the goal tag selects (§8). */
export const PAIRING = Object.freeze({
  STRAIGHT: 'straight',
  ALTERNATING: 'alternating',
  SUPERSET: 'superset',
  CIRCUIT: 'circuit',
});

/** Goal → parameters table from COACHING-REFERENCE §5. The goal tag sets four
 *  defaults: rep range, rest range, pairing mode, and progression mechanism.
 *  This is what the app reads when a user picks what they're training for. */
export const GOAL_PARAMETERS = Object.freeze({
  strength: {
    reps: '3-5',
    rest_seconds: 180, // 2-4 min, using midpoint 3min = 180s
    rest_range: [120, 240],
    pairing: PAIRING.STRAIGHT,
    progression: 'load_step',
    progression_note: 'Add weight once you hit the top of the rep range at prescribed rest. Rotate set×rep schemes.',
  },
  hypertrophy: {
    reps: '8-15',
    rest_seconds: 75, // 60-90s, using midpoint
    rest_range: [60, 90],
    pairing: PAIRING.STRAIGHT,
    progression: 'total_rep_or_volume_ramp',
    progression_note: 'Add reps toward the top of the range, then add a set every 1-2 weeks (volume ramp).',
  },
  fat_loss: {
    reps: '10-12',
    rest_seconds: 45, // <60s, using 45s
    rest_range: [30, 60],
    pairing: PAIRING.CIRCUIT,
    progression: 'rest_compression',
    progression_note: 'Progress by trimming rest a few seconds every couple weeks, not by adding load.',
  },
  recomposition: {
    reps: '10-12',
    rest_seconds: 45, // <60s
    rest_range: [30, 60],
    pairing: PAIRING.CIRCUIT,
    progression: 'rest_compression',
    progression_note: 'Moderate reps paired upper-with-lower or push-with-pull; rest under a minute. Progress via rest compression.',
  },
  conditioning: {
    reps: 'intervals', // not rep-counted
    rest_seconds: null, // varies by work:rest ratio
    rest_range: null,
    pairing: PAIRING.CIRCUIT,
    progression: 'density',
    progression_note: 'Score work done in a fixed time window; progress by completing more reps in the same window.',
  },
  power: {
    reps: '1-3',
    rest_seconds: 180, // full recovery
    rest_range: [120, 240],
    pairing: PAIRING.STRAIGHT,
    progression: 'speed_then_load',
    progression_note: 'Very low reps, maximum speed. Progress bar speed first, then add a small load step. Intermediate-only.',
  },
});

// Rep-count thresholds. §8: strength is low reps (~<=6), hypertrophy moderate
// (~8-15), higher-rep endurance/circuit work climbs above that. These bounds
// classify a *straight* set by its reps alone.
const HEAVY_MAX_REPS = 6;
const MODERATE_MAX_REPS = 15;

/** Parse a rep prescription ("5", "8-10", "12-15", "40m", "30s") to a number
 *  we can threshold on. Ranges use the TOP of the range — the hardest end,
 *  which is what "top reps" means. Time/distance holds return null (they are
 *  not rep-graded). */
export function topRepsOf(reps) {
  if (typeof reps === 'number') return Number.isFinite(reps) ? reps : null;
  if (typeof reps !== 'string') return null;
  const trimmed = reps.trim();
  // time (30s / 45s) or distance (40m) holds are not rep-counted
  if (/[a-z]/i.test(trimmed) && !/^\d+\s*-\s*\d+$/.test(trimmed)) {
    // allow a trailing unit only if there is no dash range; e.g. "40m", "30s"
    if (/^\d+\s*(s|m|sec|min|meters?)$/i.test(trimmed)) return null;
  }
  const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) return Number(range[2]); // top of the range
  const single = trimmed.match(/^(\d+)$/);
  if (single) return Number(single[1]);
  return null;
}

/** Classify a STRAIGHT set by its top reps alone. This is the rep-only view;
 *  it deliberately knows nothing about pairing, so a circuit's moderate reps
 *  land in MODERATE here. Callers that are planning a circuit must NOT rely on
 *  this — use planIntensity()/planCircuit() (§8). */
export function intensityFromReps(reps) {
  const top = topRepsOf(reps);
  if (top === null) return INTENSITY.MODERATE; // holds default to moderate effort
  if (top <= HEAVY_MAX_REPS) return INTENSITY.HEAVY;
  if (top <= MODERATE_MAX_REPS) return INTENSITY.MODERATE;
  return INTENSITY.MODERATE; // very high reps are still moderate effort when done straight
}

/** The block-level intensity: reps AND pairing together. This is what the app
 *  should store on a planned block. A circuit is its own intensity even though
 *  its reps read moderate — that is the whole point of §8's recomposition
 *  section. Everything else falls back to the rep-only classifier. */
export function planIntensity({ reps, pairing } = {}) {
  // A circuit is its own intensity: pairing wins over the moderate reps it uses,
  // so topReps in a circuit yields 'circuit', never 'moderate' (§8).
  if (pairing === PAIRING.CIRCUIT) return INTENSITY.CIRCUIT;
  return intensityFromReps(reps);
}

/** The circuit coaching note (§6 non-competing rule, §8 recomposition). One
 *  honest line of copy the app attaches to any circuit block. */
export const CIRCUIT_NOTE =
  'Circuit: pair non-competing movements (upper with lower, push with pull) and keep rest under a minute. ' +
  'Adjacent pairs never share a primary muscle. Progress by trimming rest, not by adding load.';

/** Warm-up work-up sets, tiered by the day's intensity (§7). The reference is
 *  explicit: "four or five steps for a heavy top set, two for moderate, none
 *  for circuits." Returns the number of work-up (ramp) sets to seed. */
export function warmupTierSteps(intensity) {
  switch (intensity) {
    case INTENSITY.HEAVY:
      return 5; // 4-5 steps; we seed the top of the range for a true heavy top set
    case INTENSITY.MODERATE:
      return 2;
    case INTENSITY.CIRCUIT:
      return 0; // circuits carry their warm-up in the first easy rounds
    default:
      return 2;
  }
}

/** Seed the warm-up for a planned block: the tier's step count plus its note.
 *  §7: the overshoot single applies only to 4-8-rep targets for intermediates;
 *  circuits get no work-up sets at all. */
export function seedWarmup({ reps, pairing, level } = {}) {
  const intensity = planIntensity({ reps, pairing });
  const steps = warmupTierSteps(intensity);
  const top = topRepsOf(reps);
  const overshoot =
    intensity === INTENSITY.HEAVY &&
    level === 'intermediate' &&
    top !== null &&
    top >= 4 &&
    top <= 8;
  let note;
  if (intensity === INTENSITY.CIRCUIT) {
    note = 'No work-up sets — circuits warm up in the first easy rounds.';
  } else if (overshoot) {
    note = 'Ramp in steps; finish with a single just above the working weight so the set feels lighter.';
  } else {
    note = 'Empty bar first, add weight in steps while cutting reps, arrive ready.';
  }
  return { intensity, steps, overshoot, note };
}

/** Plan a circuit block. Whatever the reps read (they are moderate by design),
 *  a circuit is planned at CIRCUIT intensity, carries the circuit note, and
 *  seeds ZERO work-up sets. This is the function the assigned task pins:
 *  planCircuit(topReps) must yield 'circuit', never 'moderate'. */
export function planCircuit({ reps = '12-15', level } = {}) {
  const pairing = PAIRING.CIRCUIT;
  const intensity = planIntensity({ reps, pairing }); // -> 'circuit'
  const warmup = seedWarmup({ reps, pairing, level });
  return {
    pairing,
    intensity,
    reps,
    note: CIRCUIT_NOTE,
    warmup,
  };
}
