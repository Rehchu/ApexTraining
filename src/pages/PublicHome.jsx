import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import { motion } from "framer-motion";
import {
  Menu, X, Dumbbell, Utensils, LineChart, CheckSquare, Sparkles,
  MessageCircle, Users, FileText, ChevronRight, ShieldCheck, Brain,
  Camera, HeartPulse, CalendarDays, ArrowRight, Check, Lock,
} from "lucide-react";

const PORTALS = [
  {
    tag: "For trainers",
    title: "Run the whole business",
    text: "Programming, nutrition, scheduling, contracts, and client management in one place — with no per-client fee eating your margin.",
    points: ["Client roster & CRM pipeline", "Week-by-week programme builder", "Contracts, waivers & PAR-Q e-sign", "AI briefing on who needs attention"],
    icon: Users,
    accent: "from-emerald-500 to-teal-600",
  },
  {
    tag: "For clients",
    title: "Know exactly what to do",
    text: "Your coach's plan on your phone, with demo videos for every movement and one-tap logging that reports straight back to them.",
    points: ["Today's workout, ready to start", "Meal plans with real macros", "Photo progress & timelapse", "Message your coach anytime"],
    icon: Dumbbell,
    accent: "from-sky-500 to-indigo-600",
  },
  {
    tag: "For solo athletes",
    title: "Coach yourself properly",
    text: "Everything the coached experience gives you, self-directed. Build your own plans, track everything, let the AI fill the gaps.",
    points: ["Build your own programs", "AI meal scanner & recipes", "Habits, streaks & focus timer", "Recovery readiness scoring"],
    icon: LineChart,
    accent: "from-orange-500 to-rose-600",
  },
];

const FEATURES = [
  { icon: Dumbbell, title: "Workout builder", text: "Programme week by week with sets, reps, RIR, and rest. Search a full exercise library with demo images and video." },
  { icon: Utensils, title: "Nutrition planning", text: "Calorie and macro targets with real USDA food data, recipes, shopping lists, and pantry tracking." },
  { icon: Camera, title: "AI meal scanner", text: "Photograph any meal and get an estimated calorie and macro breakdown in seconds." },
  { icon: Brain, title: "AI form check", text: "Upload a lift and get technique feedback on setup, bar path, depth, and tempo." },
  { icon: HeartPulse, title: "Recovery & readiness", text: "Daily sleep and stress logging turns into a same-day protocol: train hard, back off, or rest." },
  { icon: LineChart, title: "Progress tracking", text: "Weight, measurements, body composition, and photo timelapse — charts build themselves." },
  { icon: CheckSquare, title: "Habits & streaks", text: "Daily habit checklists, streaks, and a focus timer for training or meal prep." },
  { icon: CalendarDays, title: "Scheduling", text: "Book sessions on a weekly calendar that syncs straight to your client's app, with video calls built in." },
  { icon: FileText, title: "Contracts & documents", text: "Send agreements, waivers, PAR-Q, and medical releases. Clients sign in-app; everything is stored." },
  { icon: MessageCircle, title: "Messaging & community", text: "Direct coach-to-client chat with media, plus community feeds for trainers and clients." },
  { icon: Sparkles, title: "AI assistant", text: "Draft programmes, plan nutrition, and get business advice — then save it straight to a client." },
  { icon: ShieldCheck, title: "Built for privacy", text: "Every record is access-scoped server-side. Trainers never see another trainer's clients." },
];

const SECURITY = [
  "Encrypted in transit and at rest",
  "Access-scoped health records",
  "Full audit trail of every access",
  "Automatic sign-out when idle",
  "One-click data export",
  "True account deletion",
];

function Section({ children, className = "" }) {
  return <section className={`max-w-6xl mx-auto px-4 sm:px-6 ${className}`}>{children}</section>;
}

