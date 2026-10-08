// Standalone proof for the programming logic in src/lib/programming.js.
// No test framework; run it with:
//   node scripts/programming.selfcheck.mjs
// Exits non-zero if any assertion fails.
//
// The pinned bug: a circuit's reps read "moderate" (12-15), so a rep-only
// classifier labels the block 'moderate'. planCircuit() must instead yield
// 'circuit' intensity, seed ZERO warm-up work-up sets (§7), and carry the
// circuit note (§6/§8). This suite reproduces the trap and proves the fix.

import {
  INTENSITY,
  PAIRING,
  topRepsOf,
  intensityFromReps,
  planIntensity,
  planCircuit,
  seedWarmup,
  warmupTierSteps,
  CIRCUIT_NOTE,
} from '../src/lib/programming.js';

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed++; }
  else { failed++; console.error('  FAIL:', name); }
}

// ---- topReps parsing: ranges take the TOP of the range ----
check('"5" -> 5', topRepsOf('5') === 5);
check('"8-10" -> 10 (top of range)', topRepsOf('8-10') === 10);
check('"12-15" -> 15 (top of range)', topRepsOf('12-15') === 15);
check('number 12 -> 12', topRepsOf(12) === 12);
check('"40m" distance hold -> null', topRepsOf('40m') === null);
check('"30s" time hold -> null', topRepsOf('30s') === null);

// ---- rep-only classifier: this is the "moderate" trap the bug lived in ----
check('straight "5" -> heavy', intensityFromReps('5') === INTENSITY.HEAVY);
check('straight "8-10" -> moderate', intensityFromReps('8-10') === INTENSITY.MODERATE);
// REPRODUCTION: circuit reps read moderate to a rep-only view. This is exactly
// the wrong answer for a circuit block, and why planCircuit must not use it.
check('straight "12-15" -> moderate (the trap)', intensityFromReps('12-15') === INTENSITY.MODERATE);

// ---- THE FIX: planCircuit(topReps) yields 'circuit', never 'moderate' ----
const circuit = planCircuit({ reps: '12-15' });
check('planCircuit "12-15" intensity === circuit (NOT moderate)',
  circuit.intensity === INTENSITY.CIRCUIT);
check('planCircuit "12-15" is not mislabelled moderate',
  circuit.intensity !== INTENSITY.MODERATE);
check('planCircuit "12" intensity === circuit',
  planCircuit({ reps: '12' }).intensity === INTENSITY.CIRCUIT);
check('planCircuit default reps intensity === circuit',
  planCircuit({}).intensity === INTENSITY.CIRCUIT);
check('planIntensity with pairing=circuit overrides moderate reps',
  planIntensity({ reps: '12-15', pairing: PAIRING.CIRCUIT }) === INTENSITY.CIRCUIT);

// ---- warm-up tier seeding (§7): heavy 4-5, moderate 2, circuit none ----
check('warm-up tier: heavy -> 5 steps', warmupTierSteps(INTENSITY.HEAVY) === 5);
check('warm-up tier: moderate -> 2 steps', warmupTierSteps(INTENSITY.MODERATE) === 2);
check('warm-up tier: circuit -> 0 steps', warmupTierSteps(INTENSITY.CIRCUIT) === 0);

// seedWarmup routes intensity -> steps end to end
check('seedWarmup heavy top set seeds 5 work-up sets',
  seedWarmup({ reps: '5' }).steps === 5);
check('seedWarmup moderate seeds 2 work-up sets',
  seedWarmup({ reps: '8-10' }).steps === 2);
check('seedWarmup circuit seeds 0 work-up sets (circuits warm in first rounds)',
  seedWarmup({ reps: '12-15', pairing: PAIRING.CIRCUIT }).steps === 0);
check('planCircuit warm-up carries 0 steps',
  circuit.warmup.steps === 0);
check('planCircuit warm-up intensity is circuit',
  circuit.warmup.intensity === INTENSITY.CIRCUIT);

// §7 overshoot single: only for 4-8 rep heavy targets, intermediate only
check('overshoot single ON for intermediate heavy 5-rep set',
  seedWarmup({ reps: '5', level: 'intermediate' }).overshoot === true);
check('overshoot single OFF for beginner heavy 5-rep set',
  seedWarmup({ reps: '5', level: 'beginner' }).overshoot === false);
check('overshoot single OFF for a circuit',
  circuit.warmup.overshoot === false);

// ---- circuit note (§6 non-competing / §8 recomposition) ----
check('circuit note is attached to a planned circuit',
  circuit.note === CIRCUIT_NOTE);
check('circuit note names the non-competing rule',
  /non-competing/i.test(CIRCUIT_NOTE));
check('circuit note forbids shared primary muscle on adjacent pairs',
  /share a primary muscle/i.test(CIRCUIT_NOTE));
check('circuit note progresses by trimming rest, not load',
  /trimming rest/i.test(CIRCUIT_NOTE));

console.log(`\nprogramming self-check: ${passed} passed, ${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
