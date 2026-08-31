// Standalone proof for the Town Rep STORE — log_day(), streak counting, and
// real disk persistence. No test framework; run it with:
//   node scripts/townRepStore.selfcheck.mjs
// Exits non-zero if any assertion fails. Writes to a temp file and cleans up.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  TownRepStore, memoryAdapter, openFileStore,
  emptyState, normalizeState,
} from '../src/lib/townRepStore.js';

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed++; }
  else { failed++; console.error('  FAIL:', name); }
}

// --- normalize / empty ---
check('emptyState is version 1, no logs', emptyState().version === 1 && emptyState().logs.length === 0);
check('normalize garbage -> empty', normalizeState(null).logs.length === 0 && normalizeState(42).logs.length === 0);
check('normalize drops malformed logs',
  normalizeState({ logs: [{ day: '2026-03-15' }, { day: 'nope' }, {}, null] }).logs.length === 1);

// --- in-memory store: log_day + streak ---
const mem = new TownRepStore(memoryAdapter());
const r1 = mem.log_day('2026-03-13');
check('first log_day is added', r1.added === true);
const dup = mem.log_day('2026-03-13');
check('same day again is de-duped', dup.added === false);
mem.log_day('2026-03-14');
const r3 = mem.log_day('2026-03-15');
check('three consecutive days = streak 3', r3.current === 3);
check('total unique days = 3', mem.stats('2026-03-15').total === 3);

// missing a day kills the current streak
const mem2 = new TownRepStore(memoryAdapter());
mem2.log_day('2026-03-10');
mem2.log_day('2026-03-11');
check('stale streak (2+ days gap) is dead', mem2.currentStreak('2026-03-15') === 0);
check('...but longest is remembered', mem2.stats('2026-03-15').longest === 2);

// --- REAL DISK PERSISTENCE: the whole point ---
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'townrep-'));
const file = path.join(tmpDir, 'nested', 'streak.json'); // nested dir must be created
try {
  const storeA = await openFileStore(file);
  storeA.log_day('2026-03-14');
  storeA.log_day('2026-03-15');
  check('state file was written to disk', fs.existsSync(file));

  const onDisk = JSON.parse(fs.readFileSync(file, 'utf8'));
  check('disk JSON has both days', onDisk.logs.length === 2);
  check('disk JSON is versioned', onDisk.version === 1);
  check('disk logs carry a timestamp', typeof onDisk.logs[0].logged_at === 'string');

  // Fresh store, same file — the streak must SURVIVE the restart.
  const storeB = await openFileStore(file);
  check('reopened store recovers 2 days', storeB.stats('2026-03-15').total === 2);
  check('reopened store recovers streak of 2', storeB.currentStreak('2026-03-15') === 2);

  // Logging today on the reopened store extends and re-persists.
  storeB.log_day('2026-03-16');
  const storeC = await openFileStore(file);
  check('extension persisted (streak now 3)', storeC.currentStreak('2026-03-16') === 3);

  // Corrupt the file on disk -> store degrades to empty, does not throw.
  fs.writeFileSync(file, '{ not valid json ', 'utf8');
  const storeD = await openFileStore(file);
  check('corrupt file loads as empty, no crash', storeD.stats('2026-03-16').total === 0);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// --- message flavor still wired through ---
const mem3 = new TownRepStore(memoryAdapter());
mem3.log_day('2026-03-15');
check('message reflects a logged rep', /day one|consistency|stacking/i.test(mem3.message('2026-03-15')));

console.log(`\nTown Rep STORE self-check: ${passed} passed, ${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
