// Coaching engine — the week-builder wired to the two source docs.
//
// PROGRAMMING-PRINCIPLES.md is the rulebook; COACHING-REFERENCE.md is the
// content. `programming.js` already owns warm-up tiers and circuit intensity
// (§7/§8) and is self-checked. THIS module adds the four engines the
// program-builder was missing, per docs/COACHING-GAP-ANALYSIS.md:
//
//   §5  goal → parameters          GOAL_PARAMS, paramsForGoal, normaliseGoal
//   §4  progression mechanisms     MECHANISM, nextTarget
//   §6  within-pattern substitution substitute, lighterKnobs
//   §2  balance guardrail          balanceCheck
//   §5/§7 back-off / deload        backoffTrigger, applyBackoffWeek
//   §1-§3 week composer            buildWeek (coverage + warm-ups + params)
//
// Everything is a pure function with no Cloudflare or DB imports, so the worker
// route AND scripts/coaching.selfcheck.mjs share it. Section references point
// at PROGRAMMING-PRINCIPLES.md unless a COACHING-REFERENCE §N is named.

import {
  PAIRING,
  planIntensity,
  seedWarmup,
  planCircuit,
  CIRCUIT_NOTE,
} from './programming.js';

/* ======================================================================== *
 *  Movement patterns — the unit of programming (§1)                         *
 * ======================================================================== */

/** The seven patterns exactly as the seeded catalog tags them. Selection,
 *  substitution and balance all run on these tags, never on names (§1). */
export const PATTERN = Object.freeze({
  HORIZONTAL_PUSH: 'horizontal_push',
  VERTICAL_PUSH: 'vertical_push',
  HORIZONTAL_PULL: 'horizontal_pull',
  VERTICAL_PULL: 'vertical_pull',
  SQUAT: 'squat',
  HINGE: 'hinge',
  CARRY_CORE: 'carry_core',
});

/** Which patterns count as a push, a pull, or lower — the §1 coverage buckets
 *  and the §2 balance ledger. */
const PUSH_PATTERNS = new Set([PATTERN.HORIZONTAL_PUSH, PATTERN.VERTICAL_PUSH]);
const PULL_PATTERNS = new Set([PATTERN.HORIZONTAL_PULL, PATTERN.VERTICAL_PULL]);
const LOWER_PATTERNS = new Set([PATTERN.SQUAT, PATTERN.HINGE]);

/** Bucket a pattern into push / pull / lower / core for coverage & balance. */
export function patternRole(pattern) {
  if (PUSH_PATTERNS.has(pattern)) return 'push';
  if (PULL_PATTERNS.has(pattern)) return 'pull';
  if (LOWER_PATTERNS.has(pattern)) return 'lower';
  return 'core';
}

/* ======================================================================== *
 *  §5  GOAL → PARAMETERS                                                     *
 *  The single table the app reads when a user picks what they train for.    *
 *  Reps, rest, pairing and the progression mechanism all come from here so  *
 *  templates and the generator never invent their own ranges.               *
 *  (COACHING-REFERENCE §5, PROGRAMMING-PRINCIPLES §8.)                       *
 * ======================================================================== */

export const GOAL = Object.freeze({
  STRENGTH: 'strength',
  HYPERTROPHY: 'hypertrophy',
  FAT_LOSS: 'fat_loss',
  CONDITIONING: 'conditioning',
  POWER: 'power',
});

/** Progression mechanisms (§4). Each names the metric to LOG and headline. */
export const MECHANISM = Object.freeze({
  LOAD_STEP: 'load_step',
  SCHEME_ROTATION: 'scheme_rotation',
  TOTAL_REP: 'total_rep',
  VOLUME_RAMP: 'volume_ramp',
  REST_COMPRESSION: 'rest_compression',
  DENSITY: 'density',
});

