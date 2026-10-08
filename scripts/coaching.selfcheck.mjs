// Standalone proof for the coaching engine in src/lib/coaching.js — the
// week-builder wired to PROGRAMMING-PRINCIPLES (§2 balance, §4 progression,
// §5 goal params, §6 substitution, §5/§7 back-off, §1-§3 week composer).
// No test framework; run it with:
//   node scripts/coaching.selfcheck.mjs
// Exits non-zero if any assertion fails.

import {
  GOAL, MECHANISM, PATTERN,
  GOAL_PARAMS, normaliseGoal, paramsForGoal,
  mechanismForGoal, nextTarget, MECHANISM_SPEC,
  substitute, lighterKnobs,
  balanceCheck,
  backoffTrigger, applyBackoffWeek,
  structureForDays, sessionCoverage, weekCoverage, buildWeek, patternRole,
} from '../src/lib/coaching.js';

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) passed++;
  else { failed++; console.error('  FAIL:', name); }
}

/* ---------------- §5 goal → parameters ---------------- */
check('five documented goals have a params row',
  [GOAL.STRENGTH, GOAL.HYPERTROPHY, GOAL.FAT_LOSS, GOAL.CONDITIONING, GOAL.POWER]
    .every((g) => GOAL_PARAMS[g]));
check('strength → load_step, straight sets, long rest',
  GOAL_PARAMS[GOAL.STRENGTH].mechanism === MECHANISM.LOAD_STEP &&
  GOAL_PARAMS[GOAL.STRENGTH].restLabel === '2-4 min');
check('fat_loss → rest_compression, <60s rest, alternating',
  GOAL_PARAMS[GOAL.FAT_LOSS].mechanism === MECHANISM.REST_COMPRESSION);
check('conditioning → density, circuit pairing',
  GOAL_PARAMS[GOAL.CONDITIONING].mechanism === MECHANISM.DENSITY);
// the old UI enum words must map, and 'balanced'/'muscle'/'cardio' flag mapped:false
check('normaliseGoal("muscle") → hypertrophy but mapped:false (no §5 row)',
  normaliseGoal('muscle').goal === GOAL.HYPERTROPHY && normaliseGoal('muscle').mapped === false);
check('normaliseGoal("cardio") → conditioning, mapped:false',
  normaliseGoal('cardio').goal === GOAL.CONDITIONING && normaliseGoal('cardio').mapped === false);
check('normaliseGoal("balanced") → mapped:false (no honest row)',
  normaliseGoal('balanced').mapped === false);
check('normaliseGoal("Fat Loss") normalises spacing/case → fat_loss mapped',
  normaliseGoal('Fat Loss').goal === GOAL.FAT_LOSS);
check('paramsForGoal("strength").headline is the top-set load',
  paramsForGoal('strength').headline === 'top-set load');

/* ---------------- §4 progression mechanism selection ---------------- */
check('load-limited strength switches OFF load_step (one pair of dumbbells)',
  mechanismForGoal('strength', { loadLimited: true }).mechanism !== MECHANISM.LOAD_STEP);
check('load-limited strength → total_rep',
  mechanismForGoal('strength', { loadLimited: true }).mechanism === MECHANISM.TOTAL_REP);
check('load-limited fat_loss → rest_compression',
  mechanismForGoal('fat_loss', { loadLimited: true }).mechanism === MECHANISM.REST_COMPRESSION);
check('unlimited strength keeps load_step',
  mechanismForGoal('strength').mechanism === MECHANISM.LOAD_STEP);

/* ---------------- §4 nextTarget engine ---------------- */
// LOAD STEP: hit target → advance; second miss → reset (drop ~7.5%)
const ls1 = nextTarget(MECHANISM.LOAD_STEP, { load: 100, targetReps: 5, hitReps: 5 });
check('load_step advance adds weight on a hit', ls1.action === 'advance' && ls1.next.load > 100);
const ls2 = nextTarget(MECHANISM.LOAD_STEP, { load: 100, targetReps: 5, hitReps: 3, missStreak: 1 });
check('load_step resets on the second miss (~7.5% drop)',
  ls2.action === 'reset' && ls2.next.load === 93);
const ls3 = nextTarget(MECHANISM.LOAD_STEP, { load: 100, targetReps: 5, hitReps: 3, missStreak: 0 });
check('load_step holds on the first miss', ls3.action === 'hold' && ls3.next.load === 100);

// TOTAL REP: reach total → advance; hit set cap first → reset
const tr1 = nextTarget(MECHANISM.TOTAL_REP, { load: 50, totalReps: 40, totalTarget: 40, sets: 4, setCap: 6 });
check('total_rep advances when the rep total is reached', tr1.action === 'advance' && tr1.next.load > 50);
const tr2 = nextTarget(MECHANISM.TOTAL_REP, { load: 50, totalReps: 30, totalTarget: 40, sets: 6, setCap: 6 });
check('total_rep resets when the set cap is hit before the total', tr2.action === 'reset');

