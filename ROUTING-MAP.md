# ApexTraining Routing & Endpoint Structure

**Created:** 2026-09-15
**Purpose:** Map the current routing architecture to identify integration points for exercise DB and program builder features

---

## Architecture Overview

The app uses a **single-file Cloudflare Pages Functions handler** (`functions/api/[[path]].js`) that handles all API routes. This is a catch-all route pattern that processes path segments after `/api/`.

**Main Handler:** `export async function onRequest(context)`
- Parses URL path into segments: `const segs = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);`
- Routes based on `segs[0]` (first segment) and `method`
- Returns JSON responses via helper functions `json()` and `err()`

---

## Current Route Groups

### 1. `/api/auth/*` — Authentication & User Management
**Handler location:** Lines 1663-1873

Endpoints:
- `POST /api/auth/register` — User signup with beta key/invite gating
- `POST /api/auth/login` — Email/password login with brute-force throttling
- `GET /api/auth/me` — Current user profile (auto-provisions Client record)
- `PUT /api/auth/me` — Update user profile
- `DELETE /api/auth/me` — Account deletion (GDPR right to erasure)
- `GET /api/auth/export` — Export all user data (HIPAA/GDPR compliance)
- `GET /api/auth/isAuthenticated` — Auth status check
- `POST /api/auth/logout` — Logout (client-side token removal)

**Integration note:** All user types (trainer/client/independent) flow through here. User object includes `user_type`, `role`, `billing` data.

---

### 2. `/api/entities/:type/:id?` — Generic Entity CRUD
**Handler location:** Lines 1877-1989

**Pattern:** RESTful CRUD for all entity types stored in the `entities` table

Endpoints:
- `GET /api/entities/:type` — List entities (supports `?filter=`, `?sort=`, `?limit=`)
- `POST /api/entities/:type` — Create entity (single or bulk array)
- `GET /api/entities/:type/:id` — Get single entity
- `PUT /api/entities/:type/:id` — Update entity
- `DELETE /api/entities/:type/:id` — Delete entity

**Entity types in use:**
- **Exercise-related:** `CoachingExercise`, `Exercise` (custom user exercises)
- **Program-related:** `FitnessTemplate`, `WorkoutPlan`, `WorkoutLog`
- **Client management:** `Client`, `ClientNote`, `Message`
- **Nutrition:** `MealPlan`, `MealPlanTemplate`, `NutritionLog`, `Recipe`
- **Progress:** `ProgressLog`, `SleepLog`, `StressLog`, `HabitLog`, `JournalEntry`
- **Resources:** `Resource`, `BetaKey`, `ContactMessage`, `PushSubscription`
- **Coaching:** `CoachBriefing`

**Ownership & scoping:**
- Trainers see their own entities + their clients' entities
- Clients see only their own entities
- Admins see everything
- Logic: `ownershipClause()` (lines 196-225), `getScopedEntity()` (lines 384-390)

**⚠️ KEY INTEGRATION POINT:**
Exercise database and program builder will primarily use this endpoint group:
- `CoachingExercise` entities for the master exercise catalog (seeded, read-only)
- `Exercise` entities for user-created custom exercises
- `FitnessTemplate` entities for program templates
- `WorkoutPlan` entities for assigned programs
- `WorkoutLog` entities for tracking completed workouts

---

### 3. `/api/integrations/*` — Third-Party Services
**Handler location:** Lines 1992-2019

Endpoints:
- `POST /api/integrations/upload` — File upload to R2 bucket
- `POST /api/integrations/llm` — Direct LLM invocation (Anthropic/Workers AI)

**Integration note:** Upload endpoint returns public URLs for exercise images/videos when added to custom exercises.

---

### 4. `/api/functions/:name` — Callable Functions (RPC-style)
**Handler location:** Lines 2148-2157
**Function router:** `runFunction()` (lines 471-1079)

This is where **most exercise and program logic currently lives**. Functions are called via:
```
POST /api/functions/:functionName
{ ...payload }
```

**Exercise-related functions:**
- `searchExercises` (lines 590-601) — Search ExerciseDB API (RapidAPI)
- `getExerciseById` (lines 603-628) — Fetch full exercise details with video/images
- `getExerciseData` (lines 630-637) — Reference lists (muscles, body parts, equipment)
- `importFromGoogleSheets` (lines 817-912) — Bulk import exercises from Google Sheets

**Program/coaching functions:**
- `aiVoiceCoach` (lines 675-700) — Post-workout AI analysis
- `aiPersonalizedPlans` (lines 703-724) — AI recovery plan generation
- `coachBriefing` (lines 939-1012) — Daily AI roster triage for trainers

**Nutrition/journal functions:**
- `searchFoods` (lines 563-587) — USDA FoodData search
- `generateJournalPrompt` (lines 727-741) — Rotating reflection prompts
- `summarizeJournalEntry` (lines 745-776) — AI trainer summary
- `generateRecoveryPrescription` (lines 780-813) — Same-day recovery protocol

