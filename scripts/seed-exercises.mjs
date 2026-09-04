#!/usr/bin/env node
// Standalone seed script for coaching exercises and templates.
// Reads COACHING_EXERCISES and COACHING_TEMPLATES from the worker source and
// seeds them into a local D1 database for development/testing.
//
// Usage:
//   node scripts/seed-exercises.mjs
//
// Requires wrangler and a D1 database binding in wrangler.jsonc.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';

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

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const nowISO = () => new Date().toISOString();

const source = readFileSync(SRC, 'utf8');
const EXERCISES = extractArrayLiteral(source, 'COACHING_EXERCISES');
const TEMPLATES = extractArrayLiteral(source, 'COACHING_TEMPLATES');

console.log(`\n🏋️  Seeding Coaching Content`);
console.log(`   Exercises: ${EXERCISES.length}`);
console.log(`   Templates: ${TEMPLATES.length}\n`);

// Generate SQL statements
const now = nowISO();
const statements = [];

for (const ex of EXERCISES) {
  const id = `cex_${slugify(ex.name)}`;
  const data = JSON.stringify(ex).replace(/'/g, "''"); // SQL escape
  statements.push(
    `INSERT OR IGNORE INTO entities (id, entity_type, data, created_by, created_date, updated_date) VALUES ('${id}', 'CoachingExercise', '${data}', 'system', '${now}', '${now}');`
  );
}

for (const tpl of TEMPLATES) {
  const id = `ftpl_${slugify(tpl.name)}`;
  const data = JSON.stringify(tpl).replace(/'/g, "''"); // SQL escape
  statements.push(
    `INSERT OR IGNORE INTO entities (id, entity_type, data, created_by, created_date, updated_date) VALUES ('${id}', 'FitnessTemplate', '${data}', 'system', '${now}', '${now}');`
  );
}

const sql = statements.join('\n');

// Write to a temp file and execute with wrangler
const tmpFile = join(here, '.seed-temp.sql');
import { writeFileSync, unlinkSync } from 'node:fs';
writeFileSync(tmpFile, sql);

try {
  console.log(`📝 Executing ${statements.length} INSERT statements...\n`);
  execSync(`npx wrangler d1 execute DB --local --file=${tmpFile}`, { stdio: 'inherit' });
  console.log(`\n✅ Seed complete! ${EXERCISES.length} exercises + ${TEMPLATES.length} templates seeded.\n`);
} catch (err) {
  console.error(`\n❌ Seed failed:`, err.message);
  process.exit(1);
} finally {
  unlinkSync(tmpFile);
}
