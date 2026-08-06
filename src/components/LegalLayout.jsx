import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { createPageUrl } from "@/utils";
import ReactMarkdown from "react-markdown";

/**
 * Shared wrapper for the long-form legal pages (Terms, Privacy, Data Policy).
 * Renders a markdown `body` inside a clean, readable, theme-aware document.
 */
export default function LegalLayout({ title, updated, intro, body }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to={createPageUrl("Home")} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">ApexCoach</span>
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-1">Last updated: {updated}</p>
        {intro && <p className="text-muted-foreground mb-6">{intro}</p>}

        <div className="legal-content">
          <ReactMarkdown>{body}</ReactMarkdown>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link to={createPageUrl("About")} className="hover:text-foreground">About</Link>
          <Link to={createPageUrl("Terms")} className="hover:text-foreground">Terms of Service</Link>
          <Link to={createPageUrl("PrivacyPolicy")} className="hover:text-foreground">Privacy Policy</Link>
          <Link to={createPageUrl("DataPolicy")} className="hover:text-foreground">Data Policy</Link>
          <Link to={createPageUrl("Contact")} className="hover:text-foreground">Contact</Link>
        </div>
      </main>
    </div>
  );
}
