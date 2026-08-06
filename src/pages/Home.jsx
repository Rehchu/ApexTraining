import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2 } from "lucide-react";
import PublicHome from "./PublicHome";

export default function Home() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          try {
            const user = await base44.auth.me();
            if (user) {
              // Check if user is trying to register as a trainer with a beta key
              const betaKey = sessionStorage.getItem("trainerBetaKey");
              if (betaKey) {
                try {
                  const res = await base44.functions.invoke('claimBetaKey', { key: betaKey });
                  sessionStorage.removeItem("trainerBetaKey");
                  
                  if (res.data && res.data.success) {
                    navigate(createPageUrl('Dashboard'), { replace: true });
                    // Force a reload to get new role/type
                    window.location.reload();
                    return;
                  }
                } catch (e) {
                  console.error("Beta key claim failed", e);
                  sessionStorage.removeItem("trainerBetaKey");
                }
              }

              // Admins and trainers go to trainer dashboard
              const effectiveUserType = user.user_type 
                || user.data?.user_type 
                || user.data?.data?.user_type
                || user.data?.data?.data?.user_type;
              const isTrainer = user.role === 'admin' || effectiveUserType === 'trainer' || (!effectiveUserType && user.role === 'trainer');
              
              if (isTrainer) {
                navigate(createPageUrl('Dashboard'), { replace: true });
                return;
              }

              // If user_type is explicitly set
              if (effectiveUserType === 'independent') {
                navigate(createPageUrl('IndependentDashboard'), { replace: true });
                return;
              }
              if (effectiveUserType === 'client') {
                navigate(createPageUrl('ClientDashboard'), { replace: true });
                return;
              }

              // No user_type set — check if a trainer has assigned them as a client
              if (!effectiveUserType && user.role !== 'admin') {
                try {
                  const clientRecords = await base44.entities.Client.filter({ email: user.email });
                  if (clientRecords && clientRecords.length > 0) {
                    // A trainer has assigned them — they're a client
                    await base44.auth.updateMe({ user_type: 'client' });
                    navigate(createPageUrl('ClientDashboard'), { replace: true });
                  } else {
                    // Not assigned to any trainer — treat as independent
                    await base44.auth.updateMe({ user_type: 'independent' });
                    navigate(createPageUrl('IndependentDashboard'), { replace: true });
                  }
                } catch (e) {
                  // Fallback to independent on error
                  navigate(createPageUrl('IndependentDashboard'), { replace: true });
                }
                return;
              }

              navigate(createPageUrl('ClientDashboard'), { replace: true });
              return;
            }
          } catch (e) {
            console.error("Auth me failed in Home, logging out", e);
            await base44.auth.logout();
            return;
          }
        }
      } catch (err) {
        // Not authenticated
        console.error("Auth check failed", err);
      }
      setChecked(true);
    };
    checkAuth();
  }, [navigate]);

  if (!checked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return <PublicHome />;
}