import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { showSuccess } from "@/components/ui/success-toast";
import {
  LayoutDashboard, Map, Dumbbell, Utensils, LineChart,
  CalendarDays, CheckSquare, ShoppingBasket, Library,
  Users2, MessageCircle, Save, ChefHat
} from "lucide-react";

const PORTAL_FEATURES = [
  { key: "workouts", label: "Workouts", icon: Dumbbell, description: "Workout plans and exercise tracking" },
  { key: "nutrition", label: "Nutrition", icon: Utensils, description: "Meal plans and food logging" },
  { key: "progress", label: "Progress", icon: LineChart, description: "Progress charts and body metrics" },
  { key: "schedule", label: "Schedule", icon: CalendarDays, description: "Upcoming sessions calendar" },
  { key: "habits", label: "Habits & Journal", icon: CheckSquare, description: "Habit tracking and daily journal" },
  { key: "resources", label: "Resources", icon: Library, description: "Files, videos, and documents" },
  { key: "community", label: "Community", icon: Users2, description: "Social feed and group posts" },
  { key: "messages", label: "Messages", icon: MessageCircle, description: "Direct messaging with trainer" },
];

const DEFAULT_FEATURES = Object.fromEntries(PORTAL_FEATURES.map(f => [f.key, true]));

export default function ClientPortalSettings() {
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const user = await base44.auth.me();
      const saved = user?.data?.client_portal_features || user?.client_portal_features;
      if (saved) setFeatures({ ...DEFAULT_FEATURES, ...saved });
    };
    load();
  }, []);

  const handleToggle = (key, value) => {
    setFeatures(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await base44.auth.updateMe({ client_portal_features: features });
    setIsSaving(false);
    showSuccess("Portal Settings Saved", "Client portal features updated");
  };

  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Client Portal Features</h3>
        <p className="text-sm text-muted-foreground mt-1">Toggle which sections are visible to your clients in their portal.</p>
      </div>

      <div className="space-y-3">
        {PORTAL_FEATURES.map(({ key, label, icon: Icon, description }) => (
          <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-foreground font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
            <Switch
              checked={features[key] !== false}
              onCheckedChange={(v) => handleToggle(key, v)}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Portal Settings"}
        </Button>
      </div>
    </div>
  );
}