export default function PublicHome() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const goToLogin = () => navigate(createPageUrl("Login"));

  const fade = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ---------------------------------------------------------------- Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">ApexCoach</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#portals" className="text-sm font-medium text-muted-foreground hover:text-foreground transition">Who it's for</a>
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition">Features</a>
            <a href="#security" className="text-sm font-medium text-muted-foreground hover:text-foreground transition">Security</a>
            <Link to={createPageUrl("About")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition">About</Link>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button onClick={goToLogin} className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-accent transition">
              Log in
            </button>
            <button onClick={goToLogin} className="px-4 py-2 rounded-xl text-sm font-semibold bg-foreground text-background hover:opacity-90 transition">
              Get started
            </button>
          </div>

          <button className="md:hidden p-2 -mr-2" onClick={() => setMobileMenuOpen(v => !v)} aria-label="Menu">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-1">
            {[["Who it's for", "#portals"], ["Features", "#features"], ["Security", "#security"]].map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                className="block py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">{label}</a>
            ))}
            <Link to={createPageUrl("About")} className="block py-2.5 text-sm font-medium text-muted-foreground">About</Link>
            <div className="pt-3 flex flex-col gap-2">
              <button onClick={goToLogin} className="w-full py-2.5 rounded-xl text-sm font-semibold border border-border">Log in</button>
              <button onClick={goToLogin} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-foreground text-background">Get started</button>
            </div>
          </div>
        )}
      </nav>

      {/* --------------------------------------------------------------- Hero */}
      <header className="relative overflow-hidden">
        {/* Ambient glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[52rem] h-[52rem] rounded-full bg-emerald-500/10 blur-[120px]" />
          <div className="absolute top-32 -right-40 w-[34rem] h-[34rem] rounded-full bg-sky-500/10 blur-[110px]" />
        </div>

        <Section className="pt-20 pb-16 sm:pt-28 sm:pb-24 text-center">
          <motion.div initial="hidden" animate="show" variants={fade}>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Private beta — trainers join by invite
            </span>
          </motion.div>

          <motion.h1
            initial="hidden" animate="show" variants={fade} transition={{ delay: 0.05 }}
            className="mt-7 text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]"
          >
            Coaching that actually
            <span className="block bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 bg-clip-text text-transparent">
              moves the needle.
            </span>
          </motion.h1>

          <motion.p
            initial="hidden" animate="show" variants={fade} transition={{ delay: 0.1 }}
            className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Training, nutrition, recovery, and accountability in one platform — with AI doing
            the busywork so coaches can coach and athletes can train.
          </motion.p>

          <motion.div
            initial="hidden" animate="show" variants={fade} transition={{ delay: 0.15 }}
            className="mt-9 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <button
              onClick={goToLogin}
              className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-base font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-shadow"
            >
              Start training free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <a
              href="#portals"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-base font-bold border border-border bg-card hover:bg-accent transition"
            >
              See how it works
            </a>
          </motion.div>

          <motion.p
            initial="hidden" animate="show" variants={fade} transition={{ delay: 0.2 }}
            className="mt-6 text-sm text-muted-foreground"
          >
            Free for solo athletes · Clients join by coach invite · No card required
          </motion.p>

          {/* Product glance */}
          <motion.div
            initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-left"
          >
            {[
              { k: "Today's session", v: "Push · Upper A", s: "6 exercises · 48 min", i: Dumbbell, c: "text-emerald-500" },
              { k: "Nutrition", v: "1,980 kcal", s: "182p · 168c · 62f", i: Utensils, c: "text-orange-500" },
              { k: "Readiness", v: "Train hard", s: "Sleep 7.8h · Stress 3", i: HeartPulse, c: "text-sky-500" },
              { k: "Streak", v: "14 days", s: "Habits 4/4 today", i: CheckSquare, c: "text-violet-500" },
            ].map(({ k, v, s, i: Icon, c }) => (
              <div key={k} className="glass-card rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Icon className={`w-3.5 h-3.5 ${c}`} /> {k}
                </div>
                <div className="mt-2.5 text-lg sm:text-xl font-extrabold tracking-tight">{v}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s}</div>
              </div>
            ))}
          </motion.div>
          <p className="mt-3 text-xs text-muted-foreground">Illustrative view of a training day.</p>
        </Section>
      </header>

      {/* ------------------------------------------------------------ Portals */}
      <Section className="py-20 sm:py-24" id="portals">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Three ways in.</h2>
          <p className="mt-3 text-muted-foreground text-lg">
            One platform, shaped to whoever's using it — the coach running a business, the client
            following a plan, or the athlete doing it alone.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {PORTALS.map(({ tag, title, text, points, icon: Icon, accent }) => (
            <div key={tag} className="glass-card rounded-3xl p-7 flex flex-col">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span className="mt-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{tag}</span>
              <h3 className="mt-1.5 text-xl font-extrabold tracking-tight">{title}</h3>
              <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">{text}</p>
              <ul className="mt-5 space-y-2.5 flex-1">
                {points.map(p => (
                  <li key={p} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                    <span className="text-muted-foreground">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------------------- AI band */}
      <div className="border-y border-border bg-card/50">
        <Section className="py-20 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-4 h-4" /> AI, where it earns its place
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                It does the admin.<br />You do the coaching.
              </h2>
              <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                No gimmicks — the AI handles the parts that eat your evening: reading the day's data,
                estimating macros from a photo, drafting the first version of a plan, and telling an
                athlete whether today is a push day or a rest day.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <button onClick={goToLogin} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold bg-foreground text-background hover:opacity-90 transition">
                  Try it free <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { i: Sparkles, t: "Coach's briefing", d: "Open the day to a summary of who's on track and who's slipping." },
                { i: Camera, t: "Meal from a photo", d: "Snap a plate, get calories and macros without weighing a thing." },
                { i: Brain, t: "Form feedback", d: "Upload a set and get specific cues on what to fix." },
                { i: HeartPulse, t: "Recovery protocol", d: "Sleep and stress in, a same-day training decision out." },
              ].map(({ i: Icon, t, d }) => (
                <div key={t} className="glass-card rounded-2xl p-5">
                  <Icon className="w-5 h-5 text-emerald-500" />
                  <h4 className="mt-3 font-bold text-sm">{t}</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* ----------------------------------------------------------- Features */}
      <Section className="py-20 sm:py-24" id="features">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Everything, actually built.</h2>
          <p className="mt-3 text-muted-foreground text-lg">
            Not a roadmap. These ship today, on every device, in light or dark.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="glass-card rounded-2xl p-6 group">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="mt-4 font-bold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ----------------------------------------------------------- Security */}
      <div className="border-t border-border bg-card/50" id="security">
        <Section className="py-20 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Lock className="w-4 h-4" /> Privacy by design
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                Health data deserves better than an afterthought.
              </h2>
              <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                Coaching means holding injuries, medical history, and body data. ApexCoach is built to
                HIPAA technical safeguards, follows NASM and ISSA scope-of-practice boundaries, and
                keeps every trainer's clients sealed off from every other trainer's.
              </p>
              <Link
                to={createPageUrl("PrivacyPolicy")}
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:gap-2.5 transition-all"
              >
                Read the privacy policy <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="glass-card rounded-3xl p-7">
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
              <ul className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-3.5">
                {SECURITY.map(s => (
                  <li key={s} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                    <span className="text-muted-foreground">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      </div>

      {/* ---------------------------------------------------------------- CTA */}
      <Section className="py-20 sm:py-28">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-emerald-500 to-teal-700 px-7 py-16 sm:px-14 sm:py-20 text-center">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="relative">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Your next session starts here.
            </h2>
            <p className="mt-4 text-emerald-50 text-lg max-w-xl mx-auto">
              Free for solo athletes. Coaches join the beta by invite — bring your clients with you.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={goToLogin} className="px-8 py-3.5 rounded-2xl font-bold bg-white text-emerald-700 hover:bg-emerald-50 transition shadow-xl">
                Create your account
              </button>
              <Link to={createPageUrl("Contact")} className="px-8 py-3.5 rounded-2xl font-bold border border-white/40 text-white hover:bg-white/10 transition">
                Request a trainer invite
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------- Footer */}
      <footer className="border-t border-border">
        <Section className="py-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-white" />
                </div>
                <span className="font-extrabold tracking-tight">ApexCoach</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Coaching software for trainers, their clients, and athletes who train alone.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
              <div>
                <h4 className="font-bold mb-3">Product</h4>
                <ul className="space-y-2.5 text-muted-foreground">
                  <li><a href="#features" className="hover:text-foreground transition">Features</a></li>
                  <li><a href="#portals" className="hover:text-foreground transition">Who it's for</a></li>
                  <li><a href="#security" className="hover:text-foreground transition">Security</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-3">Company</h4>
                <ul className="space-y-2.5 text-muted-foreground">
                  <li><Link to={createPageUrl("About")} className="hover:text-foreground transition">About</Link></li>
                  <li><Link to={createPageUrl("Contact")} className="hover:text-foreground transition">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-3">Legal</h4>
                <ul className="space-y-2.5 text-muted-foreground">
                  <li><Link to={createPageUrl("Terms")} className="hover:text-foreground transition">Terms</Link></li>
                  <li><Link to={createPageUrl("PrivacyPolicy")} className="hover:text-foreground transition">Privacy</Link></li>
                  <li><Link to={createPageUrl("DataPolicy")} className="hover:text-foreground transition">Data Policy</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-7 border-t border-border flex flex-col sm:flex-row justify-between gap-3 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} ApexCoach. All rights reserved.</p>
            <p>ApexCoach provides fitness coaching tools, not medical advice.</p>
          </div>
        </Section>
      </footer>
    </div>
  );
}
