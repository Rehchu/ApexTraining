import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import TrophyHabitTracker from "@/components/habits/TrophyHabitTracker";
import FocusTimer from "@/components/habits/FocusTimer";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClientHabits() {
  const [user, setUser] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      let profile = null;
      try {
        const byEmail = await base44.entities.Client.filter({ email: userData.email });
        if (byEmail.length > 0) profile = byEmail[0];
      } catch (e) {}
      if (!profile) {
        try {
          const byUserId = await base44.entities.Client.filter({ user_id: userData.id });
          if (byUserId.length > 0) profile = byUserId[0];
        } catch (e) {}
      }
      if (profile && !profile.user_id) {
        try { await base44.entities.Client.update(profile.id, { user_id: userData.id }); } catch (e) {}
        profile = { ...profile, user_id: userData.id };
      }
      setClientProfile(profile || null);
    };
    loadUser();
  }, []);

  if (!clientProfile || !user) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Habits</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Build consistency. One day at a time.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <Link to={createPageUrl("ClientJournal")} className="px-3 py-1.5 bg-secondary hover:bg-accent border border-border rounded-lg text-sm text-foreground whitespace-nowrap">My Journal</Link>
        </div>
      </div>

      <FocusTimer
        onSessionComplete={(data) => {
          // Log a habit completion or just store locally
          const count = parseInt(localStorage.getItem('totalFocusMinutes') || '0') + (data.duration_minutes || 0);
          localStorage.setItem('totalFocusMinutes', String(count));
        }}
      />
      
      <TrophyHabitTracker
        clientId={user.id}
        trainerId={clientProfile.trainer_id}
        readOnly={clientProfile.trainer_id !== null}
      />
    </div>
  );
}