/** §5 goal→parameter table. `reps`/`rest` are [min,max]; the *Label fields are
 *  the human strings; `pairing` is the default pairing mode; `mechanism` is the
 *  PRIMARY progression knob; `headline` is the number the user should see first
 *  (§4: a density user sees "reps in 20 minutes," not bar weight). */
export const GOAL_PARAMS = Object.freeze({
  [GOAL.STRENGTH]: {
    goal: GOAL.STRENGTH,
    reps: [3, 5], repLabel: '3-5',
    rest: [120, 240], restLabel: '2-4 min',
    pairing: PAIRING.STRAIGHT,
    mechanism: MECHANISM.LOAD_STEP,
    alsoMechanisms: [MECHANISM.SCHEME_ROTATION],
    headline: 'top-set load',
    note: 'Low reps, heavy loads, long rests, straight sets. Only the last couple of sets are truly heavy. Add weight before you reach for forced reps or dropsets.',
  },
  [GOAL.HYPERTROPHY]: {
    goal: GOAL.HYPERTROPHY,
    reps: [8, 15], repLabel: '8-15',
    rest: [60, 90], restLabel: '60-90s',
    pairing: PAIRING.STRAIGHT,
    mechanism: MECHANISM.TOTAL_REP,
    alsoMechanisms: [MECHANISM.VOLUME_RAMP],
    headline: 'total reps at load',
    note: 'Moderate reps, three working sets as the sweet spot, deliberate tempo, several angles per muscle, sets stopped shy of failure.',
  },
  [GOAL.FAT_LOSS]: {
    goal: GOAL.FAT_LOSS,
    reps: [8, 15], repLabel: '8-15',
    rest: [30, 60], restLabel: 'under 60s',
    pairing: PAIRING.ALTERNATING,
    mechanism: MECHANISM.REST_COMPRESSION,
    alsoMechanisms: [MECHANISM.DENSITY],
    headline: 'rest between sets',
    note: 'Moderate reps paired upper-with-lower or push-with-pull, rests under a minute. Long slow cardio is NOT the efficient fat-loss tool here — circuits and intervals are.',
  },
  [GOAL.CONDITIONING]: {
    goal: GOAL.CONDITIONING,
    reps: [null, null], repLabel: 'intervals',
    rest: [null, null], restLabel: 'work:rest ratios',
    pairing: PAIRING.CIRCUIT,
    mechanism: MECHANISM.DENSITY,
    alsoMechanisms: [],
    headline: 'work done in the window',
    note: 'Intervals as a share of max heart rate; 2:1 work:rest for very short all-out efforts, 1:2 for longer; ladders and density blocks scored on work in a window.',
  },
  [GOAL.POWER]: {
    goal: GOAL.POWER,
    reps: [1, 3], repLabel: '1-3, fast',
    rest: [120, 240], restLabel: 'full',
    pairing: PAIRING.STRAIGHT,
    mechanism: MECHANISM.LOAD_STEP,
    alsoMechanisms: [MECHANISM.SCHEME_ROTATION],
    headline: 'bar speed',
    note: 'Very few reps at maximum speed; implements you can release (throws) so the body needn\'t decelerate. Intermediate-only, eased-in hill-style progression.',
  },
});

/** Loose goal words the old UI or an LLM might emit, mapped to a documented
 *  tag. The old enum's `balanced`/`muscle`/`cardio` are here — they have no
 *  honest §5 row, so we map them but report mapped:false so a caller can warn. */
const GOAL_ALIASES = Object.freeze({
  strength: GOAL.STRENGTH,
  power: GOAL.POWER,
  hypertrophy: GOAL.HYPERTROPHY,
  muscle: GOAL.HYPERTROPHY,
  muscle_gain: GOAL.HYPERTROPHY,
  size: GOAL.HYPERTROPHY,
  fat_loss: GOAL.FAT_LOSS,
  fatloss: GOAL.FAT_LOSS,
  recomp: GOAL.FAT_LOSS,
  recomposition: GOAL.FAT_LOSS,
  weight_loss: GOAL.FAT_LOSS,
  conditioning: GOAL.CONDITIONING,
  cardio: GOAL.CONDITIONING,
  endurance: GOAL.CONDITIONING,
  balanced: GOAL.HYPERTROPHY,
  general: GOAL.HYPERTROPHY,
});

