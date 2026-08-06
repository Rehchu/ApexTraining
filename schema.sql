-- Cloudflare D1 schema for ApexTraining (Base44-free)
-- Generic document store: every Base44 "entity" is a row in `entities`,
-- keyed by entity_type, with its fields in a JSON blob.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  role          TEXT DEFAULT 'user',          -- 'admin' | 'user'
  user_type     TEXT,                         -- 'trainer' | 'client' | 'independent'
  data          TEXT DEFAULT '{}',            -- JSON: everything else (business_name, avatar, prefs…)
  created_date  TEXT NOT NULL,
  updated_date  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entities (
  id           TEXT PRIMARY KEY,
  entity_type  TEXT NOT NULL,
  data         TEXT NOT NULL DEFAULT '{}',    -- JSON blob of all fields
  created_by   TEXT,                          -- user id/email of creator
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_type_created ON entities(entity_type, created_date);
CREATE INDEX IF NOT EXISTS idx_entities_created_by ON entities(created_by);
