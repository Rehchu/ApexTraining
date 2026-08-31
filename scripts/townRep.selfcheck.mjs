// Standalone sanity check for the Town Rep streak engine.
// No test framework required — run it with: node scripts/townRep.selfcheck.mjs
// Exits non-zero if any assertion fails. Apex counts every rep; we count every case.

import {
  dayKey, daysBetween, prevDayKey, uniqueDays,
  computeStreak, recentDaysGrid, buildLeaderboard, streakMessage,
} from '../src/lib/townRep.js';

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed++; }
  else { failed++; console.error('  FAIL:', name); }
}

const T = '2026-03-15'; // "today" for deterministic tests
const logsOn = (...days) => days.map((d) => ({ day: d }));

// --- date helpers ---
check('daysBetween consecutive', daysBetween('2026-03-14', '2026-03-15') === 1);
check('daysBetween across month', daysBetween('2026-02-28', '2026-03-01') === 1);
check('prevDayKey', prevDayKey('2026-03-01') === '2026-02-28');
check('dayKey from Date', dayKey(new Date('2026-03-15T23:00:00')) === '2026-03-15');

// --- dedupe ---
check('uniqueDays collapses dupes', uniqueDays(logsOn('2026-03-15', '2026-03-15', '2026-03-14')).length === 2);
check('uniqueDays from created_date',
  uniqueDays([{ created_date: '2026-03-15T08:00:00Z' }, { created_date: '2026-03-15T20:00:00Z' }]).length === 1);

// --- streak core ---
const empty = computeStreak([], T);
check('empty streak is zero', empty.current === 0 && empty.longest === 0 && empty.total === 0);
check('empty not at risk', empty.atRisk === false);

const today1 = computeStreak(logsOn(T), T);
check('single rep today = streak 1', today1.current === 1 && today1.loggedToday === true);
check('single rep today not at risk', today1.atRisk === false);

const three = computeStreak(logsOn('2026-03-13', '2026-03-14', '2026-03-15'), T);
check('three in a row = 3', three.current === 3);
check('three longest = 3', three.longest === 3);

const yesterdayOnly = computeStreak(logsOn('2026-03-14'), T);
check('logged yesterday keeps streak alive', yesterdayOnly.current === 1);
check('logged yesterday is AT RISK', yesterdayOnly.atRisk === true);
check('logged yesterday not loggedToday', yesterdayOnly.loggedToday === false);

const stale = computeStreak(logsOn('2026-03-10', '2026-03-11'), T);
check('missed 2+ days = dead streak', stale.current === 0);
check('dead streak still remembers longest', stale.longest === 2);
check('dead streak not at risk', stale.atRisk === false);

const gapped = computeStreak(logsOn('2026-03-01', '2026-03-02', '2026-03-03', '2026-03-14', '2026-03-15'), T);
check('gapped: current counts only latest run', gapped.current === 2);
check('gapped: longest is the earlier 3-run', gapped.longest === 3);
check('gapped: total counts all days', gapped.total === 5);

// --- grid ---
const grid = recentDaysGrid(logsOn('2026-03-15', '2026-03-13'), T, 7);
check('grid length', grid.length === 7);
check('grid ends today, marked logged', grid[6].isToday && grid[6].logged);
check('grid ordering oldest->newest', grid[0].day < grid[6].day);

// --- leaderboard ---
const board = buildLeaderboard({
  Apex: logsOn('2026-03-13', '2026-03-14', '2026-03-15'),
  Ctrl: logsOn('2026-03-15'),
  Draco: logsOn('2026-03-10'), // dead streak
}, T);
check('leaderboard sorted by current streak', board[0].person === 'Apex' && board[0].current === 3);
check('leaderboard dead streak sinks', board[board.length - 1].person === 'Draco' && board[board.length - 1].current === 0);

// --- messages ---
check('message: zero, not logged nudges', /no excuses/i.test(streakMessage(0, false)));
check('message: big streak is hype', /LEGENDARY|watching/i.test(streakMessage(150, true)));

console.log(`\nTown Rep self-check: ${passed} passed, ${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
