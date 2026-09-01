// Standalone proof for the entities `filter` param parser — the fix for the
// bug at functions/api/[[path]].js:1544 (raw JSON.parse -> HTTP 500).
// No test framework; run it with:
//   node scripts/filterParse.selfcheck.mjs
// Exits non-zero if any assertion fails.

import { parseFilterParam, ClientError } from '../src/lib/filterParse.js';

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed++; }
  else { failed++; console.error('  FAIL:', name); }
}
function throwsClientError(fn) {
  try { fn(); return false; }
  catch (e) { return e instanceof ClientError && e.isClientError === true && e.status === 400; }
}

// --- absent / empty -> empty filter (no crash, matches old happy path) ---
check('undefined -> {}', JSON.stringify(parseFilterParam(undefined)) === '{}');
check('null -> {}', JSON.stringify(parseFilterParam(null)) === '{}');
check('empty string -> {}', JSON.stringify(parseFilterParam('')) === '{}');

// --- valid JSON objects parse through unchanged ---
check('simple object', JSON.stringify(parseFilterParam('{"status":"active"}')) === '{"status":"active"}');
check('nested value preserved',
  JSON.stringify(parseFilterParam('{"meta":{"tier":"pro"}}')) === '{"meta":{"tier":"pro"}}');
check('array-valued field (IN clause) preserved',
  JSON.stringify(parseFilterParam('{"status":["active","trial"]}')) === '{"status":["active","trial"]}');
check('null-valued field preserved (IS NULL path)',
  JSON.stringify(parseFilterParam('{"archived_at":null}')) === '{"archived_at":null}');

// --- THE BUG: malformed JSON must be a typed 400, never an uncaught throw ---
check('bare word "status=active" -> ClientError 400', throwsClientError(() => parseFilterParam('status=active')));
check('truncated json -> ClientError 400', throwsClientError(() => parseFilterParam('{"status":')));
check('trailing junk -> ClientError 400', throwsClientError(() => parseFilterParam('{"a":1}xyz')));
check('single quotes (not JSON) -> ClientError 400', throwsClientError(() => parseFilterParam("{'a':1}")));

// --- non-object JSON is also rejected (would corrupt the WHERE builder) ---
check('JSON array -> ClientError 400', throwsClientError(() => parseFilterParam('[1,2,3]')));
check('JSON number -> ClientError 400', throwsClientError(() => parseFilterParam('42')));
check('JSON string -> ClientError 400', throwsClientError(() => parseFilterParam('"active"')));
check('JSON null literal -> ClientError 400', throwsClientError(() => parseFilterParam('null')));

// --- error is a real ClientError carrying a helpful message ---
try { parseFilterParam('nope'); }
catch (e) { check('error message mentions "filter"', /filter/i.test(e.message)); }

console.log(`\nfilter-parse self-check: ${passed} passed, ${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
