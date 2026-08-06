# ApexTraining → Cloudflare Migration

Moving off Base44 entirely. The app keeps its React frontend but gets a brand-new,
self-hosted backend on Cloudflare. Fresh database (no data carried over).

## Architecture

| Concern            | Was (Base44)                 | Now (Cloudflare)                              |
| ------------------ | ---------------------------- | --------------------------------------------- |
| Hosting            | base44.app                   | Cloudflare Pages (`dist/`)                    |
| API                | base44 SDK → base44.app/api  | Pages Functions `functions/api/[[path]].js`   |
| Database           | Base44 entity store          | Cloudflare **D1** (SQLite), generic doc store |
| Auth               | Base44 OAuth (redirect)      | Custom email/password + JWT (our `/login`)    |
| File uploads       | Base44 storage               | Cloudflare **R2**                             |
| AI (`InvokeLLM`)   | Base44 hosted LLM            | Pluggable LLM route (stub until key provided) |
| Payments           | Stripe/PayPal on Base44      | **Removed** (per product decision)            |
| 94 Deno functions  | Base44 runtime               | Only non-payment ones re-implemented          |

### Key trick
Instead of rewriting all 233 frontend files, `src/api/base44Client.js` is replaced
with a shim that exposes the **same** interface (`base44.entities.X`, `base44.auth`,
`base44.functions.invoke`, `base44.integrations.Core.*`) but talks to the Cloudflare
backend. Existing pages keep working unchanged.

## Phases

- [x] **P0** — Get the old build compiling; scaffold Cloudflare Pages.
- [x] **P1** — Backend foundation: D1 schema, API router, custom auth, SDK shim, login/register UI.
      Verified locally: register→admin, login, JWT me/updateMe, entity CRUD/filter/sort,
      Admin Dashboard renders authenticated against Cloudflare D1.
- [x] **P2** — Remove payment surfaces. Deleted 9 pages (Payments, Invoices, Packages,
      Storefront, PayPalSuccess, TrainerFinancials, TrainerEarnings, AdminPayouts,
      ClientMarketplace), components/payments + components/trainer-earnings + admin payout/earnings.
      Cleaned nav in Layout/ClientLayout/admin menus, Dashboard earnings widget (→ Total Sessions),
      Settings payment tab, BusinessHub payment links, ClientPortal marketplace toggle.
      Kept TrainerExpenses (bookkeeping, not payment processing). Build green; no dangling refs.
- [x] **P3** — Backend functions re-implemented & verified live (2026-07-14):
      Resend email (invite/resource/reminder templates; test send delivered),
      USDA food search (searchFoods → name/cal/P/C/F), ExerciseDB via AscendAPI
      (searchExercises/getExerciseById/getExerciseData; images+videos),
      Workers AI llama-3.3-70b-fp8-fast (llm route + aiVoiceCoach text analysis),
      webPush (VAPID keys generated; subscribe/unsubscribe stores PushSubscription).
      Signup rules enforced server-side: trainer=beta key, client=invite-only,
      solo=open; signup UI has account-type selector + beta key field.
      9 beta keys seeded idempotently (2 reserved: Max Cooper/maxc3337@gmail.com,
      Wesley Hales). Admins = ADMIN_EMAILS allowlist only (2 admins).
      REMOVED: Voice Trainer (ClientAITrainer page, components/voice, triggers) and
      Notion sync (components/notion, Settings tab, page buttons).
      ExerciseProgressChart rebuilt under components/workouts (was wrongly in voice/).
      Keys in .dev.vars (gitignored); production upload pending `wrangler login`.
- [~] **P4** — GUI overhaul IN PROGRESS. Done: consolidated design system in src/index.css
      (tokens + all legacy card classes restyled flat/clean; removed unimported globals.css);
      PWA foundation (manifest.json, serviceWorker.js w/ offline shell + Web Push handlers,
      icon.svg, ApexCoach branding in index.html); Client "Today" screen rebuilt
      (greeting/streak/workout hero/rings/habit checklist/next session/quick actions/photos);
      client bottom nav → 5 items (Today/Workouts/Nutrition/Progress/More→menu).
      Backend: auto-provision Client record on auth/me for client+independent users.
      Verified: all 3 portals render (mobile 375px + desktop 1440px).
      LIGHT THEME CONVERSION (2026-07-14): tokens flipped light-first (.dark kept for later
      toggle); mass-converted ~140 files (dark hexes→bg-card/secondary, text-white→foreground,
      border-white/*→border, slate/gray-900 fills, bg-black/40 card fills); shells' inline hex
      styles tokenized; OS dark-sync removed (light default); theme-color/manifest light.
      Verified light on: client Today (mobile+desktop), client menu, admin dashboard,
      trainer dashboard, solo dashboard, login.
      BACKEND: server-side data isolation added — admin sees all; trainers only rows they
      own (trainer_id/created_by); clients only their own records; SHARED_TYPES exempt
      (community/recipes/resources/templates). entities/User now maps to users table
      (admin: all; others: self). Verified with 3 roles.
      TODO: page-by-page sweep for stray dark remnants during P5 feature verification.
- [ ] **P5** — Verify every feature end-to-end; deploy to Pages; transfer domain.

## Entities (generic doc store, ~40)
Client, User, Lead, Session, WorkoutPlan, WorkoutLog, MealPlan, MealLog, MealPlanTemplate,
CalorieLog, Recipe, ProgressLog, JournalEntry, Contract, ClientNote, ClientNotebookPage,
Message, Notification, Habit, HabitLog, DailyCompletion, Goal, Resource, FitnessProgram,
FitnessTemplate, FormCheck, SleepLog, StressLog, CommunityPost, TrainerCommunityPost,
TrainerTask, TrainerStats, BugReport, ContactMessage, BetaKey, WaitingList, Onboarding.

**Removed (payment):** Payment, Package, TicketTemplate, TrainerEarnings, TrainerExpense.

## Deploy
```
npm run build
npx wrangler pages deploy        # after: npx wrangler login
```
D1 + R2 bindings and AUTH_SECRET are configured in wrangler.jsonc / Pages dashboard.