// REST COMPRESSION: trim toward the floor; at the floor → raise load
const rc1 = nextTarget(MECHANISM.REST_COMPRESSION, { rest: 60, restFloor: 30, slice: 15 });
check('rest_compression trims the rest', rc1.action === 'advance' && rc1.next.rest === 45);
const rc2 = nextTarget(MECHANISM.REST_COMPRESSION, { rest: 40, restFloor: 30, slice: 15 });
check('rest_compression at the floor raises load & restores rest',
  rc2.action === 'reset' && rc2.next.raiseLoad === true);

// VOLUME RAMP: add a set until the block ends at week 6
check('volume_ramp adds a set mid-block',
  nextTarget(MECHANISM.VOLUME_RAMP, { sets: 3, weekInBlock: 2 }).next.sets === 4);
check('volume_ramp ends the block at week 6',
  nextTarget(MECHANISM.VOLUME_RAMP, { sets: 5, weekInBlock: 6 }).action === 'reset');

// DENSITY: beat last window → advance; else change the pair
check('density advances when you beat the window',
  nextTarget(MECHANISM.DENSITY, { windowReps: 55, lastWindowReps: 50 }).action === 'advance');
check('density changes the pair on a plateau',
  nextTarget(MECHANISM.DENSITY, { windowReps: 50, lastWindowReps: 50 }).next.changePair === true);

// SCHEME ROTATION: cycle, then add load
check('scheme_rotation rotates within the cycle',
  nextTarget(MECHANISM.SCHEME_ROTATION, { schemeIndex: 0 }).action === 'advance');
check('scheme_rotation adds load after a full cycle',
  nextTarget(MECHANISM.SCHEME_ROTATION, { schemeIndex: 2, schemes: ['5x5', '6x4', '8x3'] }).next.addLoad === true);

// every mechanism has a headline metric (§4 "make the metric the headline")
check('every mechanism names a headline metric',
  Object.values(MECHANISM).every((m) => MECHANISM_SPEC[m] && MECHANISM_SPEC[m].headline));

/* ---------------- §6 substitution: never cross patterns ---------------- */
const catalog = [
  { name: 'Barbell Bench Press', pattern: 'horizontal_push', equipment: 'barbell', joint_tags: ['shoulder', 'elbow'] },
  { name: 'Dumbbell Bench Press', pattern: 'horizontal_push', equipment: 'dumbbell', joint_tags: ['shoulder'] },
  { name: 'Machine Chest Press', pattern: 'horizontal_push', equipment: 'machine', joint_tags: [] },
  { name: 'Push-Up', pattern: 'horizontal_push', equipment: 'bodyweight', joint_tags: [] },
  { name: 'Pull-Up', pattern: 'vertical_pull', equipment: 'bodyweight', joint_tags: ['shoulder', 'elbow'] },
  { name: 'Lat Pulldown', pattern: 'vertical_pull', equipment: 'machine', joint_tags: [] },
];
const barbellBench = catalog[0];

const subEquip = substitute(barbellBench, catalog, { availableEquipment: ['bodyweight'] });
check('substitute stays in-pattern (horizontal_push → horizontal_push)',
  subEquip.ok && subEquip.exercise.pattern === 'horizontal_push');
check('substitute honours equipment limit → bodyweight push-up',
  subEquip.exercise.name === 'Push-Up');

const subJoint = substitute(barbellBench, catalog, { jointFlags: ['shoulder'] });
check('shoulder-flagged substitute avoids shoulder-tagged lifts',
  subJoint.ok && (subJoint.exercise.joint_tags || []).includes('shoulder') === false);
check('shoulder-flagged substitute prefers the machine (load stabilised)',
  subJoint.exercise.name === 'Machine Chest Press');

// the honest "no pull available" report — never swap in a push
const onlyPush = catalog.filter((e) => e.pattern === 'horizontal_push');
const noPull = substitute({ name: 'Pull-Up', pattern: 'vertical_pull' }, onlyPush, {});
check('no in-pattern option → reports honestly, returns no exercise',
  noPull.ok === false && noPull.exercise === null && /vertical pull/.test(noPull.reason));

// "too light" ladder relabels progression to a non-load mechanism, in order
const knobs = lighterKnobs('strength');
check('lighterKnobs offers tempo first, then unilateral',
  knobs.order[0].knob === 'tempo' && knobs.order[1].knob === 'unilateral');