**Other utility functions:**
- `sendInviteEmail`, `sendResourceEmail`, `sendSessionReminder` (lines 520-557)
- `claimBetaKey` (lines 490-517)
- `getUserById`, `submitContact`, `generatePTForms` (lines 477-934)
- `parseRecipeFromText` (lines 1018-1069) — URL → recipe extraction
- `webPush` (lines 640-673) — Push notification subscriptions

**⚠️ KEY INTEGRATION POINT:**
New program builder features should be added here as functions:
- `buildProgram` — Generate program from parameters (goal, equipment, frequency)
- `substituteExercise` — Find valid substitutions per pattern/constraint
- `progressExercise` — Calculate load/volume progression
- `warmupBuilder` — Generate warm-up sets per tier

---

### 5. `/api/stripe/*` — Billing & Subscriptions
**Handler location:** Lines 2024-2135

Endpoints:
- `POST /api/stripe/webhook` — Stripe webhook (signature-verified)
- `GET /api/stripe/status` — Current subscription status + client count
- `POST /api/stripe/checkout` — Create Checkout session
- `POST /api/stripe/portal` — Create billing portal session

**Integration note:** Enforces client limits on `/api/entities/Client` POST (lines 1915-1941). Beta-key trainers bypass paywall.

---

### 6. `/api/audit` — Audit Log (Admin Only)
**Handler location:** Lines 2137-2146

Endpoints:
- `GET /api/audit?limit=200` — Fetch recent audit log entries

**Integration note:** HIPAA compliance. Logs all entity reads/writes for PHI-bearing types.

---

### 7. `/api/files/:key` — R2 File Serving
**Handler location:** Lines 2160-2169

Fallback public file serving when `PUBLIC_R2_URL` not configured. Streams R2 objects directly.

---

## Database Schema

**Tables:**
- `users` — Authentication + user profiles (columns: `id`, `email`, `password_hash`, `full_name`, `role`, `user_type`, `data` JSON, timestamps)
- `entities` — Generic EAV store (columns: `id`, `entity_type`, `data` JSON, `created_by`, timestamps)
- `audit_log` — HIPAA audit trail (columns: `id`, `actor`, `action`, `target`, `targetId`, `detail`, `created_date`)

**Entity data storage:**
All business objects (exercises, programs, clients, logs) stored as JSON in `entities.data` with `entity_type` discriminator.

**⚠️ SCHEMA INTEGRATION POINT:**
Exercise and program features will store data in the `entities` table:
- `CoachingExercise` — Master exercise catalog (seeded from `COACHING_EXERCISES` array, lines 1295-1514)
- `FitnessTemplate` — Program templates (seeded from `COACHING_TEMPLATES` array, lines 1519-1623)
- Custom `Exercise` and user-built `WorkoutPlan` entities follow the same pattern

**Seeding function:** `seedCoachingContent(env)` (lines 1628-1640) — runs on first DB init

---

## Coaching Content Seed Data

### COACHING_EXERCISES (lines 1295-1514)
**Movement patterns:**
- `horizontal_push` — Bench press, push-up, dip (6 exercises)
- `vertical_push` — Overhead press, pike push-up (5 exercises)
- `horizontal_pull` — Row variations, face pull (6 exercises)
- `vertical_pull` — Pull-up, lat pulldown (5 exercises)
- `squat` — Back squat, split squat, leg press (7 exercises)
- `hinge` — Deadlift, RDL, swing, hip thrust (6 exercises)
- `carry_core` — Carries, planks, anti-rotation (6 exercises)

**Exercise schema (each object):**
```javascript
{
  name: string,
  pattern: 'horizontal_push' | 'vertical_push' | ...,
  equipment: 'barbell' | 'dumbbell' | 'bodyweight' | 'machine' | 'cable' | 'band' | 'kettlebell',
  equipment_detail?: string,  // e.g., 'dumbbells, bench'
  primary_muscles: string[],
  joint_tags: string[],  // Injury/constraint flags
  unilateral: boolean,
  regression: string,  // Exercise name or description
  progression: string,  // Load step, volume, tempo, etc.
  leverage_knob: string,  // How to adjust difficulty
  cues: string[],  // Coaching cues (≥1 must be stop-rule/ROM limit per COACHING-REFERENCE)
}
```

### COACHING_TEMPLATES (lines 1519-1623)
**Programs:**
1. **Beginner Full-Body (3-Day)** — General phase, rotating rep schemes
2. **Upper / Lower Split (4-Day)** — Intermediate, volume-focused
3. **Push / Pull / Legs (6-Day)** — Advanced, hypertrophy block
4. **Strength Focus (4-Day)** — Peaking, low reps, long rest

**Template schema:**
```javascript
{
  name: string,
  category: 'full_body' | 'upper_lower' | 'push_pull_legs' | 'strength',
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  duration_weeks: number,
  days_per_week: number,
  mesocycle_phase: 'general' | 'hypertrophy' | 'strength' | 'peaking',
  description: string,
  exercises: [
    {
      day: number,  // 1-indexed
      name: string,  // Exercise name (must exist in COACHING_EXERCISES or Exercise entities)
      sets: number,
      reps: string,  // e.g., '5', '8-10', '30-45s'
      target_rir: number,  // Reps in reserve (autoregulation)
      rest_seconds: number,
      notes: string,  // Coaching instructions
    }
  ]
}
```

