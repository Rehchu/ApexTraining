import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Users, Dumbbell, Utensils, CalendarDays, CheckSquare,
  MessageCircle, Library, FileText, Sparkles, LineChart, Heart,
  Target, Bell,
} from "lucide-react";

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="p-6 rounded-2xl bg-card border border-border transition-all hover:border-primary/40 hover:-translate-y-0.5">
    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-primary/10">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <h3 className="text-base font-bold text-foreground mb-1.5">{title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
  </div>
);

export default function About() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Dumbbell, title: "Workout Builder",
      description: "Build multi-week programs and search a rich exercise library with demo images and videos for every movement.",
    },
    {
      icon: Utensils, title: "Nutrition & Meals",
      description: "Create meal plans, look up any food's macros via the USDA database, and log meals — including an AI photo scanner.",
    },
    {
      icon: LineChart, title: "Progress Tracking",
      description: "Log measurements and body weight, capture progress photos, and watch your transformation as a timelapse.",
    },
    {
      icon: CheckSquare, title: "Habits & Streaks",
      description: "Build consistency with daily habit tracking, streaks, goals, and lightweight gamification that keeps clients coming back.",
    },
    {
      icon: CalendarDays, title: "Scheduling",
      description: "Book and manage training sessions on a clean weekly calendar, with reminders so nobody misses a session.",
    },
    {
      icon: MessageCircle, title: "Messaging & Community",
      description: "Direct trainer-to-client messaging plus community feeds to share wins and stay connected.",
    },
    {
      icon: Users, title: "CRM & Clients",
      description: "Trainers manage clients and leads through a simple pipeline, with private notebooks for every relationship.",
    },
    {
      icon: FileText, title: "Contracts & Waivers",
      description: "Send agreements, PAR-Q health questionnaires, and medical release forms — and collect signatures.",
    },
    {
      icon: Sparkles, title: "AI That Helps",
      description: "A daily Coach's Briefing surfaces who needs attention, AI summarizes client journals, and AI drafts plans — all working quietly in the background.",
    },
    {
      icon: Target, title: "Three Tailored Portals",
      description: "Purpose-built experiences for solo athletes, coached clients, and trainers — each seeing exactly what they need.",
    },
    {
      icon: Bell, title: "Installable & Connected",
      description: "Install ApexCoach to your phone like a native app and get push notifications for messages, plans, and reminders.",
    },
    {
      icon: Library, title: "Resource Library",
      description: "Share workout, nutrition, and educational resources and recipes with your clients in one organized place.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-primary/10">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl lg:text-5xl font-bold text-foreground tracking-tight">About ApexCoach</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl">
            One clean, modern platform for training, nutrition, and habits — built for solo athletes,
            coached clients, and the trainers who guide them.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-12 space-y-16 pb-24">
        {/* Dedication */}
        <div className="bg-card border border-border p-8 md:p-12 rounded-2xl text-center">
          <Heart className="w-10 h-10 text-primary mx-auto mb-5" />
          <p className="text-lg md:text-xl font-medium text-foreground italic max-w-3xl mx-auto leading-relaxed">
            "Originally built to help my own personal trainer manage and track his clients' progress in one
            place — this application is dedicated to him."
          </p>
        </div>

        {/* Features */}
        <div>
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">Everything in one place</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A focused set of tools that trainers and clients actually use — no clutter, no bloat.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, idx) => (
              <FeatureCard key={idx} {...feature} />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-primary/5 border border-primary/20 p-10 rounded-2xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">Ready to get started?</h2>
          <p className="text-muted-foreground mb-7 max-w-2xl mx-auto">
            Create a free solo account, join as a client, or sign in as a trainer with your beta key.
          </p>
          <Button
            className="font-semibold px-8 py-6 text-base text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl"
            onClick={() => navigate(createPageUrl("Login"))}
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}
