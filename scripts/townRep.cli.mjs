// Town Rep CLI — log a rep and see the streak, from the terminal.
//
//   node scripts/townRep.cli.mjs log            # log today
//   node scripts/townRep.cli.mjs log 2026-03-14 # backfill a specific day
//   node scripts/townRep.cli.mjs show           # just read the streak
//   node scripts/townRep.cli.mjs week [N]        # render the last N days (default 28)
//
// State lives at data/townRep.state.json by default (override with TOWNREP_FILE).
// This is the "prove it runs" front door: separate process invocations that all
// read and write the SAME file on disk.

import { openFileStore } from '../src/lib/townRepStore.js';
import { dayKey } from '../src/lib/townRep.js';

const FILE = process.env.TOWNREP_FILE || 'data/townRep.state.json';
const [cmd = 'show', arg] = process.argv.slice(2);

const store = await openFileStore(FILE);

/**
 * Render the recent-days grid as a visible heatmap strip: one glyph per day,
 * grouped into weeks with the week's start date. `#` = rep logged, `·` = missed,
 * and today is bracketed so you can see the streak breathing. This surfaces the
 * store's grid() read-out — the same data a browser heatmap would draw.
 */
function renderWeeks(n) {
  const grid = store.grid(n); // oldest -> newest, [{ day, logged, isToday }]
  const glyph = (cell) =>
    cell.isToday ? (cell.logged ? '[#]' : '[ ]') : (cell.logged ? ' # ' : ' · ');

  const lines = [];
  for (let i = 0; i < grid.length; i += 7) {
    const week = grid.slice(i, i + 7);
    const strip = week.map(glyph).join('');
    const logged = week.filter((c) => c.logged).length;
    lines.push(`  ${week[0].day}  ${strip}   ${logged}/${week.length}`);
  }
  return lines.join('\n');
}

if (cmd === 'log') {
  const day = arg || dayKey();
  const res = store.log_day(day);
  console.log(res.added ? `Rep logged for ${day}.` : `${day} was already in the book.`);
} else if (cmd === 'week') {
  const n = Math.max(1, Math.min(371, parseInt(arg, 10) || 28));
  console.log('');
  console.log(`  Last ${n} days   ( # logged   · missed   [ ] today )`);
  console.log('');
  console.log(renderWeeks(n));
} else if (cmd !== 'show') {
  console.error(`Unknown command "${cmd}". Use: log [YYYY-MM-DD] | show | week [N]`);
  process.exit(2);
}

const s = store.stats();
console.log('');
console.log(`  Current streak : ${s.current} day(s)`);
console.log(`  Longest streak : ${s.longest} day(s)`);
console.log(`  Total reps     : ${s.total}`);
console.log(`  Logged today   : ${s.loggedToday ? 'yes' : 'no'}${s.atRisk ? '  (AT RISK — log today!)' : ''}`);
console.log('');
console.log(`  ${store.message()}`);
console.log('');
console.log(`  (state: ${FILE})`);
