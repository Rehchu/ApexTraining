import React from "react";
import LegalLayout from "@/components/LegalLayout";

const UPDATED = "July 23, 2026";

const body = `
## 1. Purpose of This Policy
This Data Policy is a technical companion to our [Privacy Policy](/PrivacyPolicy). It describes, in specific terms, **where your data lives, who processes it on our behalf, and how it flows** through the ApexCoach Service at **https://apextraining.dev**. In case of any conflict, the Privacy Policy governs your legal rights.

---

## 2. Where Your Data Is Stored
ApexCoach runs entirely on **Cloudflare** infrastructure:

- **Application & API** — Cloudflare Pages and Pages Functions (serverless).
- **Database** — Cloudflare **D1** (SQL), which stores your account, profile, and all fitness, nutrition, habit, messaging, and coaching records.
- **File storage** — Cloudflare **R2**, which stores files you upload, such as progress photos and documents.

Cloudflare operates a globally distributed network; your data may be stored and served from data centers in multiple regions to provide performance and reliability.

---

## 3. Categories of Data We Process
| Category | Examples |
| --- | --- |
| Identity & account | name, email, hashed password, account type |
| Health & fitness | workouts, logs, measurements, weight, progress photos |
| Nutrition | meal plans, food and calorie logs, recipes |
| Behavioral | habits, streaks, goals, journal entries, sleep/stress logs |
| Relationship | trainer–client links, leads, sessions |
| Communications | in-app messages, contact and support requests |
| Technical | authentication token, interface preferences, basic usage |

---

## 4. Sub-Processors
We use a small number of third-party providers to deliver specific features. Each receives only the data necessary for its function:

- **Cloudflare, Inc.** — hosting, database (D1), file storage (R2), and AI inference (Workers AI). Data processed: all Service data, as the underlying infrastructure.
- **Cloudflare Workers AI** — generates AI suggestions and summaries. Data processed: the specific workout, roster, or journal text needed to produce a response. Not used to train models beyond serving your request.
- **Resend** — transactional email delivery (client invitations, reminders). Data processed: recipient email address and message content.
- **U.S. Department of Agriculture (USDA) FoodData Central** — nutrition/food lookups. Data sent: your **search terms only** (e.g., "chicken breast"). No account data is shared.
- **ExerciseDB (via RapidAPI)** — exercise library, images, and videos. Data sent: your **search terms only**. No account data is shared.

If we add an optional higher-quality AI provider in the future, we will update this list before enabling it.

We do **not** use analytics-advertising networks, data brokers, or cross-site trackers.

---

## 5. Data Flows
- **You → ApexCoach:** data you enter is transmitted over HTTPS/TLS and written to Cloudflare D1 (or R2 for files).
- **Trainer ↔ Client:** coaching data is shared only within an established trainer–client relationship. Server-side access controls prevent a trainer from reading another trainer's clients.
- **AI features:** when you or your trainer trigger an AI feature, only the relevant slice of data is sent to the AI provider to generate a response, which is then returned and (where applicable) cached to your account.
- **Email/search:** invitations and reminders are sent via Resend; food and exercise searches send only your query terms to the respective provider.

---

## 6. Security Measures
- Passwords hashed with **PBKDF2** — never stored or transmitted in plain text.
- All traffic encrypted in transit via **HTTPS/TLS**.
- Stateless authentication using **signed tokens** with expiry.
- **Ownership-scoped queries**: the API restricts every request to data the requesting user is entitled to.
- Principle of least privilege for administrative access.

---

## 7. Data Retention & Deletion
- Active-account data is retained while your account exists.
- You may delete your account at any time in **Settings → Account**, which removes your personal records from our database (and associated files from R2) within a reasonable period.
- Backups and logs containing limited data may persist for a short, rolling window for reliability and security, after which they are overwritten.
- We may retain minimal records where required to meet legal obligations.

---

## 8. Data Breach Response
If we become aware of a security incident that affects your personal data, we will investigate promptly, take steps to contain and remediate it, and notify affected users and any regulators as required by applicable law.

---

## 9. Your Control Over Your Data
You can view and edit most of your data directly in the app, export a copy, or delete your account. For any data request we cannot fulfill in-app, contact **privacy@apextraining.dev**. See the [Privacy Policy](/PrivacyPolicy) for the full list of your rights.

---

## 10. Contact
- **Email:** privacy@apextraining.dev
- **Website:** https://apextraining.dev
`;

export default function DataPolicy() {
  return (
    <LegalLayout
      title="Data Policy"
      updated={UPDATED}
      intro="A technical, plain-language look at where your data lives and who helps us process it."
      body={body}
    />
  );
}