---

## Integration Points for Exercise DB & Program Builder

### ✅ Where to Add New Features

#### 1. **Exercise Library Management**
**Current:** Seeded `CoachingExercise` entities (read-only, system-created)
**Extension points:**
- Add `GET /api/functions/getCoachingExercises` — Filter by pattern, equipment, etc.
- Add `GET /api/functions/substituteExercise` — Find valid swaps per PROGRAMMING-PRINCIPLES
- Existing: Custom exercises via `POST /api/entities/Exercise`

#### 2. **Program Builder**
**Current:** Seeded `FitnessTemplate` entities (read-only templates)
**Extension points:**
- Add `POST /api/functions/buildProgram` — Generate program from:
  - Goal (strength, hypertrophy, general fitness)
  - Frequency (days/week)
  - Equipment available
  - Constraints (injuries, time, unilateral only, etc.)
- Add `POST /api/functions/progressProgram` — Auto-advance load/volume per PROGRAMMING-PRINCIPLES
- Existing: Assign templates via `POST /api/entities/WorkoutPlan`

#### 3. **Warm-up Generator**
**Current:** Seeded warm-up tiers in `seed-warmups-templates.sql`
**Extension points:**
- Add `POST /api/functions/generateWarmup` — Tier-based warm-up (COACHING-REFERENCE §3)
- Returns sets/reps/load% per tier (Tier 1: 50%, Tier 2: 60-70%, Tier 3: 75-85%)

#### 4. **Workout Logging**
**Current:** `POST /api/entities/WorkoutLog`
**Extension:** Link logs to `WorkoutPlan` entities, track adherence, trigger progression logic

---

## Code Quality & Review Notes

### ✅ Strengths
- **Clean routing:** Single entry point, consistent JSON responses
- **Auth & security:** JWT tokens, brute-force throttling, HIPAA audit trail
- **Data model:** Flexible EAV pattern scales to new entity types
- **Coaching content:** Exercise catalog and templates already seeded

### ⚠️ Risks & Issues
1. **Large monolithic file:** 2185 lines in one file makes navigation difficult
   - **Fix:** Extract route handlers into `routes/auth.js`, `routes/entities.js`, `routes/functions.js`
2. **Function router:** `runFunction()` switch is 600+ lines
   - **Fix:** Extract to `functions/` directory, one file per function
3. **No validation layer:** Request bodies parsed but not validated against schemas
   - **Fix:** Add Zod or similar schema validation before entity creation
4. **Seeded data in code:** `COACHING_EXERCISES` and `COACHING_TEMPLATES` are JS arrays
   - **OK for now:** Simplifies versioning, but may want to move to DB-editable content later
5. **ExerciseDB dependency:** Third-party API for exercise search (RapidAPI)
   - **Risk:** API rate limits, cost, downtime
   - **Mitigation:** Seed local exercise catalog is robust fallback

---

## Next Steps for Program Builder

### Phase 1: Exercise Query & Substitution
1. Add `GET /api/functions/getCoachingExercises?pattern=squat&equipment=bodyweight`
2. Add `POST /api/functions/substituteExercise` with constraint validation (PROGRAMMING-PRINCIPLES §4)
3. Read PROGRAMMING-PRINCIPLES.md §2-4 to implement substitution rules

### Phase 2: Program Generation
1. Add `POST /api/functions/buildProgram` that:
   - Takes user input (goal, frequency, equipment, constraints)
   - Selects exercises per pattern distribution (COACHING-REFERENCE §4)
   - Assigns sets/reps/rest per goal (COACHING-REFERENCE §5 table)
   - Returns a `WorkoutPlan` entity ready to save
2. Unit test against COACHING-REFERENCE examples

### Phase 3: Progression & Warm-ups
1. Add `POST /api/functions/progressExercise` (load steps, back-off logic)
2. Add `POST /api/functions/generateWarmup` (tier-based, per COACHING-REFERENCE §3)
3. Hook into `WorkoutLog` POST to auto-trigger progression when target reps hit

---

## File Structure Recommendation

**Current:**
```
functions/
  api/
    [[path]].js  (2185 lines)
```

**Proposed refactor (future):**
```
functions/
  api/
    [[path]].js         (main router, ~100 lines)
    routes/
      auth.js           (auth endpoints)
      entities.js       (generic CRUD)
      billing.js        (Stripe)
      integrations.js   (upload, LLM)
    functions/
      exercises/
        searchExercises.js
        getCoachingExercises.js
        substituteExercise.js
      programs/
        buildProgram.js
        progressProgram.js
        generateWarmup.js
      coaching/
        coachBriefing.js
        aiVoiceCoach.js
      nutrition/
        searchFoods.js
        parseRecipe.js
```

---

**End of routing map. Exercise DB and program builder features plug into:**
1. `runFunction()` for new RPC-style endpoints
2. `/api/entities/CoachingExercise` and `/api/entities/FitnessTemplate` for CRUD
3. Seed data arrays `COACHING_EXERCISES` and `COACHING_TEMPLATES` as source of truth