check('lighterKnobs relabels progression off load stepping',
  knobs.relabelTo !== MECHANISM.LOAD_STEP);

/* ---------------- §2 balance ---------------- */
const balanced = balanceCheck([
  { pattern: 'horizontal_push', sets: 3 },
  { pattern: 'horizontal_pull', sets: 3 },
  { pattern: 'vertical_pull', sets: 2 },
]);
check('pull ≥ push reads balanced', balanced.balanced === true);

const pushHeavy = balanceCheck([
  { pattern: 'horizontal_push', sets: 4 },
  { pattern: 'vertical_push', sets: 3 },
  { pattern: 'horizontal_pull', sets: 3 },
]);
check('push > pull flags imbalance', pushHeavy.balanced === false);
check('single-week imbalance warns but does not yet auto-insert',
  pushHeavy.twoWeekDeficit === false && pushHeavy.prescription === null);

const twoWeek = balanceCheck([
  { pattern: 'horizontal_push', sets: 4 },
  { pattern: 'vertical_push', sets: 3 },
  { pattern: 'horizontal_pull', sets: 3 },
], { priorPullDeficit: true });
check('two weeks running auto-inserts protective pulling volume',
  twoWeek.twoWeekDeficit === true && twoWeek.prescription.insert === 'horizontal_pull');

/* ---------------- §5/§7 back-off ---------------- */
check('two missed top sets trigger a back-off',
  backoffTrigger({ missedTopSets: 2 }).backoff === true);
check('joint pain twice in 7 days triggers a back-off',
  backoffTrigger({ jointPainFlagsIn7d: 2 }).backoff === true);
check('low readiness three sessions running triggers a back-off',
  backoffTrigger({ lowReadinessStreak: 3 }).backoff === true);
check('week 6 (block end) triggers a back-off',
  backoffTrigger({ weekInBlock: 6 }).backoff === true);
check('a clean week does NOT trigger a back-off',
  backoffTrigger({ missedTopSets: 1, weekInBlock: 3 }).backoff === false);

const bo = applyBackoffWeek([
  { name: 'Back Squat', pattern: 'squat', sets: 4, load: 100 },
  { name: 'Plank', pattern: 'carry_core', sets: 3 },
]);
check('back-off week drops the last set of everything',
  bo[0].sets === 3 && bo[1].sets === 2);
check('back-off week cuts load 10-20% (15% default → 85)',
  bo[0].load === 85);
check('back-off keeps the exercise (does not cancel the session)',
  bo[0].name === 'Back Squat' && bo[0].backoff === true);

/* ---------------- §1-§3 week composer ---------------- */
check('≤3 days → full-body rotation', structureForDays(3).split === 'full_body');
check('4 days → upper/lower', structureForDays(4).split === 'upper_lower');
check('5+ days send extras to conditioning, not more lifting',
  structureForDays(5).liftingDays === 4 && structureForDays(5).conditioningDays === 1);

const session = [
  { pattern: 'squat', sets: 3, reps: '5' },
  { pattern: 'horizontal_push', sets: 3, reps: '5' },
  { pattern: 'horizontal_pull', sets: 3, reps: '6' },
  { pattern: 'carry_core', sets: 3, reps: '30s' },
];
check('a session with push+pull+lower is complete', sessionCoverage(session).complete === true);
check('a push-only session is incomplete',
  sessionCoverage([{ pattern: 'horizontal_push', sets: 3 }]).missing.includes('pull'));

const wk = weekCoverage([session, session, session]);
check('each big role appearing 3× clears the twice-a-week floor', wk.complete === true);

const built = buildWeek({
  goal: 'strength', days: 3, level: 'beginner',
  sessions: [session, session, session],
});
check('buildWeek maps the goal to strength params',
  built.goal === GOAL.STRENGTH && built.mechanism === MECHANISM.LOAD_STEP);
check('buildWeek seeds a heavy warm-up (5 work-up sets) for a 5-rep session',
  built.perSession[0].warmup.steps === 5);
check('buildWeek time-boxes the block at 6 weeks', built.durationWeeks === 6);
check('a complete, balanced week is valid', built.valid === true);

const brokenWeek = buildWeek({
  goal: 'muscle', days: 3, level: 'beginner',
  sessions: [[{ pattern: 'horizontal_push', sets: 5, reps: '8-10' }]],
});
check('buildWeek flags an unmapped goal word',
  brokenWeek.flags.some((f) => /muscle/.test(f)));
check('buildWeek flags a push-only, under-covered week',
  brokenWeek.valid === false && brokenWeek.flags.length > 0);

check('patternRole buckets vertical_pull as pull', patternRole(PATTERN.VERTICAL_PULL) === 'pull');

console.log(`\ncoaching self-check: ${passed} passed, ${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
