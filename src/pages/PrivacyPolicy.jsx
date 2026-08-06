import React from "react";
import LegalLayout from "@/components/LegalLayout";

const UPDATED = "July 23, 2026";

const body = `
## 1. Introduction
This Privacy Policy explains how ApexCoach ("we", "us", "our") collects, uses, shares, and protects your personal information when you use the website and application at **https://apextraining.dev** (the "Service"). By using the Service, you agree to the practices described here. If you do not agree, please do not use the Service.

We are the data controller for the personal information processed through the Service.

---

## 2. Information We Collect

**Information you provide directly:**
- **Account data:** name, email address, and password (stored only as a salted cryptographic hash — we never store your password in plain text).
- **Profile data:** account type (solo, client, trainer), business name, bio, avatar, and preferences.
- **Health & fitness data:** workouts, workout logs, exercises, body measurements, weight, progress photos, nutrition and meal logs, habits, sleep and stress logs, goals, and journal entries. Some of this is sensitive health-related information, which we process to provide the Service to you.
- **Communications:** messages you send to trainers or clients, and support or contact requests.
- **Trainer/client relationships:** if you are a trainer, records of clients and leads you create; if you are a client, the trainer who invited you.

**Information collected automatically:**
- **Device & usage data:** basic technical information such as pages viewed and actions taken, used to operate and improve the Service.
- **Local storage:** we use your browser's local storage to keep you signed in (an authentication token) and to remember interface preferences. We do **not** use third-party advertising or cross-site tracking cookies.

---

## 3. How We Use Your Information
We use your information to:
- Provide, maintain, and secure the Service and your account;
- Deliver core features — training, nutrition, habit, progress, scheduling, messaging, and reminders;
- Generate AI-assisted suggestions and summaries **at your or your trainer's request** (see Section 5);
- Send transactional and service emails (for example, client invitations and reminders);
- Send push notifications, if you enable them;
- Detect, prevent, and respond to fraud, abuse, security, and technical issues; and
- Comply with legal obligations.

We do **not** sell your personal information, and we do **not** use your health or fitness data for advertising.

---

## 4. How Your Information Is Shared
- **With your trainer or clients:** if you are a client, the trainer who coaches you can access the training, nutrition, progress, habit, and messaging data associated with your coaching relationship. If you are a trainer, your clients can see the plans and messages you share with them. Trainers cannot access other trainers' clients.
- **Administrators:** platform administrators may access data as needed to operate, support, and secure the Service.
- **Service providers (sub-processors):** we share limited data with the vendors listed in our [Data Policy](/DataPolicy) strictly to run the Service.
- **Legal & safety:** we may disclose information if required by law, or to protect the rights, property, or safety of ApexCoach, our users, or the public.
- **Business transfers:** if ApexCoach is involved in a merger, acquisition, or asset sale, your information may be transferred subject to this Policy.

---

## 5. AI Processing
Certain features send relevant data (such as workout activity or roster summaries) to an AI model to generate suggestions or summaries. We use privacy-respecting inference services and do not authorize them to use your data to train their models beyond providing the response. AI output may be inaccurate and is not professional or medical advice. See our [Data Policy](/DataPolicy) for the specific providers involved.

---

## 6. Data Storage & Security
Your data is stored on **Cloudflare** infrastructure (database and file storage) at globally distributed data centers. We protect it with measures aligned to the HIPAA Security Rule's technical safeguards (45 C.F.R. § 164.312), including:

- **Access control** — every health record is scoped on the server to the people entitled to see it. A trainer can reach only their own clients; one trainer can never reach another trainer's clients, including by guessing a record's address.
- **Authentication** — passwords are hashed with PBKDF2-SHA256 (100,000 iterations, unique per-user salt) and never stored in readable form; sessions use cryptographically signed tokens.
- **Encryption** — data is encrypted in transit (HTTPS/TLS, with HSTS enforced) and encrypted at rest by our infrastructure provider.
- **Audit controls** — we record sign-ins, failed sign-in attempts, lockouts, and each creation, modification, deletion, export, and **view** of a health record, along with who performed it and when.
- **Automatic logoff** — sessions end automatically after 30 minutes of inactivity.
- **Integrity & availability** — repeated failed sign-ins lock an account temporarily to frustrate brute-force attacks.

No system is perfectly secure. While we work hard to protect your information, we cannot guarantee absolute security.

---

## 7. Health Information & HIPAA
Much of what the Service holds is sensitive health information: injuries, medical history, medications, body measurements, and readiness data.

**HIPAA does not apply to everyone who uses the Service.** The federal Health Insurance Portability and Accountability Act applies to "covered entities" — health plans, healthcare clearinghouses, and healthcare providers who transmit health information electronically in connection with certain transactions — and to their "business associates."

- **Most personal trainers are not covered entities.** If you are an independent trainer who does not bill insurance or transmit HIPAA-covered transactions, HIPAA generally does not govern your use of the Service. Your obligations come from your contracts, your certifying body's ethics code, and state law.
- **If you are a covered entity** — for example a clinic, physical therapy practice, or a trainer working under one — and you use the Service to hold protected health information, then ApexCoach may act as your **business associate**, and a **Business Associate Agreement (BAA) must be executed before you place PHI in the Service.** Contact **privacy@apextraining.dev** to request one. Using the Service for PHI without an executed BAA is a breach of these terms and is done at your own risk.
- **Solo athletes** hold their own data. Information you record about yourself is generally not PHI in your hands.

We build to HIPAA's technical safeguards for every account regardless of status, because it is the right standard for health data. That is a design commitment, not a representation that any particular user's use is HIPAA-compliant — administrative and physical safeguards, workforce training, and your own agreements remain your responsibility.

Louisiana separately protects the confidentiality of medical records (see, e.g., **La. R.S. 40:1165.1**). Where you obtain records from a healthcare provider and store them in the Service, you are responsible for having the authorization required to do so.

---

## 8. Your Rights & Choices
Wherever you live, you can do both of the following yourself, immediately, from **Settings → Account**:

- **Export your data** — download a complete, machine-readable copy of your account and every record attached to it.
- **Delete your account** — permanently remove your account and the records it owns. This cannot be undone, so export first if you want a copy.

Depending on where you live (for example, under the EU/UK GDPR or the California CCPA/CPRA), you may also have the right to:
- **Access** the personal information we hold about you;
- **Correct** inaccurate information (much of which you can edit directly in the app);
- **Object to or restrict** certain processing; and
- **Withdraw consent** where processing is based on consent.

To exercise any right not available in the app, email **privacy@apextraining.dev**. We will respond within the time your law requires. **We will not discriminate against you for exercising these rights.** We do not sell your personal information, and we do not share it for cross-context behavioural advertising.

---

## 9. Security Breach Notification
If we discover a breach of the security of the system that compromises unencrypted personal information, we will notify affected users and the appropriate authorities as required by law.

For residents of **Louisiana**, the **Louisiana Database Security Breach Notification Law (La. R.S. 51:3071 et seq.)** governs. We will notify affected Louisiana residents in the most expedient time possible and without unreasonable delay, and **no later than 60 days from discovery** of the breach, unless a law-enforcement agency determines that notification would impede a criminal investigation. Where that law requires it, we will also notify the **Louisiana Attorney General's Consumer Protection Section**, in writing, within the period the statute prescribes. Notice will describe what happened, the categories of information involved, and the steps you can take.

Residents of other states and countries will be notified in accordance with the breach-notification law that applies to them. Where ApexCoach acts as a **business associate** under a BAA, we will notify the covered entity in accordance with the HIPAA Breach Notification Rule (45 C.F.R. §§ 164.400–414) and the terms of that agreement.

---

## 10. Data Retention
We keep your information for as long as your account is active or as needed to provide the Service. When you delete your account, the account and the records it owns are removed immediately.

Two deliberate exceptions:

- **Security audit logs are retained separately and survive account deletion.** They record actions (who did what, and when) rather than the content of your health records, and are kept so that we can investigate security incidents and meet retention expectations for access logs — HIPAA requires covered entities to retain such documentation for **six years** (45 C.F.R. § 164.316(b)(2)).
- **Records we must keep by law** — for example to comply with a legal obligation, resolve a dispute, or enforce our agreements — are retained only for as long as that purpose requires.

Content shared into a coaching relationship (such as a message you sent your trainer, or a plan they assigned you) may remain in the other person's account, since it is also their record.

---

## 11. Children's Privacy
The Service is not directed to, and is not intended for, individuals under **18 years of age**. We do not knowingly collect personal information from children. If you believe a minor has provided us information, contact **privacy@apextraining.dev** and we will delete it.

---

## 12. International Users
The Service is operated from the United States and uses globally distributed infrastructure. If you access the Service from outside the U.S., you understand your information may be processed in the U.S. and other countries with different data-protection laws than your own.

---

## 13. Changes to This Policy
We may update this Privacy Policy from time to time. We will revise the "Last updated" date above and, for material changes, provide additional notice. Your continued use of the Service after changes take effect constitutes acceptance.

---

## 14. Contact
For privacy questions or to exercise your rights:

- **Email:** privacy@apextraining.dev
- **Website:** https://apextraining.dev
`;

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      updated={UPDATED}
      intro="How ApexCoach collects, uses, and protects your personal and health information."
      body={body}
    />
  );
}
