import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Shared hook for loading the authenticated user's client profile.
 * Uses custom_id prefix (CLIEN- / TRAIN-) for role detection when available.
 * Falls back to email/user_id lookup. Auto-links user_id on Client record.
 */

export function isClientByCustomId(user) {
  const customId = user?.data?.custom_id || user?.custom_id;
  if (customId) return customId.startsWith('CLIEN-');
  return null; // unknown, fall back to other checks
}

export function isTrainerByCustomId(user) {
  const customId = user?.data?.custom_id || user?.custom_id;
  if (customId) return customId.startsWith('TRAIN-');
  return null; // unknown, fall back to other checks
}

export function useClientProfile() {
  const [user, setUser] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        // If user has a TRAIN- custom_id, they are definitely a trainer — skip client lookup
        const customId = userData?.data?.custom_id || userData?.custom_id;
        if (customId && customId.startsWith('TRAIN-')) {
          setClientProfile(null);
          setIsLoading(false);
          return;
        }

        let profile = null;

        // Primary: find client by custom_id (most secure)
        if (customId && customId.startsWith('CLIEN-')) {
          try {
            const byCustomId = await base44.entities.Client.filter({ custom_id: customId });
            if (byCustomId.length > 0) profile = byCustomId[0];
          } catch (e) {}
        }

        // Fallback: find by email
        if (!profile) {
          try {
            const byEmail = await base44.entities.Client.filter({ email: userData.email });
            if (byEmail.length > 0) profile = byEmail[0];
          } catch (e) {}
        }

        // Fallback: find by user_id
        if (!profile) {
          try {
            const byUserId = await base44.entities.Client.filter({ user_id: userData.id });
            if (byUserId.length > 0) profile = byUserId[0];
          } catch (e) {}
        }

        // Auto-link user_id so trainer-assigned plans are found by user.id too
        if (profile && !profile.user_id) {
          try {
            await base44.entities.Client.update(profile.id, { user_id: userData.id });
            profile = { ...profile, user_id: userData.id };
          } catch (e) {}
        }

        setClientProfile(profile);
      } catch (e) {
        console.error('Error loading client profile:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return { user, clientProfile, setClientProfile, isLoading };
}