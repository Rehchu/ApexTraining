// Safe parsing for the `filter` (and similarly-shaped) query params used by the
// entities API. Base44 clients pass filters as a URL-encoded JSON object, e.g.
//   GET /api/entities/Client?filter={"status":"active"}
//
// The original route called JSON.parse() directly on the raw param. Malformed
// input (a truncated URL, a hand-typed query, a buggy client) threw SyntaxError
// that surfaced as an opaque HTTP 500. Bad *client* input deserves a clean 400,
// so this helper parses defensively and throws a typed, catchable error.

// A small error the route layer recognises and maps to a 400 response.
export class ClientError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ClientError';
    this.isClientError = true;
    this.status = status;
  }
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Parse a `filter` query-param value into a plain filter object.
 * @param {string|null|undefined} raw  the raw query-param string
 * @returns {object} the parsed filter, or {} when absent/empty
 * @throws {ClientError} when the value is present but not a valid JSON object
 */
export function parseFilterParam(raw) {
  if (raw === undefined || raw === null || raw === '') return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ClientError('Invalid "filter" parameter: expected URL-encoded JSON.');
  }
  // A filter must be a set of field/value pairs. Arrays, numbers, strings and
  // null would otherwise slip into the WHERE-clause builder and misbehave.
  if (!isPlainObject(parsed)) {
    throw new ClientError('Invalid "filter" parameter: expected a JSON object.');
  }
  return parsed;
}
