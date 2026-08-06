import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import {
  Menu, X, Dumbbell, Utensils, LineChart, CheckSquare,
  Sparkles, MessageCircle, Users, FileText, ChevronRight,
} from "lucide-react";

const FEATURES = [
  { icon: Dumbbell, title: "Workout Builder", text: "Program multi-week plans and search a full exercise library with demo images and videos." },
  { icon: Utensils, title: "Nutrition & Meals", text: "Meal plans, USDA-powered food macros, and an AI meal photo scanner." },
  { icon: LineChart, title: "Progress Tracking", text: "Log measurements and photos, and replay your transformation as a timelapse." },
  { icon: CheckSquare, title: "Habits & Streaks", text: "Daily habit tracking, streaks, and goals that keep clients consistent." },
  { icon: Sparkles, title: "AI Coach's Briefing", text: "Trainers open each day to an AI triage of who's winning and who needs attention." },
  { icon: MessageCircle, title: "Messaging", text: "Direct trainer-to-client chat plus community feeds to stay connected." },
  { icon: Users, title: "Client CRM", text: "Manage clients and leads through a simple pipeline with private notebooks." },
  { icon: FileText, title: "Contracts & Waivers", text: "Send agreements, PAR-Q forms, and medical releases — and collect signatures." },
];

export default function PublicHome() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const goToLogin = () => navigate(createPageUrl("Login"));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">ApexCoach</span>
          </div>

          <div className="hidden md:flex items-center gap-7">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition">Features</a>
            <Link to={createPageUrl("About")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition">About</Link>
            <Link to={createPageUrl("Contact")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition">Contact</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={goToLogin} className="px-4 py-2 rounded-xl text-sm font-semibold text-foreground hover:bg-accent transition">
              Log in
            </button>
            <button onClick={goToLogin} className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition">
              Get started
            </button>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card px-4 py-4 flex flex-col gap-3">
            <a href="#features" className="py-1.5 font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <Link to={createPageUrl("About")} className="py-1.5 font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>About</Link>
            <Link to={createPageUrl("Contact")} className="py-1.5 font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
            <button onClick={goToLogin} className="mt-2 w-full py-2.5 rounded-xl font-semibold text-foreground border border-border">Log in</button>
            <button onClick={goToLogin} className="w-full py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground">Get started</button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" /> AI-assisted coaching platform
          </span>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6 max-w-3xl mx-auto">
            Training, nutrition, and habits — <span className="text-primary">all in one place.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-9">
            ApexCoach gives trainers a clean way to coach and gives clients and solo athletes a simple way to
            train, eat, and build habits that stick.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={goToLogin} className="px-7 py-3.5 rounded-xl font-semibold bg-primary text-primary-foreground hover:opacity-90 transition inline-flex items-center justify-center gap-2">
              Get started <ChevronRight className="w-4 h-4" />
            </button>
            <a href="#features" className="px-7 py-3.5 rounded-xl font-semibold border border-border text-foreground hover:bg-accent transition">
              See features
            </a>
          </div>
          <p className="text-sm text-muted-foreground mt-5">
            Free for solo athletes · Clients join by invite · Trainers sign up with a beta key
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-card/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Everything you need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              A focused toolkit for real coaching — no clutter.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-background border border-border rounded-2xl p-6 hover:border-primary/40 hover:-translate-y-0.5 transition-all">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Start today</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Create your account in seconds and bring your training into one modern, connected place.
          </p>
          <button onClick={goToLogin} className="px-8 py-4 rounded-xl font-semibold bg-primary text-primary-foreground hover:opacity-90 transition inline-flex items-center gap-2">
            Get started <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">ApexCoach</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
            <Link to={createPageUrl("About")} className="hover:text-foreground transition">About</Link>
            <Link to={createPageUrl("Contact")} className="hover:text-foreground transition">Contact</Link>
            <Link to={createPageUrl("PrivacyPolicy")} className="hover:text-foreground transition">Privacy Policy</Link>
            <Link to={createPageUrl("DataPolicy")} className="hover:text-foreground transition">Data Policy</Link>
            <Link to={createPageUrl("Terms")} className="hover:text-foreground transition">Terms of Service</Link>
          </div>
          <div className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ApexCoach
          </div>
        </div>
      </footer>
    </div>
  );
}
