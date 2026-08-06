import React, { useState, useEffect } from "react";
import { HelpCircle, X, Lightbulb, ChevronRight } from "lucide-react";

/**
 * FeatureGuide — first-time walkthrough cards for every major page.
 *
 * The first time a user opens a page, an instruction card explains what the
 * page is for and how to use it. Dismissing it collapses it to a small
 * "Page guide" button so it can be reopened anytime. Seen-state is stored
 * per page in localStorage.
 */

const GUIDES = {
  /* ---------------- Trainer portal ---------------- */
  Dashboard: {
    title: "Welcome to your dashboard",
    steps: [
      "Your Coach's Briefing appears at the top each morning — an AI summary of which clients are doing great and who needs attention.",
      "The cards below show your sessions, active clients, and activity. Drag cards by their handle to rearrange.",
      "Use the sidebar (or bottom bar on mobile) to reach Clients, Schedule, Workouts, and more.",
      "Use “Client View” to preview exactly what one of your clients sees.",
    ],
  },
  Clients: {
    title: "Managing your clients",
    steps: [
      "Tap “Onboard Client” to add a client — they'll get an email invitation to create their account.",
      "Clients sign up with the same email you used to add them (client accounts are invite-only).",
      "Click any client card to open their full profile: plans, progress, notes, and documents.",
      "Use Import to bring in many clients at once from a CSV file.",
    ],
  },
  Workouts: {
    title: "Building workout plans",
    steps: [
      "Click “Create Plan”, name it, and assign it to a client.",
      "Open a day and start typing an exercise name — the library search shows exercises with demo images and videos.",
      "Set sets, reps, and RIR for each exercise. Use “Duplicate Day” to copy a day's work.",
      "Save as a Template to reuse the same plan for future clients.",
    ],
  },
  Meals: {
    title: "Creating meal plans",
    steps: [
      "Click “Create Meal Plan”, set calorie and macro targets, and assign a client.",
      "Use “Add Food” in any meal to search real nutrition data — calories and macros fill in automatically.",
      "Or let “AI Meal Plan” draft a full plan you can edit.",
      "Assigned plans appear instantly in your client's Nutrition tab.",
    ],
  },
  Schedule: {
    title: "Scheduling sessions",
    steps: [
      "Click “New Session” or the “Add” button on any day to book a session with a client.",
      "Sessions appear on your client's schedule automatically.",
      "Use the arrows to move between weeks.",
    ],
  },
  Messages: {
    title: "Messaging",
    steps: [
      "Pick a client from the list to open your conversation.",
      "New messages arrive automatically while the chat is open.",
      "Attach photos or videos with the image button next to the message box.",
    ],
  },
  CRM: {
    title: "Leads & CRM",
    steps: [
      "Track potential clients in the Leads Pipeline — drag cards between stages as they progress.",
      "Convert a lead into a full client when they're ready to start.",
      "Keep session notes and follow-ups organized per lead.",
    ],
  },
  Contracts: {
    title: "Contracts & waivers",
    steps: [
      "Send agreements, liability waivers, PAR-Q health questionnaires, and medical release forms to clients.",
      "Clients complete and sign from their portal; signed documents are stored here.",
      "Use “Upload” for documents signed outside the app.",
    ],
  },
  Resources: {
    title: "Resource library",
    steps: [
      "Share educational content with your clients — files, links, videos, and recipes.",
      "“Import Recipe” extracts a full recipe automatically from any recipe URL using AI.",
      "Everything you add appears in your clients' Resources tab.",
    ],
  },
  Recipes: {
    title: "Recipe library",
    steps: [
      "Create recipes manually or let “AI Generate Recipe” draft one from a short description.",
      "Recipes can be attached to meal plans and shared with clients.",
    ],
  },
  BusinessHub: {
    title: "Business hub",
    steps: [
      "Track business tasks and expenses in one place.",
      "Log expenses with categories to see where your money goes; export to CSV anytime.",
    ],
  },
  Settings: {
    title: "Your settings",
    steps: [
      "Profile: your name, business name, photo, and the Metric/Imperial unit toggle.",
      "Client Portal (trainers): switch features on or off for your clients — turned-off sections disappear from their app.",
      "Notifications: enable push notifications for messages and updates.",
      "Account: export your data or delete your account.",
    ],
  },
  TrainerCommunity: {
    title: "Community",
    steps: [
      "Share posts with other trainers on the platform, or switch to My Clients to post to your own clients' feed.",
    ],
  },
  TrainerAssistant: {
    title: "AI assistant",
    steps: [
      "Start a conversation and ask for programming ideas, business advice, or client-specific suggestions.",
      "Select a client first to give the AI context about who you're planning for.",
    ],
  },

  /* ---------------- Client portal ---------------- */
  ClientDashboard: {
    title: "Welcome to ApexCoach!",
    steps: [
      "This is your Today screen — today's workout, habit checklist, and next session at a glance.",
      "Tap “Start” on your workout card to begin training.",
      "Check off habits as you complete them each day to build your streak.",
      "Use the bottom bar to reach Workouts, Nutrition, and Progress. “More” opens the full menu.",
    ],
  },
  ClientWorkouts: {
    title: "Your workouts",
    steps: [
      "Your trainer's plans appear here. Open one to see each day's exercises with demo images.",
      "Tap “Start Workout” to train, then log your completion — your trainer sees it immediately.",
      "The Progress Analytics tab charts your strength over time for every exercise.",
    ],
  },
  ClientMeals: {
    title: "Your nutrition",
    steps: [
      "Follow the meal plans your trainer assigns, with foods, portions, and macros.",
      "Use the AI Meal Scanner: snap a photo of any meal and it estimates the calories and macros.",
      "Log what you eat so your trainer can keep your plan on track.",
    ],
  },
  ClientProgress: {
    title: "Tracking progress",
    steps: [
      "Tap “Log Progress” to record weight and measurements — charts build automatically over time.",
      "Add progress photos from your dashboard; three or more unlocks the timelapse view.",
      "Your trainer sees everything you log, so they can adjust your plan.",
    ],
  },
  ClientHabits: {
    title: "Habits & focus",
    steps: [
      "Check off your daily habits — streaks build as you stay consistent.",
      "Use the Focus Timer for distraction-free work or meal-prep sessions.",
      "Open My Journal to reflect daily; your trainer can see AI summaries to coach you better.",
    ],
  },
  ClientSchedule: {
    title: "Your schedule",
    steps: [
      "Sessions your trainer books appear on this calendar.",
      "Message your trainer to request a new time or reschedule.",
    ],
  },
  ClientJournal: {
    title: "Daily reflection",
    steps: [
      "Answer the daily prompt (or tap “New Prompt” for a different one) and save your entry.",
      "Journaling helps your trainer understand how you're really doing — entries are summarized with AI insights.",
    ],
  },
  ClientResources: {
    title: "Resources",
    steps: [
      "Files, videos, recipes, and guides your trainer shares appear here, organized by category.",
    ],
  },
  ClientCommunity: {
    title: "Community",
    steps: [
      "Share wins and encouragement with your trainer's other clients.",
      "Add photos to your posts to celebrate milestones.",
    ],
  },

  /* ---------------- Solo portal ---------------- */
  IndependentDashboard: {
    title: "Welcome, solo athlete!",
    steps: [
      "This is your home base — workouts, meals, and progress in one view.",
      "Tap “Start Workout” to train. Build plans in the Workouts tab.",
      "Upload progress photos to build your transformation timelapse.",
      "AI Journal gives you personalized insights as you log your training.",
    ],
  },
};

export default function FeatureGuide({ currentPageName }) {
  const guide = GUIDES[currentPageName];
  const storageKey = `guide_seen_${currentPageName}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!guide) return;
    try {
      setOpen(localStorage.getItem(storageKey) !== "1");
    } catch {
      setOpen(false);
    }
  }, [currentPageName]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!guide) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch { /* ignore */ }
    setOpen(false);
  };

  if (!open) {
    return (
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition"
        >
          <HelpCircle className="w-3.5 h-3.5" /> Page guide
        </button>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-2xl border border-primary/25 bg-primary/5 p-5 relative">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition"
        aria-label="Dismiss guide"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-bold text-foreground">{guide.title}</h3>
      </div>
      <ul className="space-y-2 mb-4">
        {guide.steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
            <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span>{step}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={dismiss}
        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
      >
        Got it
      </button>
    </div>
  );
}
