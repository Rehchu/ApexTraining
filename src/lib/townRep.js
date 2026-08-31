// Town Rep — the streak engine.
//
// The rule is simple, the way Apex likes it: one rep a day. Log it, the streak
// grows. Miss a day, it resets to zero. No excuses, no half-credit. This module
// is PURE — no React, no network, no `Date.now()` baked into the maths — so the
// logic can be reasoned about and unit-tested on its own. The UI passes today's
// date in; the engine just counts.
//
// A "rep" is one TownRepLog entity per user per calendar day. We key days by
// their local YYYY-MM-DD string so a rep logged at 11pm and one at 6am the next
// morning count as two different days, which is what a human expects.

/** Local calendar day as YYYY-MM-DD (NOT UTC — streaks are lived in local time). */
export function dayKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Days between two YYYY-MM-DD keys (b - a), calendar-accurate, DST-safe. */
export function daysBetween(aKey, bKey) {
  const a = new Date(`${aKey}T00:00:00`);
  const b = new Date(`${bKey}T00:00:00`);
  return Math.round((b - a) / 86400000);
}

/** Yesterday's key relative to a given day key. */
export function prevDayKey(key) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

/**
 * Turn a raw list of rep logs into a de-duplicated, sorted set of day keys.
 * Each log is expected to carry either a `day` (YYYY-MM-DD) or a `created_date`
 * (ISO) we can derive the day from. Multiple reps on one day collapse to one —
 * you can't bank days ahead by hammering the button.
 */
export function uniqueDays(logs = []) {
  const set = new Set();
  for (const log of logs) {
    if (!log) continue;
    const key = log.day || (log.created_date ? dayKey(new Date(log.created_date)) : null);
    if (key) set.add(key);
  }
  return [...set].sort();
}

/**
 * Compute streak stats from a set of logged days.
 * @param {Array} logs  raw rep-log entities
 * @param {string} todayKey  the day we're measuring "current" against
 * @returns {{
 *   current: number, longest: number, total: number,
 *   loggedToday: boolean, days: string[], lastDay: string|null,
 *   atRisk: boolean
 * }}
 */
export function computeStreak(logs = [], todayKey = dayKey()) {
  const days = uniqueDays(logs);
  const total = days.length;
  if (total === 0) {
    return { current: 0, longest: 0, total: 0, loggedToday: false, days: [], lastDay: null, atRisk: false };
  }

  // Longest run of consecutive calendar days anywhere in history.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = daysBetween(days[i - 1], days[i]) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const lastDay = days[days.length - 1];
  const loggedToday = days.includes(todayKey);
  const yesterday = prevDayKey(todayKey);

  // The current streak only "counts" if it's still alive — i.e. the most recent
  // logged day is today or yesterday. If the last rep was two+ days ago the
  // streak is dead and current is 0, no mercy.
  let current = 0;
  const streakAlive = lastDay === todayKey || lastDay === yesterday;
  if (streakAlive) {
    current = 1;
    for (let i = days.length - 2; i >= 0; i--) {
      if (daysBetween(days[i], days[i + 1]) === 1) current++;
      else break;
    }
  }

  // At risk = the streak is alive on yesterday's rep but today's isn't in yet.
  // That's the nudge: "you'll lose it if you don't log today."
  const atRisk = streakAlive && !loggedToday;

  return { current, longest, total, loggedToday, days, lastDay, atRisk };
}

/**
 * Build the last N calendar days ending today, each flagged logged/not, for a
 * heatmap-style strip. Returned oldest → newest.
 */
export function recentDaysGrid(logs = [], todayKey = dayKey(), n = 30) {
  const logged = new Set(uniqueDays(logs));
  const out = [];
  let key = todayKey;
  for (let i = 0; i < n; i++) {
    out.push({ day: key, logged: logged.has(key), isToday: key === todayKey });
    key = prevDayKey(key);
  }
  return out.reverse();
}

/**
 * Roll up per-person logs into a town leaderboard, sorted by current streak
 * then total reps. Each entry: { person, current, longest, total, loggedToday }.
 * @param {Object} logsByPerson  map of personName -> rep-log array
 */
export function buildLeaderboard(logsByPerson = {}, todayKey = dayKey()) {
  return Object.entries(logsByPerson)
    .map(([person, logs]) => {
      const s = computeStreak(logs, todayKey);
      return { person, current: s.current, longest: s.longest, total: s.total, loggedToday: s.loggedToday };
    })
    .sort((a, b) => b.current - a.current || b.total - a.total || a.person.localeCompare(b.person));
}

/** A little Apex flavor: escalating hype tied to the current streak. */
export function streakMessage(current, loggedToday) {
  if (current === 0) return loggedToday ? 'Rep in. Day one. Again tomorrow.' : "Zero on the board. Log your rep — no excuses.";
  if (!loggedToday) return `${current}-day streak on the line. Don't break the chain.`;
  if (current < 3) return `${current} days. Consistency is a skill. Keep stacking.`;
  if (current < 7) return `${current} days strong. This is becoming who you are.`;
  if (current < 30) return `${current} days. You're built different now. Hold the line.`;
  if (current < 100) return `${current} days. That's not motivation — that's identity.`;
  return `${current} DAYS. Legendary. The whole town's watching.`;
}
