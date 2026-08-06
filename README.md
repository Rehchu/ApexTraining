# ApexCoach — Personal Training Platform

> **"Dedicated to MaxWCooper – No Tiers. No Limits. No Catch."**

A complete coaching platform for personal trainers, their clients, and solo athletes —
training, nutrition, progress, habits, documents, and messaging in one place, with AI
assistance built in. Runs entirely on Cloudflare's edge.

**Live:** [apextraining.dev](https://apextraining.dev)

---

## What it is

ApexCoach is three portals sharing one backend:

| Portal | Who it's for | What they get |
|---|---|---|
| **Trainer** | Coaches running a business | Clients, programming, scheduling, CRM, contracts, resources, business tracking, AI assistant |
| **Client** | People coached by a trainer | Assigned workouts and meals, progress, habits, journal, documents, messaging |
| **Solo** | Independent athletes | The client experience, self-directed — no trainer required |

Two application admins oversee the platform and can preview either portal without
leaving their own account.

---

## Feature overview

### Training
- **Workout builder** — day-by-day programming with sets, reps, RIR, rest, and notes
- **Exercise library** — searchable, with demo images and video (ExerciseDB)
- **Templates** — save any plan and reuse it for future clients
- **Client-added workouts** — coached clients can log extra sessions; the trainer sees them
- **AI form check** — upload a lift video/photo for technique feedback
- **Progress analytics** — per-exercise strength trends over time

### Nutrition
- **Meal planner** — calorie and macro targets, day-by-day meals
- **Real food data** — USDA FoodData Central lookup fills macros automatically
- **AI meal scanner** — photograph a meal, get an estimated calorie and macro breakdown
- **Recipes** — build manually, generate with AI, or import from any recipe URL
- **Shopping lists and pantry** — generated from assigned plans

### Client engagement
- **Progress tracking** — measurements, body composition, photos, and timelapse
- **Habits and streaks** — daily checklists with a focus timer
- **Journal** — rotating reflection prompts; entries are AI-summarised for the trainer with sentiment
- **Recovery & readiness** — daily sleep/stress logging generates a same-day AI recovery protocol
- **Community feeds** — separate trainer and client spaces
- **Messaging** — direct chat with media attachments
- **Push notifications** — web push on mobile and desktop

### Business
- **CRM** — lead pipeline with stages and lead-to-client conversion
- **Scheduling** — weekly calendar, session booking, video sessions
- **Contracts & waivers** — in-app e-signature, PAR-Q, intake, and medical release forms
- **Documents** — everything a trainer sends appears in the client's Documents page
- **Resources** — share files, links, videos, and guides with your own clients
- **Expenses and tasks** — categorised business spending with CSV export
- **Bulk import** — CSV or a link-shared Google Sheet

### AI (Cloudflare Workers AI, no API key required)
Coach briefings, programming and nutrition assistance, meal photo analysis, form
checks, recovery protocols, journal summarisation, recipe extraction, and plan
generation. Optionally point it at the Anthropic API instead by setting `LLM_API_KEY`.

---

## Architecture

Everything runs on Cloudflare — no origin server, no container.

```
React 18 + Vite + Tailwind        →  Cloudflare Pages (static)
functions/api/[[path]].js         →  Pages Function (all /api/* routes)
D1 (SQLite)                       →  users, entities, audit_log
R2                                →  uploads (documents, photos, media)
Workers AI                        →  llama-3.3-70b (text) + llava (vision)
```

Application data uses a single `entities` table (`id`, `entity_type`, JSON `data`,
`created_by`, timestamps), which keeps the schema flexible while every read and write
passes through one server-side authorisation layer.

**Stack:** React 18 · Vite · Tailwind · React Router · TanStack Query · Radix UI ·
Recharts · framer-motion · Cloudflare Pages/Functions/D1/R2/Workers AI

---

## Security & compliance

Built to support HIPAA technical safeguards, with NASM/ISSA-aligned professional
practice built into the coaching workflow.

- **Authentication** — PBKDF2-SHA256 (100,000 iterations, per-user salt); HMAC-SHA256 signed session tokens
- **Authorisation** — every entity read and write is scoped server-side; trainers cannot reach another trainer's clients, and a record cannot be fetched by guessing its id
- **Admin model** — admin status comes solely from the `ADMIN_EMAILS` allowlist, re-checked on every request; accounts cannot self-promote
- **Brute-force protection** — accounts lock for 15 minutes after 10 failed sign-ins
- **Audit trail** — sign-ins, failures, lockouts, record changes, PHI reads, exports, and deletions (§164.312(b)); retained independently of account deletion
- **Automatic sign-out** — 30 minutes idle
- **Transport** — HSTS, strict Content-Security-Policy, `X-Frame-Options: DENY`, `nosniff`, restrictive `Permissions-Policy`; no third-party scripts
- **Data rights** — one-click export of everything held on an account, and true account deletion
- **Secrets** — no credentials in source; all injected as encrypted Cloudflare secrets

Signup is gated by design: trainers need a beta key, clients must be invited by their
trainer, and solo users sign up freely.

> ApexCoach provides fitness coaching tools, not medical advice. Using it in a context
> covered by HIPAA requires a Business Associate Agreement with your infrastructure
> providers and your own administrative and physical safeguards.

---

## Running it yourself

**Prerequisites:** Node 18+, a Cloudflare account, and Wrangler.

```bash
git clone https://github.com/Rehchu/ApexTraining.git
cd ApexTraining
npm install
```

Create the Cloudflare resources once:

```bash
npx wrangler d1 create apextraining
npx wrangler r2 bucket create apextraining-files
```

Put the returned `database_id` into `wrangler.jsonc`, then configure your environment:

```bash
cp .dev.vars.example .dev.vars   # fill in your own values
```

Run it locally (tables are created automatically on first request):

```bash
npm run build
npx wrangler pages dev dist
```

Deploy:

```bash
npm run build
npx wrangler pages deploy dist --project-name=apextraining
```

Set the production secrets (never commit them):

```bash
npx wrangler pages secret put AUTH_SECRET    --project-name=apextraining
npx wrangler pages secret put ADMIN_EMAILS   --project-name=apextraining
npx wrangler pages secret put BETA_KEYS      --project-name=apextraining
# optional integrations
npx wrangler pages secret put RESEND_API_KEY --project-name=apextraining
npx wrangler pages secret put USDA_API_KEY   --project-name=apextraining
npx wrangler pages secret put EXERCISEDB_API_KEY --project-name=apextraining
npx wrangler pages secret put VAPID_PUBLIC_KEY   --project-name=apextraining
npx wrangler pages secret put VAPID_PRIVATE_KEY  --project-name=apextraining
```

`BETA_KEYS` accepts a comma-separated list, where each entry is `KEY`, or
`KEY:Name:email` to reserve a key for one person:

```
ACOACH-XXXXXXXX,ACOACH-YYYYYYYY,COACH-ZZZZZZZZ:Jane Doe:jane@example.com
```

The app runs without any third-party keys — Workers AI covers the AI features, and
integrations degrade gracefully when their key is absent.

---

## Repository layout

```
src/
  pages/          one file per route (auto-registered in pages.config.js)
  components/     feature components, grouped by domain
  api/            backend client
  lib/            auth context, utilities
functions/
  api/[[path]].js the entire backend
public/           static assets, PWA manifest, service worker, security headers
base44/           legacy Base44 export, kept for reference
pet-models-wip/   3D companion models (feature not yet shipped)
```

---

## Project history

ApexCoach began as **FitTrack Pro**, a Python/FastAPI backend with an Electron desktop
client, and was later rebuilt on the Base44 platform. It now runs entirely on
Cloudflare with its own authentication, database, and AI — no platform lock-in and no
per-seat pricing. The earlier implementations remain in this repository's history.

---

## Roadmap

- 3D companion — evolving avatar pets with a journey map and quests (models in progress)
- Wearable integration — Apple Health, Google Fit, Whoop, Oura
- Native mobile shells for iOS and Android
- Group and small-team coaching
- Trainer marketplace for programme templates

---

## Licence

All rights reserved. Currently in private beta.
