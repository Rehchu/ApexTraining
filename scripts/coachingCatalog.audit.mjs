// Coaching catalog coverage audit — Apex, town/apex branch.
//
// Audits the self-seeding exercise catalog and program templates in
// functions/api/[[path]].js against COACHING-REFERENCE.md:
//   §1  every one of the seven movement patterns is stocked, each with a
//       bodyweight fallback; the eight selection/substitution fields are present.
//   §2  each exercise carries 1-3 cues and at least one is a stop-rule / ROM
//       limit; direct-arm/calf/neck garnish is not the spine of the catalog.
//   §4  the four ready-to-ship templates exist and every exercise they name
//       resolves to a catalog entry.
//
// It extracts the two array literals from the worker source (no import of the
// Cloudflare module needed) and evaluates them in isolation. Read-only; prints a
// report and exits non-zero if any HARD check fails.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '..', 'functions', 'api', '[[path]].js');

// ---- extract a top-level `const NAME = [ ... ];` array literal by brackets ----
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
  const literal = source.slice(open, i);
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${literal});`)();
}

const source = readFileSync(SRC, 'utf8');
const EXERCISES = extractArrayLiteral(source, 'COACHING_EXERCISES');
const TEMPLATES = extractArrayLiteral(source, 'COACHING_TEMPLATES');

// ---- reference facts (COACHING-REFERENCE.md) ----
const PATTERNS = [
  'horizontal_push', 'vertical_push', 'horizontal_pull',
  'vertical_pull', 'squat', 'hinge', 'carry_core',
];
const REQUIRED_FIELDS = [
  'name', 'pattern', 'equipment', 'primary_muscles',
  'joint_tags', 'unilateral', 'regression', 'progression', 'leverage_knob', 'cues',
];
// A cue counts as a stop-rule / ROM limit if it speaks to ending the set or
// bounding the range (§2 bucket 5 & 8 vocabulary).
const STOP_ROM_RX = /\b(stop|end the|only (as|until|to)|no deeper|never|leave \d|do not|don'?t|short of|no further|not past)\b/i;
const isBodyweight = (eq) => /\bbodyweight\b/i.test(eq || '');

const problems = [];   // HARD failures — must fix
const warnings = [];   // soft notes — worth a look
const note = (arr, msg) => arr.push(msg);

// ---- §1 coverage: each pattern present + bodyweight fallback ----
const byPattern = new Map(PATTERNS.map((p) => [p, []]));
const unknownPattern = [];
for (const ex of EXERCISES) {
  if (byPattern.has(ex.pattern)) byPattern.get(ex.pattern).push(ex);
  else unknownPattern.push(ex);
}
for (const ex of unknownPattern) note(problems, `unknown pattern "${ex.pattern}" on "${ex.name}"`);

const coverage = [];
for (const p of PATTERNS) {
  const list = byPattern.get(p);
  const bw = list.filter((e) => isBodyweight(e.equipment));
  coverage.push({ pattern: p, count: list.length, bodyweight: bw.length, names: list.map((e) => e.name) });
  if (list.length === 0) note(problems, `pattern "${p}" has ZERO exercises`);
  else if (list.length < 3) note(warnings, `pattern "${p}" is thin (${list.length} exercises; reference shows ~4 representative)`);
  if (bw.length === 0) note(problems, `pattern "${p}" has NO bodyweight fallback (§1 rule)`);
}

// ---- §1 fields + §2 cues, per exercise ----
for (const ex of EXERCISES) {
  const label = `"${ex.name}"`;
  for (const f of REQUIRED_FIELDS) {
    if (!(f in ex)) { note(problems, `${label} missing field "${f}"`); continue; }
    const v = ex[f];
    if (f === 'unilateral') { if (typeof v !== 'boolean') note(problems, `${label} field "unilateral" must be boolean`); continue; }
    if (f === 'joint_tags') { if (!Array.isArray(v)) note(problems, `${label} field "joint_tags" must be an array`); continue; }
    if (f === 'primary_muscles') {
      if (!Array.isArray(v) || v.length === 0) note(problems, `${label} field "primary_muscles" empty`);
      continue;
    }
    if (f === 'cues') continue; // checked below
    if (typeof v !== 'string' || v.trim() === '') note(problems, `${label} field "${f}" empty`);
  }
  const cues = Array.isArray(ex.cues) ? ex.cues : [];
  if (cues.length === 0) note(problems, `${label} has NO cues (§2: needs up to three, one a stop/ROM rule)`);
  else if (cues.length > 3) note(problems, `${label} has ${cues.length} cues (§2 caps at three)`);
  if (cues.length && !cues.some((c) => STOP_ROM_RX.test(c))) {
    note(problems, `${label} has no stop-rule / ROM-limit cue (§2 requires at least one)`);
  }
}

// ---- consistency: unilateral naming vs flag, joint-tag vocabulary ----
const KNOWN_JOINTS = new Set(['shoulder', 'elbow', 'wrist', 'knee', 'lower back', 'hip', 'ankle', 'neck']);
const UNI_NAME_RX = /\b(one-arm|single-leg|split squat|suitcase|half-kneeling|reverse lunge|side plank)\b/i;
for (const ex of EXERCISES) {
  for (const j of (ex.joint_tags || [])) {
    if (!KNOWN_JOINTS.has(j)) note(warnings, `"${ex.name}" has unrecognised joint tag "${j}"`);
  }
  if (UNI_NAME_RX.test(ex.name) && ex.unilateral !== true) {
    note(warnings, `"${ex.name}" reads unilateral but unilateral=false — confirm the flag`);
  }
}

// ---- §1 garnish check: catalog spine must be pattern lifts, not isolation ----
const GARNISH_RX = /\b(curl|calf|raise|neck|shrug|trap|extension|fly|kickback)\b/i;
const garnish = EXERCISES.filter((e) => GARNISH_RX.test(e.name));
for (const g of garnish) note(warnings, `possible garnish/isolation lift in main catalog: "${g.name}" — reference says these are appended, not seeded as the spine`);

// ---- §4 templates: exist + every named exercise resolves ----
const catalogNames = new Set(EXERCISES.map((e) => e.name));
const wantTemplates = ['full_body', 'upper_lower', 'push_pull_legs', 'recomposition'];
const haveCats = new Set(TEMPLATES.map((t) => t.category));
for (const c of wantTemplates) if (!haveCats.has(c)) note(problems, `missing program template category "${c}" (§4)`);
const unresolved = [];
for (const t of TEMPLATES) {
  for (const ex of (t.exercises || [])) {
    if (!catalogNames.has(ex.name)) unresolved.push(`${t.name} → "${ex.name}"`);
  }
}
for (const u of unresolved) note(problems, `template references an exercise not in the catalog: ${u}`);

// ---- report ----
const line = (s = '') => process.stdout.write(s + '\n');
line('='.repeat(66));
line('  COACHING CATALOG COVERAGE AUDIT — apextraining');
line('='.repeat(66));
line(`  exercises: ${EXERCISES.length}   templates: ${TEMPLATES.length}`);
line('');
line('  Coverage by movement pattern (§1):');
for (const c of coverage) {
  const flag = c.count === 0 ? ' ✗ EMPTY' : c.bodyweight === 0 ? ' ✗ no-bodyweight' : '';
  line(`    ${c.pattern.padEnd(16)} ${String(c.count).padStart(2)} exercises  (${c.bodyweight} bodyweight)${flag}`);
}
line('');
line(`  HARD problems: ${problems.length}`);
for (const p of problems) line(`    ✗ ${p}`);
line('');
line(`  Warnings: ${warnings.length}`);
for (const w of warnings) line(`    • ${w}`);
line('');
line('='.repeat(66));

if (problems.length) {
  line(`  RESULT: FAIL — ${problems.length} hard problem(s). Fix before shipping.`);
  process.exit(1);
} else {
  line('  RESULT: PASS — catalog is coherent against COACHING-REFERENCE §1/§2/§4.');
  process.exit(0);
}
