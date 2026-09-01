// REPRODUCTION of the filter-parsing bug at functions/api/[[path]].js:1544
//
// The GET /entities/:type route parsed the `filter` query param like this:
//
//   const filter = url.searchParams.get('filter')
//     ? JSON.parse(url.searchParams.get('filter'))
//     : {};
//
// JSON.parse runs on RAW client input with no try/catch. A malformed value
// (a truncated URL, a hand-typed query, a bad client) throws SyntaxError,
// which bubbles all the way to the outer catch at line 1812 and is returned
// as an opaque HTTP 500 "Server error" — even though the fault is bad *client*
// input, which should be a clean 400.
//
// Run:  node scripts/filterParse.repro.mjs
// This script FAILS (exit 1) while the bug exists, PASSES once fixed.

// Mirror of the pre-fix route logic, exactly as written at line 1544.
function parseFilterOLD(raw) {
  return raw ? JSON.parse(raw) : {};
}

let sawCrash = false;
try {
  // A perfectly ordinary bad param: someone opened ?filter=status without JSON.
  parseFilterOLD('status=active');
  console.log('  no throw for "status=active" (unexpected)');
} catch (e) {
  sawCrash = true;
  console.log(`  REPRO: old parser throws ${e.constructor.name}: ${e.message}`);
  console.log('         -> bubbles to outer catch -> HTTP 500 "Server error"');
}

// Now the intended contract, using the fixed helper (proves the fix once wired).
let fixedOK = true;
try {
  const { parseFilterParam } = await import('../src/lib/filterParse.js');
  const cases = [
    ['', {}],
    [null, {}],
    ['{"status":"active"}', { status: 'active' }],
  ];
  for (const [input, expected] of cases) {
    const got = parseFilterParam(input);
    if (JSON.stringify(got) !== JSON.stringify(expected)) {
      fixedOK = false;
      console.log(`  FIX FAIL: parseFilterParam(${JSON.stringify(input)}) => ${JSON.stringify(got)}, want ${JSON.stringify(expected)}`);
    }
  }
  // Malformed input must throw a *typed* client error, not a raw SyntaxError.
  try {
    parseFilterParam('status=active');
    fixedOK = false;
    console.log('  FIX FAIL: bad filter did not throw');
  } catch (e) {
    if (!e.isClientError) {
      fixedOK = false;
      console.log(`  FIX FAIL: threw ${e.constructor.name}, expected a client error (isClientError)`);
    } else {
      console.log(`  FIX OK: bad filter -> client error "${e.message}" (status ${e.status})`);
    }
  }
} catch (e) {
  fixedOK = false;
  console.log(`  FIX not present yet: ${e.message}`);
}

if (sawCrash && fixedOK) {
  console.log('\nRepro reproduced the crash AND the fixed helper behaves correctly.');
  process.exit(0);
}
console.log('\nRepro incomplete — bug not reproduced or fix not in place.');
process.exit(1);
