# ApexTraining GUI Overhaul Spec (P4)

Inspiration: ABC Trainerize, My PT Hub, Everfit. Guiding principle from the trainer:
**"Consumers get simple, easy, efficient, good-looking. AI works in the backend to make
the process quicker and more manageable."** AI assists; it is never the interface.

## Design language (what the big three converge on)

- **Clean, light-first, card-based** layouts; generous whitespace; one accent color.
  Current Apex look is heavy dark/neon glassmorphism — we soften it: keep the dark
  theme as an option, but default to a crisp light theme with the emerald accent.
- **Mobile-first**: bottom tab bar (4–5 items max) + a center "quick log" action.
  Desktop: slim left sidebar, content max-width, 2–3 column card grid.
- **Client home = "Today" screen** (Trainerize/Everfit pattern): today's workout,
  today's meals/macros ring, habit checklist, streak — one scroll, zero hunting.
- **Trainer home = triage dashboard**: who needs attention today (missed workouts,
  new messages, pending check-ins), upcoming sessions, quick actions.
- **Big tap targets, progress rings, streak flames, PR badges** — celebration
  moments (confetti already in deps) but restrained.
- Typography: one sans (Inter), 3 sizes of hierarchy per screen max.

## Rules

1. Every screen must work at 375px and 1440px. Test both.
2. Bottom nav ≤ 5 items per portal; everything else lives in "More" or contextual.
3. AI features appear as small "✨ suggest" affordances inside normal flows —
   never as separate "AI pages" for clients.
4. PWA: installable, offline shell, **Web Push notifications** (VAPID on our
   Cloudflare backend; NotificationSettings UI already exists).

## Feature gaps vs competitors (candidate backlog, post-launch OK)

From **Trainerize**: wearable integrations (Apple Health/Garmin/Fitbit),
MyFitnessPal sync, voice messaging in chat, group chats, client self-booking
into trainer availability, WOD sharing.
From **Everfit**: Autoflow-style automation (onboarding sequences, scheduled
auto-messages, drip programs), leaderboards tied to challenges, step tracking
challenges, rep-equivalency fun facts, per-client feature toggles (Apex has this!).
From **My PT Hub**: custom check-in/assessment forms builder, waivers with
sign-up flows (Apex has contracts/PAR-Q — close), Google Calendar sync,
waiting lists (Apex has WaitingList entity), preloaded program templates.

Already strong in Apex vs competitors: gamification/quests, journaling + AI
insights, recovery prescriptions, CRM/leads kanban, notebooks, bug reporting,
community feeds, beta keys.

## AI backend = Cloudflare Workers AI

Workers AI binding (env.AI) — no external key needed. Free tier: 10,000
neurons/day (~15–25 LLM calls); paid $5/mo for more. Model: llama-3.1-8b for
generation tasks; optionally Anthropic API key later for higher quality.
InvokeLLM route tries: LLM_API_KEY (Anthropic) → env.AI (Workers AI) → stub.

## Portal structure (3 portals, unchanged information architecture)

- **Trainer**: Dashboard · Clients · Schedule · Messages · More(Business Hub,
  Resources, CRM, Contracts, Settings…)
- **Client**: Today · Workouts · Nutrition · Progress · More(Habits, Journal,
  Community, Resources, Messages, Settings…)
- **Solo**: Today · Workouts · Nutrition · Progress · More(Habits, Journal,
  Tools, Settings…)
