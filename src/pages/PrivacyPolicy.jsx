import React from "react";
import LegalLayout from "@/components/LegalLayout";

const UPDATED = "July 15, 2026";

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
Your data is stored on **Cloudflare** infrastructure (database and file storage) at globally distributed data centers. We protect it with measures including:
- Passwords hashed with PBKDF2 (never stored in plain text);
- Encryption of data in transit (HTTPS/TLS);
- Signed authentication tokens; and
- Access controls that restrict data to the users and administrators entitled to it.

No system is perfectly secure. While we work hard to protect your information, we cannot guarantee absolute security.

---

## 7. Your Rights & Choices
Depending on where you live (for example, under the EU/UK GDPR or the California CCPA/CPRA), you may have the right to:
- **Access** the personal information we hold about you;
- **Correct** inaccurate information (much of which you can edit directly in the app);
- **Delete** your account and associated personal data;
- **Export** a copy of your data;
- **Object to or restrict** certain processing; and
- **Withdraw consent** where processing is based on consent.

You can delete your account at any time from **Settings → Account**. To exercise other rights, email **privacy@apextraining.dev**. We will not discriminate against you for exercising these rights.

---

## 8. Data Retention
We keep your information for as long as your account is active or as needed to provide the Service. When you delete your account, we delete or de-identify your personal data within a reasonable period, except where we must retain limited information to comply with legal obligations, resolve disputes, or enforce our agreements.

---

## 9. Children's Privacy
The Service is not directed to, and is not intended for, individuals under **18 years of age**. We do not knowingly collect personal information from children. If you believe a minor has provided us information, contact **privacy@apextraining.dev** and we will delete it.

---

## 10. International Users
The Service is operated from the United States and uses globally distributed infrastructure. If you access the Service from outside the U.S., you understand your information may be processed in the U.S. and other countries with different data-protection laws than your own.

---

## 11. Changes to This Policy
We may update this Privacy Policy from time to time. We will revise the "Last updated" date above and, for material changes, provide additional notice. Your continued use of the Service after changes take effect constitutes acceptance.

---

## 12. Contact
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
