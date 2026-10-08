# ApexTraining Routing Architecture
*Complete map of API endpoints, exercise database wiring, and program builder structure*

**Generated:** 2026-09-15
**Source:** `functions/api/[[path]].js` (2185 lines, single-file handler)
**Pattern:** Cloudflare Pages Function — catch-all route handling `/api/*`

---

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Route Structure](#route-structure)
4. [Exercise Database Wiring](#exercise-database-wiring)
5. [Program Builder Wiring](#program-builder-wiring)
6. [Entity System](#entity-system)
7. [Integration Points](#integration-points)

---

## Overview

### Architecture Pattern
- **Single entry point:** `functions/api/[[path]].js` → `export async function onRequest(context)`
- **Path parsing:** `segs = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)`
- **Routing:** Conditional blocks checking `segs[0]`, `segs[1]`, and `method`
- **No framework:** Pure JavaScript with fetch API
- **Data layer:** D1 (SQLite), R2 (files), Workers AI, Anthropic Claude

### Environment Bindings
```javascript
env.DB              // D1 database
env.FILES           // R2 bucket (optional)
env.AUTH_SECRET     // JWT signing secret
env.PUBLIC_R2_URL   // Public R2 base URL
env.LLM_API_KEY     // Anthropic API key (optional)
env.LLM_MODEL       // Anthropic model name
env.STRIPE_SECRET_KEY
env.RESEND_API_KEY
env.USDA_API_KEY
env.EXERCISEDB_API_KEY
env.ADMIN_EMAILS    // Comma-separated admin allowlist
```

---

## Database Schema

### Core Tables
Created on boot via `ensureSchema()` (lines 1224-1246):

#### `users`
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  user_type TEXT,  -- 'trainer' | 'client' | 'independent'
  data TEXT DEFAULT '{}',  -- JSON blob for extensibility
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL
)
```

#### `entities`
Universal data table (EAV pattern):
```sql
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,  -- CoachingExercise, FitnessTemplate, Client, etc.
  data TEXT NOT NULL DEFAULT '{}',  -- All entity fields as JSON
  created_by TEXT,
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL
)
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type)
```

#### `audit_log`
HIPAA-aligned access trail (§164.312(b)):
```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT,
  action TEXT NOT NULL,  -- login, create, read, update, delete, export_data
  target TEXT,           -- entity_type
  target_id TEXT,
  detail TEXT,
  ip TEXT,
  created_date TEXT NOT NULL
)
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor, created_date)
```

### Entity Types

#### Shared/Global Content
```javascript
SHARED_TYPES = [
  'CommunityPost',
  'TrainerCommunityPost',
  'Recipe',
  'FitnessTemplate',      // Program templates (read by all, created by system)
  'MealPlanTemplate',
  'WaitingList',
  'BetaKey',
  'CoachingExercise',     // Exercise catalog (read by all, seeded on boot)
]
```

#### Protected Health Information (PHI)
Reads logged to audit trail:
```javascript
PHI_TYPES = [
  'Client',
  'ClientNote',
  'ProgressLog',
  'JournalEntry',
  'SleepLog',
  'StressLog',
  'Contract',
  'FormCheck',
  'ReadinessLog',
  'HealthMetric',
  'ClientNotebookPage',
]
```

---

## Route Structure

### 1. Authentication: `/api/auth/*`

#### `POST /api/auth/register`
**Handler:** Line 1666-1730
**Gates:**
- Trainers: must present valid `BetaKey`
- Clients: must have been invited (`Client` record with email exists)
- Independents: sign up freely
- ADMIN_EMAILS: bypass all gates

**Flow:**
1. Validate email + password (≥8 chars)
2. Check gates per `user_type`
3. Create user with trial period if trainer
4. Mark beta key as assigned if provided
5. Return JWT + user object

#### `POST /api/auth/login`
**Handler:** Line 1732-1758
**Brute-force protection:** 10 failed attempts = 15-minute lockout (audit log)

#### `GET /api/auth/me`
**Handler:** Line 1763-1784
**Auto-provision:** Creates `Client` entity for client/independent users on first access

#### `PUT /api/auth/me`
**Handler:** Line 1786-1806
**Protected fields:** `id`, `email`, `role`, `user_type`, `password_hash`, `beta_key_*`

#### `GET /api/auth/export`
**Handler:** Line 1811-1832
**GDPR/HIPAA:** Right of access — returns all owned entities as JSON

#### `DELETE /api/auth/me`
**Handler:** Line 1836-1866
**GDPR:** Right to erasure — deletes account + all owned entities

#### `GET /api/auth/isAuthenticated`
**Handler:** Line 1866-1870
Quick token validity check

---

### 2. Entities: `/api/entities/{type}[/{id}]`

**Handler:** Lines 1877-1989
**Universal CRUD** for all entity types (exercises, programs, clients, logs, etc.)

#### Routing Matrix
| Method | Path                  | Action                          |
|--------|----------------------|---------------------------------|
| GET    | `/entities/{type}`    | List entities (filtered, scoped) |
| POST   | `/entities/{type}`    | Create entity (or bulk)         |
| GET    | `/entities/{type}/{id}` | Read single entity             |
| PUT    | `/entities/{type}/{id}` | Update entity (merge)          |
| DELETE | `/entities/{type}/{id}` | Delete entity                  |

#### Special Cases
- **`/entities/User`**: Proxies to `users` table, read-only (managed via `/api/auth`)
- **`Client` creation**: Enforces subscription plan limits (lines 1915-1940)

#### Access Control
**Admin:** See everything
**Non-admin:** Scoped via `ownershipClause()` (lines 196-217):
```javascript
created_by = user.email
OR json_extract(data,'$.trainer_id') = user.id
OR json_extract(data,'$.user_id') = user.id
OR json_extract(data,'$.email') = user.email
OR json_extract(data,'$.client_id') IN (user's client records)
```

#### Filtering
Parses `?filter=field:value,field2:value2` via `parseFilterParam()` (imported from `src/lib/filterParse.js`)

---

### 3. Integrations: `/api/integrations/*`

#### `POST /api/integrations/upload`
**Handler:** Line 1996-2012
**Flow:** File → R2 (if configured) or data URL fallback
**Returns:** `{ url, id }`

#### `POST /api/integrations/llm`
**Handler:** Line 2013-2015
**Purpose:** Direct LLM invocation (text or vision)
**Delegates to:** `invokeLLM(body, env)` (lines 1110-1219)

**LLM Routing:**
1. **Vision path** (if `file_url` or `file_urls` present):
   - **Paid:** Anthropic Claude Sonnet 4 (native vision)
   - **Free:** Workers AI LLaVA (description) → text model (structured output)
2. **Text path:**
   - **Paid:** Anthropic Claude
   - **Free:** Workers AI Llama 3.1

---

### 4. Stripe Billing: `/api/stripe/*`

#### `POST /api/stripe/webhook`
**Handler:** Line 2026-2077
**Events handled:**
- `checkout.session.completed` → Store subscription on user
- `customer.subscription.updated/deleted` → Sync status

#### `GET /api/stripe/status`
**Handler:** Line 2078-2092
Returns subscription state + plan limits

#### `POST /api/stripe/checkout`
**Handler:** Line 2093-2123
Creates Stripe Checkout session for plan upgrade

#### `POST /api/stripe/portal`
**Handler:** Line 2124-2135
Redirects to Stripe billing portal

---

### 5. Audit Log: `/api/audit`

#### `GET /api/audit`
**Handler:** Line 2137-2147
Admin-only audit trail access

---

### 6. Functions (Callable Actions): `/api/functions`

#### `POST /api/functions`
**Handler:** Lines 2148-2159
**Dispatcher:** `runFunction(name, payload, ctx)` (lines 471-1108)

#### Available Functions (Selected)

| Function Name | Purpose | Handler Lines |
|--------------|---------|---------------|
| `claimBetaKey` | Assign beta key to user | 490-517 |
| `sendInviteEmail` | Email client invite | 520-533 |
| `sendResourceEmail` | Share resource via email | 535-545 |
| `sendSessionReminder` | Session reminder email | 547-557 |
| `searchFoods` | USDA FoodData lookup | 563-587 |
| `searchExercises` | ExerciseDB API search | 590-605 |
| `getExerciseById` | Fetch single exercise | 607-620 |
| `getExercisesByPattern` | Filter by movement pattern | 622-636 |
| `getExercisesByEquipment` | Filter by equipment | 638-652 |
| `getDashboardSummary` | Trainer dashboard stats | 957-990 |
| `generateAIRecipe` | LLM recipe generation | 1034-1061 |
| `analyzeFormCheck` | Vision → form feedback | 1063-1088 |

**NOTE:** No dedicated "program builder" function — programs are `FitnessTemplate` entities created/read via `/api/entities/FitnessTemplate`.

---

## Exercise Database Wiring

### Data Source
**Seeded on boot** via `seedCoachingContent(env)` (lines 1628-1640), called from `ensureSchema()`.

### Exercise Catalog: `COACHING_EXERCISES`
**Lines:** 1295-1514
**Count:** 60+ exercises
**Structure:** Aligned with **COACHING-REFERENCE.md §1** (movement patterns)

#### Exercise Schema
```javascript
{
  name: 'Barbell Bench Press',
  pattern: 'horizontal_push',  // Movement pattern (7 total)
  equipment: 'barbell',
  equipment_detail: 'barbell',  // Extended equipment string
  primary_muscles: ['chest', 'front deltoid', 'triceps'],
  joint_tags: ['shoulder', 'elbow'],  // Injury screening
  unilateral: false,
  regression: 'Push-up',  // Easier variation
  progression: 'Load step — add a small increment...',
  leverage_knob: 'Slow the lowering to a 3-count',  // Difficulty tuning
  cues: [
    'Tuck the elbows about 45 degrees...',
    'Keep the natural lower-back arch...',
    'Stop the set when bar speed stalls...'  // Stop-rule (required)
  ]
}
```

#### Movement Patterns (7)
From **PROGRAMMING-PRINCIPLES.md §2**:
1. **horizontal_push** — Barbell Bench, DB Bench, Push-up, Dip, etc.
2. **vertical_push** — Overhead Press, Landmine Press, Pike Push-up
3. **horizontal_pull** — Barbell Row, DB Row, Inverted Row, Face Pull
4. **vertical_pull** — Pull-up, Chin-up, Lat Pulldown
5. **squat** — Back Squat, Goblet Squat, Bulgarian Split Squat, Leg Press
6. **hinge** — Deadlift, RDL, Kettlebell Swing, Hip Thrust
7. **carry_core** — Farmer Carry, Plank, Dead Bug, Pallof Press

#### Bodyweight Fallbacks
Every pattern has ≥1 `equipment: 'bodyweight'` exercise (§1.3 in COACHING-REFERENCE):
- horizontal_push → Push-up
- vertical_push → Pike Push-up
- horizontal_pull → Inverted Row
- vertical_pull → (Pull-up requires bar, but Band Lat Pulldown is minimal-equipment)
- squat → Bodyweight Squat
- hinge → Glute Bridge
- carry_core → Plank, Dead Bug

### Storage
Each exercise is inserted as:
```javascript
id: `cex_${slugify(ex.name)}`  // e.g., "cex_barbell_bench_press"
entity_type: 'CoachingExercise'
data: JSON.stringify(ex)
created_by: 'system'
```

### Access Patterns

#### 1. List All Exercises
```http
GET /api/entities/CoachingExercise
```
Returns full catalog (user-scoped, but `CoachingExercise` is in `SHARED_TYPES` → visible to all).

#### 2. Search by Pattern
```http
GET /api/entities/CoachingExercise?filter=pattern:horizontal_push
```
**Handled by:** `listEntities()` (lines 380-425)
**SQL:** `json_extract(data,'$.pattern') = ?`

#### 3. External API Search
```http
POST /api/functions
{ "name": "searchExercises", "payload": { "query": "bench press" } }
```
**Routes to:** ExerciseDB API (RapidAPI, lines 590-605)
**Returns:** `{ exercises: [{ id, name, imageUrl, gifUrl }] }`

#### 4. Get Exercise by ID (Coaching Catalog)
Direct entity read:
```http
GET /api/entities/CoachingExercise/cex_barbell_bench_press
```

---

## Program Builder Wiring

### Template Catalog: `COACHING_TEMPLATES`
**Lines:** 1519-1621
**Count:** 4 ready-to-ship templates
**Structure:** Aligned with **PROGRAMMING-PRINCIPLES.md §4** (splits) and **COACHING-REFERENCE.md §4** (templates)

#### Template Schema
```javascript
{
  name: 'Beginner Full-Body (3-Day)',
  category: 'full_body',  // full_body | upper_lower | push_pull_legs | recomposition
  difficulty: 'beginner',  // beginner | intermediate
  duration_weeks: 6,
  days_per_week: 3,
  mesocycle_phase: 'general',  // general | hypertrophy | strength
  description: 'The default for anyone new or short on time...',
  exercises: [
    {
      day: 1,
      name: 'Goblet Squat',  // Must match a CoachingExercise name
      sets: 3,
      reps: '5',  // String to allow ranges: '8-10', '30-45s'
      target_rir: 2,  // Reps-in-reserve (0-3)
      rest_seconds: 150,
      notes: 'Heavy day. Work up to a tough set of 5.'
    },
    // ...more exercises
  ]
}
```

#### Templates (4)
1. **Beginner Full-Body (3-Day)** — Rotating rep schemes (5 / 8-10 / 12-15)
2. **Upper/Lower Split (4-Day)** — First split progression, hypertrophy focus
3. **Push/Pull/Legs (3-Day)** — Body-part emphasis, 3×/week or 6×/week
4. **Recomposition Circuit (3-Day)** — Paired movements, short rests (<60s)

#### Parameter Mapping (Goal → Sets/Reps/Rest)
From **COACHING-REFERENCE.md §5**:
| Goal         | Reps  | Sets | Rest (s) | RIR |
|-------------|-------|------|----------|-----|
| Strength    | 1-5   | 4-6  | 180-240  | 1-2 |
| Hypertrophy | 6-12  | 3-5  | 60-120   | 2-3 |
| Endurance   | 12-20 | 2-4  | 30-60    | 3+  |
| Recomp      | 8-15  | 3-4  | 30-60    | 3   |

Templates hardcode these values per their `mesocycle_phase`.

### Storage
Each template is inserted as:
```javascript
id: `ftpl_${slugify(tpl.name)}`  // e.g., "ftpl_beginner_full_body_3_day"
entity_type: 'FitnessTemplate'
data: JSON.stringify(tpl)
created_by: 'system'
```

### Access Patterns

#### 1. List All Templates
```http
GET /api/entities/FitnessTemplate
```
Returns all 4 system templates + any user-created ones.

#### 2. Filter by Category
```http
GET /api/entities/FitnessTemplate?filter=category:upper_lower
```

#### 3. Get Template by ID
```http
GET /api/entities/FitnessTemplate/ftpl_upper_lower_split_4_day
```

#### 4. Create Custom Program
```http
POST /api/entities/FitnessTemplate
{
  "name": "My Custom Program",
  "category": "custom",
  "difficulty": "intermediate",
  "duration_weeks": 8,
  "days_per_week": 4,
  "mesocycle_phase": "hypertrophy",
  "exercises": [
    { "day": 1, "name": "Back Squat", "sets": 4, "reps": "6-8", ... }
  ]
}
```
**Stored as:** User-owned `FitnessTemplate` entity
**Scoped to:** `created_by = user.email`

### Program → Exercise Linkage
**NOT via foreign keys** — exercise names are strings.

#### Resolution Flow (Client-Side)
1. Fetch template: `GET /api/entities/FitnessTemplate/{id}`
2. Extract `exercises[].name` strings
3. Fetch coaching catalog: `GET /api/entities/CoachingExercise`
4. **Match by name:** `exercises.find(ex => ex.name === template.exercises[i].name)`
5. Merge template parameters (sets, reps, rest) with exercise details (cues, pattern, equipment)

**Why string-based?**
- Allows trainers to type custom exercise names not in the catalog
- No referential integrity checks
- UI must handle "exercise not found" gracefully (show name only, no cues)

### Substitution Rules (PROGRAMMING-PRINCIPLES.md §3)
**Pattern-locked:** Substitutions ONLY within the same movement pattern.

**Example:**
- Template says: "Barbell Bench Press" (horizontal_push)
- User lacks barbell → Filter `CoachingExercise` by `pattern:horizontal_push`
- Options: DB Bench, Push-up, Dip, Machine Chest Press
- **NEVER** substitute across patterns (e.g., Pull-up for Bench Press)

**UI Flow:**
1. User clicks "Substitute" on exercise
2. Client fetches: `GET /api/entities/CoachingExercise?filter=pattern:{current_exercise.pattern}`
3. Present filtered list
4. On select, replace `template.exercises[i].name` with new exercise name
5. Optionally save modified template as new `FitnessTemplate` entity

---

## Entity System

### Creation Flow
**Example:** Create a client
```http
POST /api/entities/Client
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "trainer_id": "abc123",
  "status": "active"
}
```

**Handler (lines 1909-1954):**
1. Enforce client limit (subscription check)
2. Generate `id = uid()` (24-char UUID)
3. Strip protected fields (`id`, `created_date`, etc.)
4. Insert: `INSERT INTO entities (id, entity_type, data, created_by, ...) VALUES (?, 'Client', JSON.stringify(fields), user.email, ...)`
5. Audit: `create` action logged
6. Return: `{ ...fields, id, created_by, created_date, updated_date }`

### Read Flow
**Example:** List all clients
```http
GET /api/entities/Client
```

**Handler (lines 1903-1907):**
1. Parse `?filter=status:active&sort=-created_date&limit=50`
2. Call `listEntities(env, 'Client', { filter, sort, limit, user })`
3. **Ownership scoping:** If not admin, add `WHERE (created_by = user.email OR ...)`
4. **Filter clauses:** Convert to `json_extract(data,'$.status') = ?`
5. **Sort:** `ORDER BY json_extract(data,'$.created_date') DESC`
6. Execute D1 query, return `results.map(rowToEntity)`

### Update Flow
**Example:** Update client notes
```http
PUT /api/entities/Client/{id}
{ "notes": "Completed week 1" }
```

**Handler (lines 1967-1979):**
1. Fetch existing row (ownership-scoped)
2. Parse `data` JSON
3. **Merge:** `merged = { ...data, ...body }` (shallow merge)
4. Update: `UPDATE entities SET data=?, updated_date=? WHERE id=?`
5. Audit: `update` action logged
6. Return merged object

**NOTE:** Partial updates supported — only send changed fields.

---

## Integration Points

### 1. Frontend → API
**Client:** `src/api/base44Client.js` (line 8846)
**Pattern:** Wraps `/api/entities`, `/api/auth`, `/api/functions` with typed methods

### 2. API → Exercise Search (External)
**Endpoint:** `POST /api/functions` → `searchExercises`
**Provider:** ExerciseDB (RapidAPI)
**Key:** `env.EXERCISEDB_API_KEY`
**Response shape:**
```javascript
{
  exercises: [
    { id: 'abc', name: 'Bench Press', imageUrl: 'https://...', gifUrl: 'https://...' }
  ]
}
```

### 3. API → LLM (Vision/Text)
**Endpoint:** `POST /api/integrations/llm`
**Use cases:**
- Form check analysis (image → coaching feedback)
- Meal scanner (image → nutrition breakdown)
- Recipe generation (text → structured recipe)
- Post-workout analysis (workout data → recovery tips)

**Routing:**
- **Paid tier:** `env.LLM_API_KEY` → Anthropic Claude Sonnet 4
- **Free tier:** `env.AI` → Workers AI (LLaVA for vision, Llama 3.1 for text)

### 4. API → Stripe
**Webhook:** `POST /api/stripe/webhook` (verified via HMAC)
**Checkout:** `POST /api/stripe/checkout` → Creates session → redirect URL
**Portal:** `POST /api/stripe/portal` → Billing management URL

**Subscription State:**
- Stored in `users.data.billing` JSON field
- Structure:
  ```javascript
  {
    status: 'active',
    plan: 'pro',
    stripe_customer_id: 'cus_...',
    stripe_subscription_id: 'sub_...',
    trial_ends_at: '2026-09-29T...',
    period_end: '2026-10-15T...'
  }
  ```

---

## Summary

### Key Characteristics
1. **EAV architecture** — All domain entities (exercises, programs, clients, logs) share one `entities` table
2. **JSON data column** — Schema-less; fields extracted via `json_extract()` in SQL
3. **String-based linking** — Programs reference exercises by name, not foreign key
4. **Boot-time seeding** — Exercise catalog + program templates inserted on first request (INSERT OR IGNORE)
5. **Pattern-based substitution** — Exercise swaps locked to movement pattern (per PROGRAMMING-PRINCIPLES)
6. **Scoped access** — Non-admins see only their own data + shared content
7. **No dedicated builder API** — Programs are created/modified via generic `/api/entities/FitnessTemplate` CRUD

### Exercise DB Wiring
- **Source:** `COACHING_EXERCISES` array (60+ exercises, lines 1295-1514)
- **Storage:** `entities` table, `entity_type='CoachingExercise'`
- **Access:** `/api/entities/CoachingExercise` (filtered by pattern, equipment, etc.)
- **External search:** `/api/functions` → `searchExercises` (ExerciseDB API)

### Program Builder Wiring
- **Source:** `COACHING_TEMPLATES` array (4 templates, lines 1519-1621)
- **Storage:** `entities` table, `entity_type='FitnessTemplate'`
- **Access:** `/api/entities/FitnessTemplate` (read system templates, create custom)
- **Structure:** Template holds `exercises[]` with sets/reps/rest; client-side resolves names → full exercise objects
- **No server-side builder** — UI composes programs by creating/updating `FitnessTemplate` entities

### Compliance Notes
- **HIPAA §164.312(b):** Audit log tracks all PHI access (read/write)
- **GDPR Art. 15/17:** `/api/auth/export` (data portability), `DELETE /api/auth/me` (right to erasure)
- **Brute-force protection:** 10 failed logins → 15-minute lockout

---

**End of routing map. All endpoints documented.**
