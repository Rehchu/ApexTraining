import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard, Users, Dumbbell, Utensils, Calendar, MessageSquare,
  FileText, Library, LineChart, Bot, Settings as SettingsIcon, UserCircle,
  BookOpen, Receipt, Users2, Sun, Moon, Plus,
} from "lucide-react";
import { useTheme } from "@/components/hooks/useTheme";

const TRAINER_PAGES = [
  { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
  { label: "Clients", page: "Clients", icon: Users },
  { label: "Workout Plans", page: "Workouts", icon: Dumbbell },
  { label: "Meal Plans", page: "Meals", icon: Utensils },
  { label: "Schedule", page: "Schedule", icon: Calendar },
  { label: "Messages", page: "Messages", icon: MessageSquare },
  { label: "Contracts & Waivers", page: "Contracts", icon: FileText },
  { label: "Resources", page: "Resources", icon: Library },
  { label: "Progress Tracking", page: "Progress", icon: LineChart },
  { label: "Recipes", page: "Recipes", icon: Utensils },
  { label: "CRM & Leads", page: "CRM", icon: Users2 },
  { label: "Business Hub", page: "BusinessHub", icon: Receipt },
  { label: "Expenses", page: "TrainerExpenses", icon: Receipt },
  { label: "Client Notebooks", page: "ClientNotebooks", icon: BookOpen },
  { label: "Journal Insights", page: "TrainerJournalInsights", icon: BookOpen },
  { label: "AI Assistant", page: "TrainerAssistant", icon: Bot },
  { label: "Settings", page: "Settings", icon: SettingsIcon },
];

const CLIENT_PAGES = [
  { label: "Today", page: "ClientDashboard", icon: LayoutDashboard },
  { label: "My Workouts", page: "ClientWorkouts", icon: Dumbbell },
  { label: "My Nutrition", page: "ClientMeals", icon: Utensils },
  { label: "My Progress", page: "ClientProgress", icon: LineChart },
  { label: "Recovery & Readiness", page: "ClientRecovery", icon: LineChart },
  { label: "Habits", page: "ClientHabits", icon: Calendar },
  { label: "Journal", page: "ClientJournal", icon: BookOpen },
  { label: "My Documents", page: "ClientDocuments", icon: FileText },
  { label: "Resources", page: "ClientResources", icon: Library },
  { label: "Messages", page: "Messages", icon: MessageSquare },
  { label: "Settings", page: "Settings", icon: SettingsIcon },
];

/**
 * Global ⌘K / Ctrl+K palette: jump to any page or client without hunting
 * through the sidebar. Client list is only fetched once the palette opens.
 */
export default function CommandPalette({ isClient = false }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpenEvent = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("apex:open-command-palette", onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("apex:open-command-palette", onOpenEvent);
    };
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ["paletteClients"],
    queryFn: () => base44.entities.Client.list("-created_date", 200),
    enabled: open && !isClient,
    staleTime: 60000,
  });

  const pages = useMemo(() => (isClient ? CLIENT_PAGES : TRAINER_PAGES), [isClient]);

  const go = (fn) => { setOpen(false); setTimeout(fn, 0); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, clients, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Go to">
          {pages.map(({ label, page, icon: Icon }) => (
            <CommandItem
              key={page + label}
              value={`${label} ${page}`}
              onSelect={() => go(() => navigate(createPageUrl(page)))}
            >
              <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>

        {!isClient && clients.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Clients">
              {clients.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.full_name || "Client"} ${c.email || ""}`}
                  onSelect={() => go(() => navigate(createPageUrl(`ClientProfile?id=${c.id}`)))}
                >
                  <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{c.full_name || "Unnamed client"}</span>
                  {c.email && (
                    <span className="ml-2 truncate text-xs text-muted-foreground">{c.email}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {!isClient && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Create">
              <CommandItem value="new client onboard" onSelect={() => go(() => navigate(createPageUrl("Clients")))}>
                <Plus className="mr-2 h-4 w-4 text-muted-foreground" /> Onboard a client
              </CommandItem>
              <CommandItem value="new workout plan" onSelect={() => go(() => navigate(createPageUrl("Workouts")))}>
                <Plus className="mr-2 h-4 w-4 text-muted-foreground" /> New workout plan
              </CommandItem>
              <CommandItem value="new meal plan" onSelect={() => go(() => navigate(createPageUrl("Meals")))}>
                <Plus className="mr-2 h-4 w-4 text-muted-foreground" /> New meal plan
              </CommandItem>
              <CommandItem value="new session booking" onSelect={() => go(() => navigate(createPageUrl("Schedule")))}>
                <Plus className="mr-2 h-4 w-4 text-muted-foreground" /> Book a session
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Appearance">
          <CommandItem
            value="toggle theme dark light mode"
            onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark"
              ? <Sun className="mr-2 h-4 w-4 text-muted-foreground" />
              : <Moon className="mr-2 h-4 w-4 text-muted-foreground" />}
            Switch to {theme === "dark" ? "light" : "dark"} mode
            <CommandShortcut>Theme</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
