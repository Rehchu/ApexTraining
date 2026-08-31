// Town Rep CLI — log a rep and see the streak, from the terminal.
//
//   node scripts/townRep.cli.mjs log            # log today
//   node scripts/townRep.cli.mjs log 2026-03-14 # backfill a specific day
//   node scripts/townRep.cli.mjs show           # just read the streak
//
// State lives at data/townRep.state.json by default (override with TOWNREP_FILE).
// This is the "prove it runs" front door: separate process invocations that all
// read and write the SAME file on disk.

import { openFileStore } from '../src/lib/townRepStore.js';
import { dayKey } from '../src/lib/townRep.js';

const FILE = process.env.TOWNREP_FILE || 'data/townRep.state.json';
const [cmd = 'show', arg] = process.argv.slice(2);

const store = await openFileStore(FILE);

if (cmd === 'log') {
  const day = arg || dayKey();
  const res = store.log_day(day);
  console.log(res.added ? `Rep logged for ${day}.` : `${day} was already in the book.`);
} else if (cmd !== 'show') {
  console.error(`Unknown command "${cmd}". Use: log [YYYY-MM-DD] | show`);
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
