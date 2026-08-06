import React, { useState } from "react";
import { Shield, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Lock, FileText, Users, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Section = ({ title, icon: Icon, color, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-accent transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <span className="font-semibold text-foreground text-base">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-3 border-t border-border pt-4">{children}</div>}
    </div>
  );
};

const Item = ({ done, label, detail }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary">
    <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${done ? "text-emerald-400" : "text-muted-foreground"}`} />
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
    </div>
  </div>
);

const Warn = ({ label, detail }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
    <div>
      <p className="text-sm font-medium text-amber-700 dark:text-amber-300">{label}</p>
      {detail && <p className="text-xs text-amber-700/70 dark:text-amber-400/80 mt-0.5">{detail}</p>}
    </div>
  </div>
);

export default function ComplianceSettings() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card rounded-2xl p-5 border border-border">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-foreground">Compliance & Standards</h2>
              <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-xs">Trainer Reference</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Guidelines for HIPAA privacy practices, NASM, and ISSA professional standards. This platform is designed with these best practices in mind. 
              Review regularly to ensure your coaching practice stays compliant.
            </p>
          </div>
        </div>
      </div>

      {/* HIPAA */}
      <Section title="HIPAA — Health Information Privacy" icon={Lock} color="#818cf8" defaultOpen={true}>
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-3">
          <p className="text-xs text-indigo-700 dark:text-indigo-300">
            <strong>Note:</strong> Personal trainers are generally <em>not</em> HIPAA "covered entities." This platform implements HIPAA-aligned <em>technical safeguards</em> (access controls, encryption, audit logging, automatic logoff). Full HIPAA compliance is also organizational: it requires signed Business Associate Agreements with vendors, written policies, workforce training, and risk assessments. If you handle Protected Health Information, consult a compliance professional.
          </p>
        </div>
        <Item done label="Confidential Client Health Information" detail="Health data (injuries, medical notes, PAR-Q) stored on this platform is accessible only to you and the client — never shared publicly." />
        <Item done label="Secure Data Storage & Transmission" detail="All data is encrypted in transit (HTTPS/TLS) and at rest. Passwords are never stored in plain text." />
        <Item done label="Access Controls" detail="Server-side controls ensure clients only see their own data and trainers only see their assigned clients' data — enforced on every request, not just in the interface." />
        <Item done label="Audit Trail" detail="A tamper-resistant audit log records every login, and every record created, updated, or deleted — with the user, timestamp, and originating IP. Admins can review it." />
        <Item done label="Automatic Logoff" detail="Sessions automatically sign out after 30 minutes of inactivity to protect data on unattended devices." />
        <Item done label="Password Security" detail="Passwords require a minimum length and are stored only as salted PBKDF2 hashes — never in plain text or recoverable form." />
        <Item done label="Medical Notes Privacy" detail="Medical notes and injury history are stored in restricted fields visible only to assigned trainers." />
        <Warn label="Business Associate Agreement (BAA)" detail="If you receive medical referrals from a physician's office or health clinic, obtain a signed BAA before sharing any PHI electronically." />
        <Warn label="Do Not Share PHI via Unsecured Channels" detail="Avoid sending client health information via regular SMS or non-encrypted email. Use the in-app messaging system instead." />
        <Warn label="Client Consent" detail="Always obtain written consent (digital signature via Contracts) before collecting sensitive health or medical information." />
        <div className="pt-2">
          <a href="https://www.hhs.gov/hipaa/for-individuals/guidance-materials-for-consumers/index.html" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300">
            <ExternalLink className="w-3 h-3" /> HHS Official HIPAA Consumer Guide
          </a>
        </div>
      </Section>

      {/* NASM */}
      <Section title="NASM — National Academy of Sports Medicine Standards" icon={Heart} color="#34d399">
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-3">
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            NASM-certified trainers are expected to follow the NASM Code of Professional Conduct, operate within their scope of practice, and apply evidence-based programming principles.
          </p>
        </div>
        <Item done label="PAR-Q Screening" detail="Use the built-in PAR-Q form (Client Profile → Assessments) before starting any new client on a program." />
        <Item done label="Client Intake & Goal Setting" detail="Complete the Client Intake Form for every new client to document health history, goals, and contraindications." />
        <Item done label="OPT Model Programming" detail="Workout plans support all OPT phases: Stabilization, Strength Endurance, Hypertrophy, Maximal Strength, and Power." />
        <Item done label="Progressive Overload Tracking" detail="Workout logs track volume load, RIR, and sets/reps over time to ensure safe progressive overload." />
        <Item done label="Medical Release Documentation" detail="Medical Release Form available under Assessments for high-risk clients requiring physician clearance." />
        <Item done label="Client Progress Monitoring" detail="Progress logs, body composition tracking, and performance metrics align with NASM assessment protocols." />
        <Warn label="Scope of Practice" detail="As a personal trainer, do not diagnose medical conditions or prescribe treatments. Refer clients to licensed medical professionals when indicated." />
        <Warn label="Nutrition Scope" detail="NASM CPTs may provide general healthy eating guidance. Do not create clinical dietary plans unless you also hold a registered dietitian (RD) credential." />
        <div className="pt-2">
          <a href="https://www.nasm.org/certified-personal-trainer/code-of-professional-conduct" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-700 dark:text-emerald-300">
            <ExternalLink className="w-3 h-3" /> NASM Code of Professional Conduct
          </a>
        </div>
      </Section>

      {/* ISSA */}
      <Section title="ISSA — International Sports Sciences Association Standards" icon={Users} color="#f59e0b">
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-3">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            ISSA-certified trainers follow the ISSA Ethics Policy and professional conduct guidelines. ISSA emphasizes holistic fitness, nutrition coaching within scope, and documented client programming.
          </p>
        </div>
        <Item done label="Health History Screening" detail="Document client health history using the PAR-Q and Client Intake Form before programming begins." />
        <Item done label="Individualized Programming" detail="Workout and meal plans are assigned per client and can be customized using AI-generated plans as a starting point." />
        <Item done label="Goal Tracking & Milestones" detail="Goal tracking with milestones aligns with ISSA's goal-setting frameworks for client motivation and retention." />
        <Item done label="Habit Coaching Documentation" detail="Habit tracker allows documentation of behavioral interventions — a core ISSA coaching competency." />
        <Item done label="Recovery & Lifestyle Monitoring" detail="Sleep logs, stress logs, and AI recovery plans support ISSA's whole-person approach to fitness." />
        <Item done label="Client Communication Records" detail="In-app messaging creates a documented record of trainer-client communications." />
        <Warn label="Nutrition Credentials" detail="ISSA Nutrition Coach holders may provide structured nutrition guidance. If you are only CPT-certified, keep nutrition advice to general wellness guidelines." />
        <Warn label="Emergency Action Plan" detail="Maintain a written Emergency Action Plan at your training location. Record emergency contacts in each client profile." />
        <div className="pt-2">
          <a href="https://www.issaonline.com/about/code-of-ethics/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-700 dark:text-amber-300">
            <ExternalLink className="w-3 h-3" /> ISSA Code of Ethics
          </a>
        </div>
      </Section>

      {/* General Best Practices */}
      <Section title="General Professional Best Practices" icon={FileText} color="#f472b6">
        <Item done label="Digital Contracts & Waivers" detail="Use the Contracts module to collect signed liability waivers and service agreements before training begins." />
        <Item done label="Session Documentation" detail="Log every session with notes — provides legal protection and improves client outcomes." />
        <Item done label="Continuing Education" detail="Track your NASM/ISSA CEUs and renew certifications on time. Keep copies of your certifications on file." />
        <Warn label="Insurance" detail="Maintain current professional liability (E&O) insurance. Organizations like NASM and ISSA offer member discounts through providers like PHLY or Philadelphia Insurance." />
        <Warn label="Data Retention" detail="Retain client health records for a minimum of 3–7 years (varies by state) even after the client leaves." />
      </Section>
    </div>
  );
}