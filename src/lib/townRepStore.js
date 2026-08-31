// Town Rep Store — the streak engine with a memory.
//
// The pure engine in `townRep.js` counts reps but forgets everything the moment
// the process exits. A streak you can't remember tomorrow isn't a streak — it's
// a mood. This store gives it persistence: log_day() records today, the streak
// is counted off the saved history, and the whole state is written to disk so
// it survives a restart. Miss a day, it resets. Show up, it grows. That's it.
//
// Design rules Apex lives by:
//   - The maths stays PURE — we lean on townRep.js and never re-implement it.
//   - State on disk is plain JSON: human-readable, greppable, no magic.
//   - Persistence is injectable (an `adapter`) so the same store runs on Node's
//     filesystem in a script, or on localStorage in the browser, or in memory
//     for a test. One engine, many homes.

import { dayKey, computeStreak, recentDaysGrid, streakMessage } from './townRep.js';

const STATE_VERSION = 1;

/** A fresh, empty streak state. */
export function emptyState() {
  return { version: STATE_VERSION, logs: [] };
}

/**
 * Normalize whatever came off disk into a valid state object. Corrupt or
 * partial files degrade gracefully to empty rather than crashing the app —
 * a missed rep is recoverable, a hard crash on load is not.
 */
export function normalizeState(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.logs)) {
    return emptyState();
  }
  // Keep only well-formed log entries carrying a day key.
  const logs = raw.logs
    .filter((l) => l && typeof l.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(l.day));
  return { version: STATE_VERSION, logs };
}

/**
 * A persistence adapter is just: { load(): state|null, save(state): void }.
 * Anything that can do those two things can back the store.
 */

/** In-memory adapter — no disk, handy for tests. Seeded optionally. */
export function memoryAdapter(seed = null) {
  let store = seed ? JSON.stringify(seed) : null;
  return {
    load: () => (store ? JSON.parse(store) : null),
    save: (state) => { store = JSON.stringify(state); },
  };
}

/**
 * Node filesystem adapter — writes the state as pretty JSON to `filePath`.
 * Writes atomically (temp file + rename) so a crash mid-write can't shred the
 * streak. Import lazily so this module stays browser-safe.
 */
export async function fileAdapter(filePath) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  return {
    load: () => {
      try {
        if (!fs.existsSync(filePath)) return null;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch {
        return null; // unreadable/corrupt -> treat as fresh
      }
    },
    save: (state) => {
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      const tmp = `${filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n', 'utf8');
      fs.renameSync(tmp, filePath);
    },
  };
}

/**
 * The store. Holds the current state, exposes log_day() and the read-outs, and
 * persists through whatever adapter it was handed.
 *
 * @param {{ load: Function, save: Function }} adapter  persistence backend
 */
export class TownRepStore {
  constructor(adapter) {
    if (!adapter || typeof adapter.load !== 'function' || typeof adapter.save !== 'function') {
      throw new Error('TownRepStore requires an adapter with load() and save().');
    }
    this.adapter = adapter;
    this.state = normalizeState(adapter.load());
  }

  /**
   * Record a rep for a given day (defaults to today). De-duplicated: hammering
   * the button twice in a day still counts as one. Persists immediately.
   *
   * @param {string} [day]  YYYY-MM-DD; defaults to the local calendar day now.
   * @returns {{ day: string, added: boolean, current: number }}
   */
  log_day(day = dayKey()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      throw new Error(`log_day expected a YYYY-MM-DD key, got: ${day}`);
    }
    const already = this.state.logs.some((l) => l.day === day);
    if (!already) {
      this.state.logs.push({ day, logged_at: new Date().toISOString() });
      this.state.logs.sort((a, b) => a.day.localeCompare(b.day));
      this.persist();
    }
    return { day, added: !already, current: this.currentStreak(day) };
  }

  /** Current live streak measured against `todayKey` (defaults to today). */
  currentStreak(todayKey = dayKey()) {
    return computeStreak(this.state.logs, todayKey).current;
  }

  /** Full stats bundle: current, longest, total, loggedToday, atRisk, days... */
  stats(todayKey = dayKey()) {
    return computeStreak(this.state.logs, todayKey);
  }

  /** Last N days as a logged/not grid for a heatmap strip. */
  grid(n = 30, todayKey = dayKey()) {
    return recentDaysGrid(this.state.logs, todayKey, n);
  }

  /** Apex's escalating hype line for the current state. */
  message(todayKey = dayKey()) {
    const s = this.stats(todayKey);
    return streakMessage(s.current, s.loggedToday);
  }

  /** Write current state through the adapter. */
  persist() {
    this.adapter.save(this.state);
  }

  /** Re-read from disk, discarding in-memory state. */
  reload() {
    this.state = normalizeState(this.adapter.load());
    return this;
  }
}

/**
 * Convenience opener for the Node/CLI world: build a file-backed store in one
 * call. `await openFileStore('./data/streak.json')`.
 */
export async function openFileStore(filePath) {
  const adapter = await fileAdapter(filePath);
  return new TownRepStore(adapter);
}