/** Normalise any goal-ish string to a documented tag. Returns
 *  { goal, mapped, input }. `mapped:false` means we guessed or the input has no
 *  honest §5 row — warn the user before trusting the parameters. */
export function normaliseGoal(input) {
  const key = String(input || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (GOAL_PARAMS[key]) return { goal: key, mapped: true, input };
  const alias = GOAL_ALIASES[key];
  if (alias) return { goal: alias, mapped: key === alias, input };
  return { goal: GOAL.HYPERTROPHY, mapped: false, input };
}

/** Look up the §5 parameters for a goal, normalising loose input first. */
export function paramsForGoal(input) {
  return GOAL_PARAMS[normaliseGoal(input).goal];
}

/* ======================================================================== *
 *  §4  PROGRESSION — pick which knob to turn                                 *
 * ======================================================================== */

/** Per-mechanism metadata: what to track, the headline label, and the plain
 *  advance / reset rules straight from the §4 table. */
export const MECHANISM_SPEC = Object.freeze({
  [MECHANISM.LOAD_STEP]: {
    tracks: 'top-set weight', headline: 'top-set load',
    advance: 'target reps hit at the prescribed rest',
    reset: 'two consecutive misses → drop 5-10%',
  },
  [MECHANISM.SCHEME_ROTATION]: {
    tracks: 'which set×rep combination was used', headline: 'this week\'s scheme',
    advance: 'cycle combinations with a similar rep total',
    reset: 'full cycle done → add load',
  },
  [MECHANISM.TOTAL_REP]: {
    tracks: 'reps accumulated at a fixed load', headline: 'total reps at load',
    advance: 'total reached under the set cap',
    reset: 'set cap hit → raise load, drop target to the floor',
  },
  [MECHANISM.VOLUME_RAMP]: {
    tracks: 'sets per exercise', headline: 'working sets',
    advance: 'add a set every 1-2 weeks',
    reset: 'block ends at ~6 weeks',
  },
  [MECHANISM.REST_COMPRESSION]: {
    tracks: 'seconds between sets', headline: 'rest between sets',
    advance: 'every ~2 weeks, cut a fixed slice',
    reset: 'rest reaches the floor → raise load, restore rest',
  },
  [MECHANISM.DENSITY]: {
    tracks: 'total reps in a fixed window', headline: 'reps in the window',
    advance: 'more work than last time, same window',
    reset: 'plateau → change the exercise pair',
  },
});

/** Choose the progression mechanism for a goal, honouring equipment limits.
 *  §4/§6: "one pair of dumbbells" makes load stepping impossible, so switch to
 *  a non-load mechanism. Returns { mechanism, reason }. */
export function mechanismForGoal(input, { loadLimited = false } = {}) {
  const params = paramsForGoal(input);
  if (loadLimited) {
    if (params.goal === GOAL.CONDITIONING) {
      return { mechanism: MECHANISM.DENSITY, reason: 'Fixed load → score work in a window (density).' };
    }
    const knob = params.goal === GOAL.FAT_LOSS ? MECHANISM.REST_COMPRESSION : MECHANISM.TOTAL_REP;
    return { mechanism: knob, reason: 'Only one load available — progress by reps/rest, not by adding weight.' };
  }
  return { mechanism: params.mechanism, reason: `${params.goal} defaults to ${params.mechanism}.` };
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** The progression engine. Given a mechanism and a small performance log,
 *  return the next target and whether we advanced, held, or reset. Pure
 *  arithmetic; never touches a DB. (§4.)
 *
 *  Returns { mechanism, action:'advance'|'hold'|'reset', headline, next, message }. */
export function nextTarget(mechanism, log = {}) {
  const spec = MECHANISM_SPEC[mechanism];
  if (!spec) throw new Error(`unknown mechanism: ${mechanism}`);
  const base = { mechanism, headline: spec.headline };

  switch (mechanism) {
    case MECHANISM.LOAD_STEP: {
      const load = Number(log.load) || 0;
      const target = Number(log.targetReps) || 0;
      const hit = Number(log.hitReps) || 0;
      const misses = Number(log.missStreak) || 0;
      if (target > 0 && hit >= target) {
        const step = Math.max(1, Math.round(load * 0.025));
        return { ...base, action: 'advance', next: { load: load + step, targetReps: target },
          message: `Hit ${hit}/${target} — add ${step}. Next top set: ${load + step}.` };
      }
      if (misses + 1 >= 2) {
        const dropped = Math.round(load * 0.925); // ~7.5% (mid of 5-10%)
        return { ...base, action: 'reset', next: { load: dropped, targetReps: target },
          message: `Second miss — back off to ${dropped} (~7.5%) and climb again.` };
      }
      return { ...base, action: 'hold', next: { load, targetReps: target },
        message: `Missed (${hit}/${target}). Repeat ${load}; one more miss triggers a back-off.` };
    }

    case MECHANISM.TOTAL_REP: {
      const load = Number(log.load) || 0;
      const total = Number(log.totalReps) || 0;
      const target = Number(log.totalTarget) || 0;
      const sets = Number(log.sets) || 0;
      const cap = Number.isFinite(Number(log.setCap)) ? Number(log.setCap) : Infinity;
      if (target > 0 && total >= target) {
        const step = Math.max(1, Math.round(load * 0.025));
        return { ...base, action: 'advance', next: { load: load + step, totalTarget: target },
          message: `Reached ${total}/${target} reps — add ${step} and reset the rep total.` };
      }
      if (sets >= cap) {
        const step = Math.max(1, Math.round(load * 0.025));
        return { ...base, action: 'reset', next: { load: load + step, totalTarget: target },
          message: `Set cap (${cap}) hit before the rep total — raise load to ${load + step}, target to the floor.` };
      }
      return { ...base, action: 'hold', next: { load, totalTarget: target },
        message: `${total}/${target} reps so far — keep accumulating at ${load}.` };
    }

    case MECHANISM.REST_COMPRESSION: {
      const rest = Number(log.rest) || 0;
      const floor = Number(log.restFloor) || 30;
      const slice = Number(log.slice) || 15;
      if (rest - slice <= floor) {
        return { ...base, action: 'reset', next: { rest: floor, raiseLoad: true },
          message: `Rest at the floor (${floor}s) — raise the load and restore rest.` };
      }
      const nextRest = clamp(rest - slice, floor, rest);
      return { ...base, action: 'advance', next: { rest: nextRest },
        message: `Trim rest to ${nextRest}s (was ${rest}s).` };
    }

    case MECHANISM.VOLUME_RAMP: {
      const sets = Number(log.sets) || 0;
      const week = Number(log.weekInBlock) || 1;
      if (week >= 6) {
        return { ...base, action: 'reset', next: { sets, endBlock: true },
          message: 'Six-week block end — hold volume and rotate the scheme or a variant.' };
      }
      return { ...base, action: 'advance', next: { sets: sets + 1 },
        message: `Add a set: ${sets} → ${sets + 1} this week.` };
    }

    case MECHANISM.DENSITY: {
      const windowReps = Number(log.windowReps) || 0;
      const last = Number(log.lastWindowReps) || 0;
      if (windowReps > last) {
        return { ...base, action: 'advance', next: { lastWindowReps: windowReps },
          message: `${windowReps} reps in the window — beat ${last}. New number to beat: ${windowReps}.` };
      }
      return { ...base, action: 'reset', next: { changePair: true },
        message: `No gain over ${last} — change the exercise pair to break the plateau.` };
    }

    case MECHANISM.SCHEME_ROTATION: {
      const idx = Number(log.schemeIndex) || 0;
      const schemes = Array.isArray(log.schemes) && log.schemes.length
        ? log.schemes : ['5x5', '6x4', '8x3'];
      const nextIdx = (idx + 1) % schemes.length;
      if (nextIdx === 0) {
        return { ...base, action: 'reset', next: { schemeIndex: 0, addLoad: true, scheme: schemes[0] },
          message: `Full scheme cycle done — add load and restart at ${schemes[0]}.` };
      }
      return { ...base, action: 'advance', next: { schemeIndex: nextIdx, scheme: schemes[nextIdx] },
        message: `Rotate to ${schemes[nextIdx]} (similar rep total, different feel).` };
    }

    default:
      return { ...base, action: 'hold', next: {}, message: 'No progression rule.' };
  }
}

/* ======================================================================== *
 *  §6  SUBSTITUTION — the constraint picks the exercise, pattern stays fixed *
 *  Substitution is a lookup on (pattern, equipment, joint flags) in that    *
 *  priority. NEVER substitute across patterns; report "no <pattern>         *
 *  available" rather than quietly swapping in a different pattern (§6).      *
 * ======================================================================== */

/** Equipment ladder for the "no load / bodyweight fallback" search (§6). Lower
 *  index = more equipment. We search DOWN this list for a same-pattern option. */
const EQUIPMENT_LADDER = [
  'barbell', 'dumbbell', 'single_dumbbell', 'kettlebell', 'machine', 'cable',
  'band', 'suspension', 'bodyweight',
];

const equipRank = (e) => {
  const i = EQUIPMENT_LADDER.indexOf(String(e || '').toLowerCase());
  return i === -1 ? EQUIPMENT_LADDER.length : i;
};

/** Does an exercise stress a flagged joint? joint_tags on the record vs the
 *  user's sore-joint flags. */
function stressesAny(ex, jointFlags) {
  if (!jointFlags || !jointFlags.length) return false;
  const tags = (ex.joint_tags || []).map((t) => String(t).toLowerCase());
  return jointFlags.some((j) => tags.includes(String(j).toLowerCase()));
}

/**
 * Find a substitute for `current` WITHIN THE SAME PATTERN.
 *
 * @param current   the exercise record being replaced (needs .pattern)
 * @param catalog   array of exercise records (the seeded CoachingExercise list)
 * @param opts.jointFlags   sore joints to avoid, e.g. ['shoulder']
 * @param opts.availableEquipment  Set/array of equipment the user has; if given,
 *                                 only these are eligible (bodyweight always is)
 *
 * @returns { ok, pattern, exercise|null, reason }.
 *   ok:false + exercise:null means "no <pattern> available" — the honest report
 *   the docs demand instead of crossing patterns.
 */
export function substitute(current, catalog, opts = {}) {
  const pattern = current && current.pattern;
  if (!pattern) return { ok: false, pattern: null, exercise: null, reason: 'no pattern on the exercise' };
  const jointFlags = opts.jointFlags || [];
  const have = opts.availableEquipment
    ? new Set([...opts.availableEquipment].map((e) => String(e).toLowerCase()).concat('bodyweight'))
    : null;

  // Candidates: same pattern, not the exercise itself.
  let pool = catalog.filter(
    (ex) => ex.pattern === pattern && ex.name !== current.name,
  );

  // Equipment constraint (bodyweight always allowed).
  if (have) pool = pool.filter((ex) => have.has(String(ex.equipment || '').toLowerCase()));

  // Joint constraint: drop anything stressing a sore joint.
  const jointSafe = pool.filter((ex) => !stressesAny(ex, jointFlags));
  const usable = jointFlags.length ? jointSafe : pool;

  if (!usable.length) {
    // Nothing in-pattern survives the constraints. Report honestly; do NOT swap
    // in another pattern.
    const label = pattern.replace(/_/g, ' ');
    return {
      ok: false, pattern, exercise: null,
      reason: jointFlags.length
        ? `no ${label} exercise avoids ${jointFlags.join('/')} with your equipment — rest the joint or use a machine variant`
        : `no ${label} exercise fits your equipment — every pattern has a bodyweight fallback; check the catalog seed`,
    };
  }

  // Prefer the closest-equipment same-pattern option; for a joint complaint,
  // bias toward a machine (stabilises the load) then lower-equipment options.
  usable.sort((a, b) => {
    if (jointFlags.length) {
      const am = a.equipment === 'machine' ? 0 : 1;
      const bm = b.equipment === 'machine' ? 0 : 1;
      if (am !== bm) return am - bm;
    }
    return equipRank(a.equipment) - equipRank(b.equipment);
  });

  const pick = usable[0];
  const why = jointFlags.length
    ? `${jointFlags.join('/')}-friendly ${pattern.replace(/_/g, ' ')} option (same pattern, load stabilised)`
    : `same pattern (${pattern.replace(/_/g, ' ')}), fits your equipment`;
  return { ok: true, pattern, exercise: pick, reason: why };
}

/** The "the weight is too light" ladder (§6). Offer knobs IN ORDER and relabel
 *  progression to a non-load mechanism. Returns an ordered list of moves plus
 *  the mechanism to switch to. This never changes the exercise's pattern. */
export function lighterKnobs(goal) {
  const order = [
    { knob: 'tempo', how: 'Slow the lowering to a 3-count and pause at the hard point.' },
    { knob: 'unilateral', how: 'Work one limb at a time — the trunk fights the imbalance.' },
    { knob: 'rest_compression', how: 'Shorten the rest between sets.' },
    { knob: 'circuit', how: 'Pair with a non-competing movement and cut the rest.' },
    { knob: 'higher_reps', how: 'Raise the reps toward the top of the range.' },
  ];
  const { mechanism } = mechanismForGoal(goal, { loadLimited: true });
  return {
    order,
    relabelTo: mechanism,
    note: `Load stepping is off the table — headline the ${MECHANISM_SPEC[mechanism].headline} instead.`,
  };
}

/* ======================================================================== *
 *  §2  BALANCE — a hard constraint                                          *
 *  Track weekly pull sets against push sets. If pull falls below push,      *
 *  surface the ratio and prescribe protective pulling volume.               *
 * ======================================================================== */

/**
 * Tally push vs pull sets across a week's exercises and judge balance.
 *
 * @param exercises  array with {pattern, sets}
 * @param opts.priorPullDeficit  true if pull < push LAST week too (§2: two weeks
 *                               running is the auto-insert trigger)
 * @returns { pushSets, pullSets, ratio, balanced, twoWeekDeficit, prescription, message }
 */
export function balanceCheck(exercises = [], opts = {}) {
  let pushSets = 0, pullSets = 0;
  for (const ex of exercises) {
    const role = patternRole(ex.pattern);
    const sets = Number(ex.sets) || 0;
    if (role === 'push') pushSets += sets;
    else if (role === 'pull') pullSets += sets;
  }
  const ratio = pushSets === 0 ? (pullSets > 0 ? Infinity : 1) : +(pullSets / pushSets).toFixed(2);
  const balanced = pullSets >= pushSets;
  const twoWeekDeficit = !balanced && !!opts.priorPullDeficit;
  let prescription = null;
  if (twoWeekDeficit) {
    const gap = pushSets - pullSets;
    prescription = {
      insert: 'horizontal_pull',
      addSets: Math.max(2, gap),
      examples: ['Face Pull', 'Chest-Supported Row', 'Band Pull-Apart'],
    };
  }
  const message = balanced
    ? `Pull ${pullSets} ≥ push ${pushSets} sets — balanced.`
    : twoWeekDeficit
      ? `Pull (${pullSets}) below push (${pushSets}) two weeks running — auto-inserting ${prescription.addSets} sets of rear-shoulder/upper-back work. This is protective, not cosmetic.`
      : `Pull (${pullSets}) below push (${pushSets}) this week — watch it; a second week triggers auto-inserted pulling volume.`;
  return { pushSets, pullSets, ratio, balanced, twoWeekDeficit, prescription, message };
}

/* ======================================================================== *
 *  §5 / §7  BACK-OFF / DELOAD                                                *
 *  Trigger a back-off week on any of the four signals; the week keeps the    *
 *  exercises and pattern coverage, drops load 10-20%, and removes the last   *
 *  set of everything. The session is NOT cancelled — the user still shows up. *
 * ======================================================================== */

/**
 * Decide whether to trigger a back-off week.
 *
 * @param signals.missedTopSets   consecutive missed top sets on one lift
 * @param signals.jointPainFlagsIn7d  count of joint-pain flags in the last 7 days
 * @param signals.lowReadinessStreak  consecutive sessions of low sleep/soreness
 * @param signals.weekInBlock     current week number in the 6-week block
 * @returns { backoff, reasons[], message }
 */
export function backoffTrigger(signals = {}) {
  const reasons = [];
  if ((Number(signals.missedTopSets) || 0) >= 2) reasons.push('two consecutive missed top sets on one lift');
  if ((Number(signals.jointPainFlagsIn7d) || 0) >= 2) reasons.push('a joint-pain flag twice in seven days');
  if ((Number(signals.lowReadinessStreak) || 0) >= 3) reasons.push('low sleep/soreness three sessions running');
  if ((Number(signals.weekInBlock) || 0) >= 6) reasons.push('end of the six-week block');
  const backoff = reasons.length > 0;
  return {
    backoff,
    reasons,
    message: backoff
      ? `Back-off week: ${reasons.join('; ')}. Keep the exercises and pattern coverage, drop load 10-20%, remove the last set of everything. You still show up.`
      : 'No back-off trigger — keep progressing, leave 1-2 reps in the tank.',
  };
}

/** Transform a week's exercises into their back-off version: same exercises and
 *  pattern coverage, load cut by `loadDropPct` (default 15%, mid of 10-20), and
 *  the last set removed from everything (min 1 set kept). (§5/§7.) */
export function applyBackoffWeek(exercises = [], { loadDropPct = 15 } = {}) {
  const factor = 1 - clamp(loadDropPct, 10, 20) / 100;
  return exercises.map((ex) => {
    const sets = Math.max(1, (Number(ex.sets) || 1) - 1);
    const out = { ...ex, sets, backoff: true };
    if (typeof ex.load === 'number') out.load = Math.round(ex.load * factor);
    return out;
  });
}

/* ======================================================================== *
 *  §1-§3  WEEK COMPOSER                                                      *
 *  Tie it together: coverage check (§1), warm-up seeding (§7), goal params   *
 *  (§5). This is what the generator should call so the seeded truth reaches  *
 *  a user's plan instead of being decorative.                               *
 * ======================================================================== */

/** Choose the week structure from days available (§3): ≤3 → full-body rotation,
 *  4 → upper/lower, 5+ → same with extra days to conditioning, not more lifting. */
export function structureForDays(days) {
  const d = Number(days) || 3;
  if (d <= 3) return { split: 'full_body', liftingDays: Math.min(d, 3), conditioningDays: 0 };
  if (d === 4) return { split: 'upper_lower', liftingDays: 4, conditioningDays: 0 };
  return { split: 'upper_lower', liftingDays: 4, conditioningDays: d - 4 };
}

/** Is a session complete? §1: it covers push, pull AND lower. */
export function sessionCoverage(exercises = []) {
  const roles = new Set(exercises.map((e) => patternRole(e.pattern)));
  const missing = ['push', 'pull', 'lower'].filter((r) => !roles.has(r));
  return { complete: missing.length === 0, missing, roles: [...roles] };
}

/** Is a week complete? §1: each pattern appears at least twice. Returns the
 *  per-pattern count and the list of patterns under the twice-a-week floor. */
export function weekCoverage(sessions = []) {
  const counts = {};
  for (const p of Object.values(PATTERN)) counts[p] = 0;
  for (const session of sessions) {
    const seen = new Set();
    for (const ex of session) {
      if (ex.pattern && !seen.has(ex.pattern)) { seen.add(ex.pattern); }
    }
    for (const p of seen) counts[p] += 1;
  }
  // §1 counts by push/pull/lower buckets appearing twice, not every one of the
  // seven micro-patterns; carry/core is garnish. We check the three big roles.
  const roleCounts = { push: 0, pull: 0, lower: 0 };
  for (const session of sessions) {
    const roles = new Set(session.map((e) => patternRole(e.pattern)));
    for (const r of ['push', 'pull', 'lower']) if (roles.has(r)) roleCounts[r] += 1;
  }
  const under = Object.entries(roleCounts).filter(([, n]) => n < 2).map(([r]) => r);
  return { patternCounts: counts, roleCounts, complete: under.length === 0, under };
}

/**
 * Compose the coaching envelope for a planned week: goal params, per-session
 * coverage, week coverage, balance, and a warm-up plan for the heaviest lift of
 * each session. This does NOT invent exercises — it validates and annotates a
 * plan (from a template or the catalog) so the rules travel with it.
 *
 * @param plan.goal
 * @param plan.days
 * @param plan.level  'beginner' | 'intermediate'
 * @param plan.sessions  array of sessions, each an array of {pattern, sets, reps, name}
 */
export function buildWeek(plan = {}) {
  const goalInfo = normaliseGoal(plan.goal);
  const params = GOAL_PARAMS[goalInfo.goal];
  const structure = structureForDays(plan.days);
  const sessions = plan.sessions || [];

  const perSession = sessions.map((s, i) => {
    const cov = sessionCoverage(s);
    // Warm-up is seeded off the heaviest (lowest-rep) lift of the session.
    const heaviest = [...s].sort((a, b) => (parseInt(a.reps) || 99) - (parseInt(b.reps) || 99))[0];
    const warmup = heaviest
      ? seedWarmup({ reps: heaviest.reps, pairing: params.pairing, level: plan.level })
      : null;
    return { day: i + 1, coverage: cov, warmup };
  });

  const week = weekCoverage(sessions);
  const allExercises = sessions.flat();
  const balance = balanceCheck(allExercises, { priorPullDeficit: plan.priorPullDeficit });

  const flags = [];
  if (!goalInfo.mapped) flags.push(`goal "${goalInfo.input}" has no §5 row — mapped to ${goalInfo.goal}; confirm with the user.`);
  perSession.forEach((ps) => { if (!ps.coverage.complete) flags.push(`day ${ps.day} missing: ${ps.coverage.missing.join(', ')}`); });
  if (!week.complete) flags.push(`week under twice-a-week floor: ${week.under.join(', ')}`);
  if (!balance.balanced) flags.push(balance.message);

  return {
    goal: goalInfo.goal,
    goalMapped: goalInfo.mapped,
    params,
    structure,
    perSession,
    weekCoverage: week,
    balance,
    mechanism: params.mechanism,
    headline: params.headline,
    durationWeeks: 6, // every block is time-boxed (§4/REFERENCE §4)
    flags,
    valid: flags.length === 0,
  };
}

// Re-export the circuit helpers so a caller can import one module.
export { PAIRING, planIntensity, planCircuit, seedWarmup, CIRCUIT_NOTE };
