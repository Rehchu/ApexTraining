// REPRO — equipment tags in the REAL COACHING_EXERCISES catalog vs the
// substitution engine's expected constraints (src/lib/coaching.js §6).
//
// The bug: substitute() filters candidates with
//     have.has(String(ex.equipment).toLowerCase())
// where `have` is built from the user's availableEquipment tokens plus the
// EQUIPMENT_LADDER vocabulary (barbell, dumbbell, machine, band, bodyweight…).
// It is an EXACT-MATCH lookup on a single token.
//
// But the seeded catalog stores `equipment` as free-text, often compound:
//     'dumbbells'                         (plural — not in the ladder)
//     'dumbbells, bench'                  (two items joined by a comma)
//     'kettlebell or dumbbell'            ('or' phrasing)
//     'bodyweight, bar or suspension trainer'
//     'pull-up bar, bodyweight'
//     'cable machine'                     (should be 'cable')
//
// So a user who owns dumbbells (availableEquipment: ['dumbbell']) never matches
// 'dumbbells, bench', and the whole-pattern pool can collapse to nothing —
// making substitute() falsely report "no <pattern> available" instead of
// offering the in-pattern dumbbell option. That is the exact failure the task
// warns about: a constraint quietly starving a pattern.
//
// This script imports the SAME substitute() the worker uses and runs it over
// the SAME catalog literal the worker seeds, extracted from the worker source.
// Read-only. Exits non-zero while the bug is present; exits zero once fixed.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { substitute } from '../src/lib/coaching.js';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '..', 'functions', 'api', '[[path]].js');

// The equipment vocabulary the engine understands (mirrors EQUIPMENT_LADDER in
// src/lib/coaching.js — kept in sync by scripts/coachingCatalog.audit.mjs).
const EQUIPMENT_LADDER = [
  'barbell', 'dumbbell', 'single_dumbbell', 'kettlebell', 'machine', 'cable',
  'band', 'suspension', 'bodyweight',
];
const LADDER = new Set(EQUIPMENT_LADDER);

// ---- extract the COACHING_EXERCISES array literal from the worker source ----
function extractArrayLiteral(source, name) {
  const marker = `const ${name} = [`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`could not find "${marker}" in worker source`);
  const open = source.indexOf('[', start);
  let depth = 0, i = open, inStr = null, esc = false;
  for (; i < source.length; i++) {
    const c = source[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { i++; break; } }
  }
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${source.slice(open, i)});`)();
}

const source = readFileSync(SRC, 'utf8');
const CATALOG = extractArrayLiteral(source, 'COACHING_EXERCISES');

const line = (s = '') => process.stdout.write(s + '\n');
line('='.repeat(70));
line('  SUBSTITUTION EQUIPMENT-TAG REPRO — apextraining');
line('='.repeat(70));
line(`  catalog: ${CATALOG.length} exercises`);
line('');

// ---- 1. which equipment tags are NOT a single ladder token? ----
const offenders = [];
for (const ex of CATALOG) {
  const eq = String(ex.equipment || '').toLowerCase();
  if (!LADDER.has(eq)) offenders.push({ name: ex.name, pattern: ex.pattern, equipment: ex.equipment });
}
line(`  [1] equipment tags the engine cannot match (not a ladder token): ${offenders.length}`);
for (const o of offenders) line(`      ✗ ${o.name.padEnd(30)} equipment: "${o.equipment}"`);
line('');

// ---- 2. functional proof: a dumbbell-only user loses whole patterns ----
// A user who owns dumbbells only. With clean tags this should always return an
// in-pattern dumbbell (or bodyweight) option. With the compound tags it starves.
const DUMBBELL_USER = ['dumbbell', 'bodyweight'];
const patterns = [...new Set(CATALOG.map((e) => e.pattern))];
const starved = [];
for (const pattern of patterns) {
  const current = CATALOG.find((e) => e.pattern === pattern);
  const res = substitute(current, CATALOG, { availableEquipment: DUMBBELL_USER });
  // How many in-pattern options SHOULD a dumbbell user have (name a dumbbell or
  // bodyweight tool anywhere in the free-text)? This is the honest expectation.
  const expected = CATALOG.filter((e) =>
    e.pattern === pattern &&
    e.name !== current.name &&
    /\b(dumbbell|bodyweight)\b/i.test(e.equipment || ''));
  if (!res.ok && expected.length > 0) {
    starved.push({ pattern, expected: expected.map((e) => e.name), reason: res.reason });
  }
}
line(`  [2] dumbbell+bodyweight user, patterns wrongly reported empty: ${starved.length}`);
for (const s of starved) {
  line(`      ✗ ${s.pattern}: engine said "${s.reason}"`);
  line(`         but these in-pattern dumbbell/bodyweight options exist: ${s.expected.join(', ')}`);
}
line('');

// ---- 3. multi-equipment tokens the substitution have-set can never satisfy ----
const compound = offenders.filter((o) => /[,]| or /i.test(o.equipment));
line(`  [3] compound equipment strings (comma / "or") that break exact match: ${compound.length}`);
line('');

const totalProblems = offenders.length + starved.length;
line('='.repeat(70));
if (totalProblems > 0) {
  line(`  RESULT: FAIL — ${offenders.length} untaggable equipment value(s), ` +
       `${starved.length} pattern(s) starved for a dumbbell user.`);
  line('  The substitution engine and the seed catalog disagree on the');
  line('  equipment vocabulary. Fix the seed so every exercise carries a');
  line('  ladder-token `equipment` the engine can match.');
  process.exit(1);
} else {
  line('  RESULT: PASS — every equipment tag is a ladder token the engine matches,');
  line('  and no pattern is wrongly starved. Substitutions stay in-pattern.');
  process.exit(0);
}
