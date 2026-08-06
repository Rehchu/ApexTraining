import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard, Check, Loader2, Sparkles, Users, ExternalLink, AlertTriangle, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const FEATURES = [
  "Every feature included — no locked tiers",
  "Workout & meal planning with AI drafting",
  "AI meal scanner, form check & recovery protocols",
  "Contracts, waivers & e-signature",
  "Client portal, messaging & push notifications",
  "Progress tracking, habits & journals",
];

export default function BillingSettings() {
  const [interval, setInterval] = useState("monthly");
  const [busy, setBusy] = useState(null);

  const { data: billing, isLoading } = useQuery({
    queryKey: ["billingStatus"],
    // Billing lives on its own /api/stripe/* routes, not the generic function router.
    queryFn: async () => {
      const res = await fetch("/api/stripe/status", {
        headers: { authorization: `Bearer ${localStorage.getItem("apex_access_token")}` },
      });
      if (!res.ok) throw new Error("Could not load billing status");
      return res.json();
    },
  });

  const call = async (path, body) => {
    const res = await fetch(`/api/stripe/${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${localStorage.getItem("apex_access_token")}`,
      },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Something went wrong");
    return data;
  };

  const subscribe = async (plan) => {
    setBusy(plan);
    try {
      const { url } = await call("checkout", { plan, interval });
      window.location.href = url;
    } catch (e) {
      toast.error(e.message);
      setBusy(null);
    }
  };

  const manage = async () => {
    setBusy("portal");
    try {
      const { url } = await call("portal");
      window.location.href = url;
    } catch (e) {
      toast.error(e.message);
      setBusy(null);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-10 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading your plan...
      </div>
    );
  }

  // Founding trainers (beta key) are comped for life — never show them a paywall.
  if (billing?.comped) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <ShieldCheck className="w-7 h-7 text-emerald-500" />
        </div>
        <h3 className="mt-4 text-xl font-bold text-foreground">Founding Trainer</h3>
        <Badge className="mt-2 bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Free forever</Badge>
        <p className="mt-4 text-muted-foreground max-w-md mx-auto">
          You joined with a beta key, so your account is comped for life — unlimited clients,
          every feature, and no subscription. Thank you for being here early.
        </p>
        <ul className="mt-7 mx-auto max-w-sm text-left space-y-2.5 border-t border-border pt-6">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <Check className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
              <span className="text-muted-foreground">{f}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const plans = billing?.plans || [];
  const used = billing?.clientCount ?? 0;
  const limit = billing?.clientLimit ?? 0;
  const atLimit = limit > 0 && used >= limit;

  return (
    <div className="space-y-6">
      {/* Current status */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">
                {billing?.planName || "No plan yet"}
              </h3>
              {billing?.status === "trialing" && (
                <Badge className="bg-sky-500/15 text-sky-600 border-sky-500/30">Trial</Badge>
              )}
              {billing?.status === "past_due" && (
                <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Payment failed</Badge>
              )}
              {billing?.status === "active" && (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Active</Badge>
              )}
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              {billing?.onTrial && billing?.trialEndsAt
                ? `Your free trial runs until ${format(new Date(billing.trialEndsAt), "MMMM d, yyyy")}. Pick a plan any time — you won't be charged until it ends.`
                : billing?.status === "active" && billing?.currentPeriodEnd
                ? billing.cancelAtPeriodEnd
                  ? `Your plan ends on ${format(new Date(billing.currentPeriodEnd), "MMMM d, yyyy")}.`
                  : `Renews on ${format(new Date(billing.currentPeriodEnd), "MMMM d, yyyy")}.`
                : billing?.status === "past_due"
                ? "We couldn't take your last payment. Update your card to keep your account active."
                : "Choose a plan to keep coaching without limits."}
            </p>

            <div className="mt-3 flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className={atLimit ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                {used} active {used === 1 ? "client" : "clients"}
                {limit > 0 ? ` of ${limit}` : " · unlimited"}
              </span>
            </div>
          </div>

          {billing?.customerId && (
            <Button variant="outline" onClick={manage} disabled={busy === "portal"} className="gap-2 shrink-0">
              {busy === "portal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Manage billing
            </Button>
          )}
        </div>

        {atLimit && (
          <div className="mt-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">
              You've reached your client limit. Upgrade below to onboard more.
            </p>
          </div>
        )}
      </div>

      {/* Plan picker */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Plans</h3>
            <p className="text-sm text-muted-foreground">
              Every plan includes every feature. You're only choosing how many clients you coach.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-border p-1 bg-secondary shrink-0">
            {[["monthly", "Monthly"], ["annual", "Annual"]].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setInterval(v)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  interval === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {label}{v === "annual" && <span className="ml-1.5 text-xs text-emerald-600">−2 months</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const price = interval === "annual" ? p.annual : p.monthly;
            const current = billing?.plan === p.id && billing?.status === "active";
            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-6 flex flex-col ${
                  p.id === "pro" ? "border-emerald-500/40 bg-emerald-500/[0.03]" : "border-border"
                }`}
              >
                {p.id === "pro" && (
                  <span className="self-start mb-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                    <Sparkles className="w-3 h-3" /> Most popular
                  </span>
                )}
                <h4 className="font-bold text-foreground">{p.name}</h4>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black tracking-tight text-foreground">${price}</span>
                  <span className="text-sm text-muted-foreground">/{interval === "annual" ? "year" : "month"}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {p.clientLimit === 0 ? "Unlimited active clients" : `Up to ${p.clientLimit} active clients`}
                </p>

                <Button
                  className="mt-5 w-full"
                  variant={p.id === "pro" ? "default" : "outline"}
                  disabled={current || busy === p.id}
                  onClick={() => subscribe(p.id)}
                >
                  {busy === p.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {current ? "Current plan" : billing?.status === "active" ? "Switch to this plan" : "Choose plan"}
                </Button>
              </div>
            );
          })}
        </div>

        <ul className="mt-7 grid sm:grid-cols-2 gap-x-8 gap-y-3 border-t border-border pt-6">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <Check className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
              <span className="text-muted-foreground">{f}</span>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs text-muted-foreground">
          Payments are processed by Stripe. Card details never touch ApexCoach's servers.
          Cancel any time from Manage billing — your plan stays active until the end of the period.
        </p>
      </div>
    </div>
  );
}
