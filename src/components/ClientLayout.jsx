import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import PullToRefresh from "react-simple-pull-to-refresh";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  LineChart,
  CalendarDays,
  CheckSquare,
  X,
  LogOut,
  ChevronRight,
  UserCircle,
  MessageCircle,
  Zap,
  Users2,
  Library,
  Menu,
  Map,
  Flame,
  ArrowLeft,
  Bug,
  Target,
  Settings,
  BookOpen,
  Trophy,
  HeartPulse,
  ShoppingBasket,
  GitMerge,
  Component,
  Eye,
  CreditCard,
  ChefHat,
  Bot,
  Sparkles,
  FileSignature
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import ClientBottomNav from "@/components/ClientBottomNav";
import FeatureGuide from "@/components/FeatureGuide";
import NotificationBell from "@/components/notifications/NotificationBell";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const clientNavGroups = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", icon: LayoutDashboard, page: "ClientDashboard" },
    ]
  },
  {
    title: "Programs",
    items: [
      { name: "Workouts", icon: Dumbbell, page: "ClientWorkouts" },
      { name: "Nutrition", icon: Utensils, page: "ClientMeals" },
      { name: "Progress", icon: LineChart, page: "ClientProgress" },
      { name: "Schedule", icon: CalendarDays, page: "ClientSchedule" },
      { name: "Habits", icon: CheckSquare, page: "ClientHabits" }
    ]
  },
  {
    title: "Companion",
    items: [
      { name: "My Pet", icon: Sparkles, page: "MyPet" }
    ]
  },
  {
    title: "Community & Store",
    items: [
      { name: "Resources", icon: Library, page: "ClientResources" },
      { name: "Documents", icon: FileSignature, page: "ClientDocuments" }
    ]
  },
  {
    title: "More",
    items: [
      { name: "Settings", icon: Settings, page: "Settings" },
      { name: "Report Bug", icon: Bug, page: "ReportBug" }
    ]
  }
];


const PAGE_FEATURE_MAP = {
  "ClientDashboard": "dashboard",
  "ClientWorkouts": "workouts",
  "ClientRecovery": "workouts",
  "ClientMeals": "nutrition",
  "ClientProgress": "progress",
  "ClientSchedule": "schedule",
  "ClientHabits": "habits",
  "ClientJournal": "habits",
  "ClientResources": "resources",
  "ClientCommunity": "community",
  "Messages": "messages",
};

