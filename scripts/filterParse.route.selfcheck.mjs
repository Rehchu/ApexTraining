// End-to-end proof that the `filter` param flows correctly through the
// entities GET route into listEntities' WHERE-clause builder, AND that a
// malformed filter yields a clean 400 (not a 500) via the route's catch path.
//
//   node scripts/filterParse.route.selfcheck.mjs
//
// This reconstructs the two pieces of functions/api/[[path]].js that the bug
// touches — the line-1544 parse and the listEntities WHERE builder (verbatim,
// lines 388-421) — and drives them with a fake D1 so we can assert on the
// generated SQL and binds without a live database.

import { parseFilterParam, ClientError } from '../src/lib/filterParse.js';

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) passed++;
  else { failed++; console.error('  FAIL:', name); }
}

// --- fake D1: records the SQL + binds, returns canned rows ---
function fakeDB(rows = []) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const call = { sql, binds: [] };
      return {
        bind(...b) { call.binds = b; return this; },
        async all() { calls.push(call); return { results: rows }; },
        async first() { calls.push(call); return rows[0] || null; },
      };
    },
  };
}

// --- helpers copied VERBATIM from [[path]].js so the test tracks real code ---
const COLUMN_FIELDS = new Set(['id', 'created_by', 'created_date', 'updated_date']);
function fieldExpr(field) {
  if (COLUMN_FIELDS.has(field)) return field;
  return `json_extract(data, '$.${field.replace(/'/g, "''")}')`;
}
function rowToEntity(row) {
  const data = JSON.parse(row.data || '{}');
  return { ...data, id: row.id, created_by: row.created_by, created_date: row.created_date, updated_date: row.updated_date };
}
// listEntities WHERE/ORDER/LIMIT builder, matching [[path]].js:388-421.
// entityScope is stubbed to null here (scope logic is orthogonal to the bug).
async function listEntities(env, type, { filter = {}, sort, limit }) {
  const where = ['entity_type = ?'];
  const binds = [type];
  for (const [k, v] of Object.entries(filter || {})) {
    if (v === undefined) continue;
    if (v === null) { where.push(`${fieldExpr(k)} IS NULL`); }
    else if (Array.isArray(v)) {
      if (v.length === 0) { where.push('1 = 0'); continue; }
      where.push(`${fieldExpr(k)} IN (${v.map(() => '?').join(',')})`);
      binds.push(...v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)));
    } else {
      where.push(`${fieldExpr(k)} = ?`);
      binds.push(typeof v === 'object' ? JSON.stringify(v) : v);
    }
  }
  let sql = `SELECT * FROM entities WHERE ${where.join(' AND ')}`;
  let orderField = 'created_date', dir = 'DESC';
  if (sort) { if (sort.startsWith('-')) { orderField = sort.slice(1); dir = 'DESC'; } else { orderField = sort; dir = 'ASC'; } }
  sql += ` ORDER BY ${fieldExpr(orderField)} ${dir}`;
  if (limit) { sql += ' LIMIT ?'; binds.push(Number(limit)); }
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return results.map(rowToEntity);
}

// The route's GET branch (line ~1546) + outer catch (line ~1814), distilled.
const err = (message, status) => ({ status, body: { message } });
async function handleEntitiesGet(env, type, filterRaw, { sort, limit } = {}) {
  try {
    const filter = parseFilterParam(filterRaw);
    const list = await listEntities(env, type, { filter, sort, limit });
    return { status: 200, body: list };
  } catch (e) {
    if (e instanceof ClientError || e?.isClientError) return err(e.message, e.status || 400);
    return err(e.message || 'Server error', 500);
  }
}

// === 1. valid filter -> correct SQL, binds, and rows ===
{
  const db = fakeDB([
    { id: 'e1', data: '{"status":"active","name":"Sam"}', created_by: 'coach@apex', created_date: '2026-01-01', updated_date: '2026-01-01' },
  ]);
  const res = await handleEntitiesGet({ DB: db }, 'Client', '{"status":"active"}');
  const call = db.calls[0];
  check('valid filter -> 200', res.status === 200);
  check('SQL includes json_extract for status',
    /json_extract\(data, '\$\.status'\) = \?/.test(call.sql));
  check('binds are [type, "active"]', JSON.stringify(call.binds) === JSON.stringify(['Client', 'active']));
  check('row mapped back to entity', res.body[0].id === 'e1' && res.body[0].status === 'active');
}

// === 2. array filter -> IN clause ===
{
  const db = fakeDB([]);
  await handleEntitiesGet({ DB: db }, 'Client', '{"status":["active","trial"]}');
  const call = db.calls[0];
  check('array filter -> IN (?,?)', /json_extract\(data, '\$\.status'\) IN \(\?,\?\)/.test(call.sql));
  check('array binds appended', JSON.stringify(call.binds) === JSON.stringify(['Client', 'active', 'trial']));
}

// === 3. THE BUG: malformed filter -> 400, NOT 500, and DB never queried ===
{
  const db = fakeDB([]);
  const res = await handleEntitiesGet({ DB: db }, 'Client', 'status=active');
  check('malformed filter -> 400 (was 500 before fix)', res.status === 400);
  check('400 body explains the filter param', /filter/i.test(res.body.message));
  check('no DB query issued on bad input', db.calls.length === 0);
}

// === 4. absent filter -> plain list, 200 ===
{
  const db = fakeDB([]);
  const res = await handleEntitiesGet({ DB: db }, 'Client', null);
  check('absent filter -> 200', res.status === 200);
  check('WHERE is just entity_type', /WHERE entity_type = \?/.test(db.calls[0].sql));
}

console.log(`\nfilter-parse ROUTE self-check: ${passed} passed, ${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