export default function ClientLayout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Bottom nav "More" button opens the slide-in menu
  useEffect(() => {
    const open = () => setSidebarOpen(true);
    window.addEventListener("apex:open-menu", open);
    return () => window.removeEventListener("apex:open-menu", open);
  }, []);
  const [portalFeatures, setPortalFeatures] = useState({});
  const [appLogoUrl, setAppLogoUrl] = useState(null);
  const [isAdminPreview, setIsAdminPreview] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isRootPage = clientNavGroups.some(group => group.items.some(item => item.page === currentPageName)) || ['IndependentDashboard'].includes(currentPageName);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
  });

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ["unreadMessages", user?.id],
    queryFn: () => base44.entities.Message.filter({ receiver_id: user?.id, read: false }),
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  const subscribeToPush = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;

      // Register service worker if not already registered
      let registration;
      try {
        registration = await navigator.serviceWorker.register('/serviceWorker.js');
        await navigator.serviceWorker.ready;
        registration = await navigator.serviceWorker.ready;
      } catch (e) {
        registration = await navigator.serviceWorker.ready;
      }

      // Get VAPID key first
      const res = await base44.functions.invoke('webPush', { action: 'getPublicKey' });
      const publicKey = res.data?.publicKey;
      if (!publicKey) return;

      const base64ToUint8 = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const arr = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
        return arr;
      };

      // Unsubscribe stale subscription if any, then re-subscribe fresh
      const existing = await registration.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8(publicKey)
      });

      await base44.functions.invoke('webPush', { action: 'subscribe', subscription: subscription.toJSON() });
      toast.success("Push notifications enabled!");
    } catch (e) {
      console.error("Push subscribe error:", e);
    }
  };

  useEffect(() => {
    // Prompt for push notifications if not decided yet
    if ('Notification' in window && Notification.permission === 'default' && 'PushManager' in window) {
      const timer = setTimeout(() => {
        toast('Enable Push Notifications?', {
          description: 'Get notified when your trainer updates your plan or sends a message.',
          action: {
            label: 'Enable',
            onClick: subscribeToPush
          },
          duration: 10000,
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  useEffect(() => {
    try {
      const adminMode = localStorage.getItem('adminViewMode');
      setIsAdminPreview(adminMode === 'client' || adminMode === '"client"');
    } catch (e) {
      setIsAdminPreview(false);
    }
  }, []);

  // System Dark Mode Sync
  useEffect(() => {
    // Light theme is the app default; '.dark' can be toggled from Settings later.
    document.documentElement.classList.remove('dark');
  }, []);

  const previewClientId = localStorage.getItem('clientPreviewId');
  const previewClientEmail = localStorage.getItem('clientPreviewEmail');

  const exitClientPreview = () => {
    localStorage.setItem('adminViewMode', JSON.stringify('full'));
    localStorage.removeItem('clientPreviewId');
    localStorage.removeItem('clientPreviewEmail');
    window.location.href = createPageUrl('Dashboard');
  };

  const { data: clientProfile } = useQuery({
    queryKey: ["clientProfile", user?.email, isAdminPreview, previewClientEmail],
    queryFn: async () => {
      const emailToFind = isAdminPreview ? previewClientEmail || user.email : user.email;
      const byEmail = await base44.entities.Client.filter({ email: emailToFind });
      return byEmail.length > 0 ? byEmail[0] : null;
    },
    enabled: !!user?.email,
    staleTime: 300000,
  });

  const { data: trainerProfile } = useQuery({
    queryKey: ["trainerProfile", clientProfile?.trainer_id],
    queryFn: async () => {
      if (!clientProfile?.trainer_id) return null;
      const res = await base44.functions.invoke('getUserById', { userId: clientProfile.trainer_id });
      const trainerData = res.data?.user || res.data;
      if (trainerData) {
        const features = trainerData?.data?.client_portal_features || trainerData?.client_portal_features;
        if (features) setPortalFeatures(features);
      }
      return trainerData;
    },
    enabled: !!clientProfile?.trainer_id,
    staleTime: 300000,
  });

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const logoRes = await base44.functions.invoke('getAppLogo', {});
        if (logoRes.data?.logoUrl) {
          setAppLogoUrl(logoRes.data.logoUrl);
        }
      } catch (err) {}
    };
    loadLogo();
    const handler = () => queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    window.addEventListener('profileUpdated', handler);
    return () => window.removeEventListener('profileUpdated', handler);
  }, []);

  // Feature gating: if the client's trainer has disabled the feature this page
  // belongs to, block the page (not just hide it from the nav). Independent
  // users have no trainer, so portalFeatures is empty and nothing is blocked.
  const currentFeatureKey = PAGE_FEATURE_MAP[currentPageName];
  const featureBlocked =
    currentFeatureKey &&
    currentFeatureKey !== "dashboard" &&
    portalFeatures[currentFeatureKey] === false;

  const gatedChildren = featureBlocked ? (
    <div className="max-w-md mx-auto text-center py-20">
      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
        <Library className="w-6 h-6 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">This section isn't available</h2>
      <p className="text-muted-foreground">
        Your trainer has turned off this feature for your portal. Reach out to them if you think you need access.
      </p>
    </div>
  ) : (
    children
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Admin preview banner */}
      {isAdminPreview && (
        <div className="fixed top-0 left-0 right-0 z-[999] flex items-center justify-center gap-3 px-4 py-1.5 text-xs font-bold text-black" style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a)', boxShadow: '0 2px 12px rgba(34,197,94,0.4)' }}>
          <Eye className="w-3.5 h-3.5" />
          Client portal PREVIEW MODE
          <button onClick={exitClientPreview} className="ml-2 underline hover:no-underline">
            Exit
          </button>
        </div>
      )}
      {/* Mobile header */}
      <header className="lg:hidden fixed left-0 right-0 z-50 flex items-center justify-between px-4"
      style={{ background: 'hsl(var(--sidebar-background))', borderBottom: '1px solid hsl(var(--border))', height: 'calc(56px + env(safe-area-inset-top))', paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))', top: isAdminPreview ? '30px' : '0' }}>
        <div className="flex items-center gap-3">
          {!['ClientDashboard', 'IndependentDashboard', 'ClientWorkouts', 'ClientMeals'].includes(currentPageName) ? (
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-foreground hover:bg-green-950/50">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-foreground hover:bg-green-950/50">
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          )}
          <div className="flex items-center gap-2">
            {trainerProfile?.data?.business_logo_url || trainerProfile?.business_logo_url ? (
              <img src={trainerProfile?.data?.business_logo_url || trainerProfile?.business_logo_url} alt="Logo" className="w-8 h-8 object-contain rounded" />
            ) : appLogoUrl ? (
              <img src={appLogoUrl} alt="Logo" className="w-8 h-8 object-contain rounded" />
            ) : (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2CD49F, #10b981)' }}>
                <Flame className="w-4 h-4 text-[#0A0A0A]" />
              </div>
            )}
            <span className="font-bold text-base text-foreground tracking-wide">
              {trainerProfile ? (trainerProfile.data?.business_name || trainerProfile.business_name || "ApexCoach") : "ApexCoach"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && <NotificationBell user={user} />}
          <Avatar className="h-9 w-9 ring-2 ring-[#00E676]/50 transition-all duration-300">
            <AvatarImage src={clientProfile?.avatar_url || user?.avatar_url} />
            <AvatarFallback className="text-sm font-bold text-[#0A0A0A]" style={{ background: 'linear-gradient(135deg, #00E676, #008f49)' }}>
              {(user?.data?.full_name || user?.full_name || clientProfile?.full_name || user?.email || "?")[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 w-72 z-40 transition-transform duration-300 ease-out lg:translate-x-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )} style={{
        top: 0,
        bottom: 0,
        background: 'hsl(var(--sidebar-background))',
        borderRight: '1px solid hsl(var(--border))',
        paddingTop: 'calc(56px + env(safe-area-inset-top))'
      }}>
        
        {/* Logo */}
        <div className="flex-shrink-0 h-20 pt-4 flex items-center gap-3 px-6" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          {trainerProfile?.data?.business_logo_url || trainerProfile?.business_logo_url ? (
            <img src={trainerProfile?.data?.business_logo_url || trainerProfile?.business_logo_url} alt="Logo" className="w-10 h-10 object-contain rounded" />
          ) : appLogoUrl ? (
            <img src={appLogoUrl} alt="Logo" className="w-10 h-10 object-contain rounded" />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2CD49F, #10b981)', color: 'hsl(var(--card))' }}>
              <Flame className="w-6 h-6" />
            </div>
          )}
          <div>
            <span className="font-black text-lg tracking-wider text-foreground">
              {trainerProfile ? (trainerProfile.data?.business_name || trainerProfile.business_name || "ApexCoach") : "ApexCoach"}
            </span>
            <p className="text-muted-foreground text-xs tracking-wide" style={{ fontWeight: 700 }}>
              {clientProfile && clientProfile.trainer_id === null ? "Personal training" : "Client portal"}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6" style={{ paddingBottom: '24px', WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
          {clientNavGroups.map((group, gIdx) => {
            const isIndependent = clientProfile && clientProfile.trainer_id === null;

            const visibleItems = group.items.filter(item => {
              const featureKey = PAGE_FEATURE_MAP[item.page];
              if (featureKey && portalFeatures[featureKey] === false) return false;
              if (isIndependent && ['ClientCommunity', 'Messages'].includes(item.page)) return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1">
                <h4 className="px-4 text-xs font-semibold tracking-wider text-[#8F95B2] uppercase mb-2">{group.title}</h4>
                {visibleItems.map((item) => {
                  let pageName = item.page;
                  if (isIndependent && item.page === 'ClientDashboard') pageName = 'IndependentDashboard';
                  
                  const pageGroups = {
                    'ClientWorkouts': ['ClientWorkouts', 'ClientRecovery'],
                    'ClientMeals': ['ClientMeals'],
                    'ClientHabits': ['ClientHabits', 'ClientJournal']
                  };
                  const isActive = currentPageName === pageName || (pageGroups[item.page] && pageGroups[item.page].includes(currentPageName));
                  
                  return (
                    <Link
                      key={pageName}
                      to={createPageUrl(pageName)}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3 rounded-[20px] transition-all duration-300 group relative whitespace-nowrap mx-3",
                        isActive ? "text-foreground bg-secondary font-semibold border border-border" : "text-[#8F95B2] hover:text-foreground hover:bg-accent border border-transparent"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-colors", isActive ? "text-[#2CD49F]" : "text-[#8F95B2] group-hover:text-foreground")} />
                      <span className="text-sm">{item.name}</span>
                      {item.page === 'Messages' && unreadMessages.length > 0 && (
                        <Badge className="ml-auto bg-red-600 text-white hover:bg-red-700 text-[10px] px-1.5 py-0 min-w-5 h-5 flex items-center justify-center rounded-full border-0">
                          {unreadMessages.length > 99 ? '99+' : unreadMessages.length}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User section */}
        <div className="flex-shrink-0 p-4 pb-[calc(1rem+60px+env(safe-area-inset-bottom))] lg:pb-4 space-y-2" style={{ borderTop: '1px solid rgba(0, 230, 118, 0.1)', background: 'transparent' }}>
          {isAdminPreview && (
            <button
              onClick={exitClientPreview}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}
            >
              <Eye className="w-4 h-4 flex-shrink-0" />
              Exit Client Preview
            </button>
          )}
          {user?.role === 'admin' && !isAdminPreview && (
            <button
              onClick={() => {
                localStorage.setItem('adminViewMode', JSON.stringify('full'));
                window.location.href = createPageUrl('Dashboard');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 mb-2 rounded-xl text-sm font-medium bg-primary/10 border border-primary/25 text-primary hover:bg-primary/15 transition"
            >
              <Eye className="w-4 h-4 flex-shrink-0" />
              Admin dashboard
            </button>
          )}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary border border-border">
            <Avatar className="h-9 w-9 ">
              <AvatarImage src={clientProfile?.avatar_url || user?.avatar_url} />
              <AvatarFallback className="text-sm font-bold text-white bg-primary">
                {(user?.data?.full_name || user?.full_name || clientProfile?.full_name || user?.email || "?")[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{user?.data?.full_name || user?.full_name || clientProfile?.full_name || (clientProfile?.trainer_id === null ? "Individual" : "Client")}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => base44.auth.logout()} className="text-gray-600 hover:text-red-400 hover:bg-red-950/40 h-8 w-8">
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen &&
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      }

      {/* Desktop Top Navbar */}
      <div className="hidden lg:flex fixed top-0 right-0 left-72 z-40 h-20 items-center justify-between px-8 bg-background border-b border-border transition-all">
        <div className="flex-1 max-w-md relative">
          <div className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
          </div>
          <input type="text" placeholder="Search anything..." className="w-full bg-background border border-border rounded-full py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors shadow-inner" />
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell user={user} />
          <div className="bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full">
            <span className="text-xs font-bold tracking-wide text-primary">CLIENT</span>
          </div>
          <Avatar className="h-10 w-10 ring-2 ring-[#00E676]/30 hover:scale-105 transition-transform cursor-pointer">
            <AvatarImage src={clientProfile?.avatar_url || user?.avatar_url} />
            <AvatarFallback className="text-sm font-bold text-black bg-gradient-to-br from-[#00E676] to-[#00A859]">
              {(user?.data?.full_name || user?.full_name || clientProfile?.full_name || user?.email || "?")[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Main content */}
      <main className={cn("lg:pl-72 min-h-screen lg:pb-0 w-full overflow-x-hidden", currentPageName === 'VisionBoard' ? "overflow-hidden" : "")} style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))', paddingTop: 'calc(80px + env(safe-area-inset-top))' }}>
        {currentPageName === 'VisionBoard' ? (
          <div className="p-2 sm:p-4 max-w-[1400px] mx-auto h-[calc(100vh-136px)] lg:h-[calc(100vh-56px)] flex flex-col" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full flex-1"
              >
                {gatedChildren}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <PullToRefresh onRefresh={handleRefresh} pullingContent="" refreshingContent={<div className="flex justify-center p-4"><div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <div className="p-3 sm:p-4 lg:p-6 max-w-[1400px] mx-auto min-h-[calc(100vh-80px)]" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}>

                  <FeatureGuide currentPageName={currentPageName} />
                  {gatedChildren}
                </motion.div>
              </AnimatePresence>
            </div>
          </PullToRefresh>
        )}
      </main>

      <ClientBottomNav currentPageName={currentPageName} user={user} clientProfile={clientProfile} unreadMessages={unreadMessages} portalFeatures={portalFeatures} />
    </div>);

}