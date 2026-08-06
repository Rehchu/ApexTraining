import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import ClientLayout from "@/components/ClientLayout";
import { useTheme } from "@/components/hooks/useTheme";
import CommandPalette from "@/components/CommandPalette";
import BottomNav from "@/components/BottomNav";
import PullToRefresh from "react-simple-pull-to-refresh";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Dumbbell,
  Utensils,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Zap,
  MessageCircle,
  Library,
  FileText,
  DollarSign,
  Users2,
  Map,
  Flame,
  Mail,
  ArrowLeft,
  Bug,
  Target,
  Briefcase,
  BookOpen,
  Bot,
  Eye,
  EyeOff,
  TrendingDown,
  BarChart3,
  Share2,
  Upload,
  Package as PackageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/notifications/NotificationBell";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import OfflineMessage from "@/components/OfflineMessage";
import { Badge } from "@/components/ui/badge";
import ClientPreviewPicker from "@/components/ClientPreviewPicker";
import FeatureGuide from "@/components/FeatureGuide";

const navGroups = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
    ]
  },
  {
    title: "Clients & CRM",
    items: [
      { name: "Clients", icon: Users, page: "Clients" },
      { name: "CRM", icon: Target, page: "CRM" },
      { name: "Notebooks", icon: BookOpen, page: "ClientNotebooks" },
      { name: "Contracts", icon: FileText, page: "Contracts" },
      { name: "Schedule", icon: CalendarDays, page: "Schedule" }
    ]
  },
  {
    title: "Programs",
    items: [
      { name: "Resources", icon: Library, page: "Resources" },
      { name: "Bulk Import", icon: Upload, page: "BulkImport" }
    ]
  },
  {
    title: "Business",
    items: [
      { name: "Business Hub", icon: Briefcase, page: "BusinessHub" }
    ]
  },
  {
    title: "Growth",
    items: [
      { name: "Community", icon: Users2, page: "TrainerCommunity" },
      { name: "Journal Insights", icon: BookOpen, page: "TrainerJournalInsights" },
      { name: "AI Assistant", icon: Bot, page: "TrainerAssistant" }
    ]
  },
  {
    title: "Admin Tools",
    items: [
      { name: "Contact Msgs", icon: Mail, page: "AdminContactMessages" },
      { name: "Bugs", icon: Bug, page: "AdminBugs" }
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



// Pure admin navigation — platform oversight, no trainer CRM tools.
const adminNavGroups = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    ]
  },
  {
    title: 'Platform',
    items: [
      { name: 'Messages', icon: MessageCircle, page: 'Messages' },
      { name: 'Contact Messages', icon: Mail, page: 'AdminContactMessages' },
      { name: 'Bug Reports', icon: Bug, page: 'AdminBugs' },
    ]
  },
  {
    title: 'Content',
    items: [
      { name: 'Resources', icon: Library, page: 'Resources' },
      { name: 'Contracts', icon: FileText, page: 'Contracts' },
      { name: 'Community', icon: Users2, page: 'TrainerCommunity' },
    ]
  },
  {
    title: 'More',
    items: [
      { name: 'Settings', icon: Settings, page: 'Settings' },
    ]
  }
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isTrainer, setIsTrainer] = useState(false);
  const [isBetaTrainer, setIsBetaTrainer] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('adminViewMode');
      if (!saved) return 'full';
      // Handle both raw strings and JSON stringified strings
      if (saved === 'client' || saved === '"client"') return 'client';
      if (saved === 'full' || saved === '"full"') return 'full';
      return JSON.parse(saved);
    } catch (e) {
      return 'full';
    }
  });
  const [clientPreviewId, setClientPreviewId] = useState(() => localStorage.getItem('clientPreviewId') || null);
  const [clientPreviewPickerOpen, setClientPreviewPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appLogoUrl, setAppLogoUrl] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isRootPage = [...navGroups, ...adminNavGroups].some(group => group.items.some(item => item.page === currentPageName)) || ['Dashboard'].includes(currentPageName);

  const { data: user, isLoading: isAuthLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
  });

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ["unreadMessages", user?.id],
    queryFn: () => base44.entities.Message.filter({ receiver_id: user?.id, read: false }),
    enabled: !!user?.id,
    refetchInterval: 60000
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  const { data: isClientUserCheck, isLoading: isClientCheckLoading } = useQuery({
    queryKey: ["userRoleCheck", user?.id, adminViewMode],
    queryFn: async () => {
      if (!user) return { isClientUser: false, isTrainerUser: false, hasBetaKey: false };

      const hasBetaKey = user.beta_key_used === true;
      const customId = user?.data?.custom_id || user?.custom_id;

      let isClientUser = false;
      let isTrainerUser = false;

      if (customId && customId.startsWith('CLIEN-')) {
        isClientUser = true;
      } else if (customId && customId.startsWith('TRAIN-')) {
        isTrainerUser = true;
      } else {
        const effectiveUserType = user.user_type 
            || user.data?.user_type 
            || user.data?.data?.user_type
            || user.data?.data?.data?.user_type;
        if (effectiveUserType === 'trainer') {
          isTrainerUser = true;
          isClientUser = false;
        } else if (effectiveUserType === 'client' || effectiveUserType === 'independent') {
          isClientUser = true;
          isTrainerUser = false;
        } else {
          try {
            const clientRecords = await base44.entities.Client.filter({ email: user.email });
            isClientUser = clientRecords.length > 0;
          } catch (err) {}

          if (!isClientUser) {
            isTrainerUser = user.role === 'trainer' || user.role === 'admin';
          }

          if (!isClientUser && !isTrainerUser && user.role !== 'admin') {
            isClientUser = true;
          }
        }
      }

      if (user.role === 'admin' && user.user_type !== 'independent') {
        if (adminViewMode === 'client') {
          isClientUser = true;
          isTrainerUser = false;
        } else {
          isClientUser = false;
          isTrainerUser = true;
        }
      }

      return { isClientUser, isTrainerUser, hasBetaKey };
    },
    enabled: !!user,
    staleTime: 300000,
  });

  useEffect(() => {
    if (isClientUserCheck) {
      setIsClient(isClientUserCheck.isClientUser);
      setIsTrainer(isClientUserCheck.isTrainerUser);
      setIsBetaTrainer(isClientUserCheck.hasBetaKey);
    }
  }, [isClientUserCheck]);

  useEffect(() => {
    if (!isAuthLoading && !isClientCheckLoading) {
      setIsLoading(false);
    }
  }, [isAuthLoading, isClientCheckLoading]);

  // This useEffect (empty dependency) for initial app data load (like logo) and sets up profile update listener.
  useEffect(() => {
    let isMounted = true; // Local isMounted for logo fetch within this effect
    
    // Fetch app logo once on initial mount
    const fetchAppLogo = async () => {
      try {
        const logoRes = await base44.functions.invoke('getAppLogo', {});
        if (isMounted && logoRes.data?.logoUrl) {
          setAppLogoUrl(logoRes.data.logoUrl);
        }
      } catch (err) {
        // Logo fetch is optional, suppress console error
      }
    };
    fetchAppLogo();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["userRoleCheck"] });
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);

    const handleOpenPicker = () => setClientPreviewPickerOpen(true);
    document.addEventListener('openClientPicker', handleOpenPicker);

    return () => {
      isMounted = false; // Cleanup local isMounted for logo fetch
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      document.removeEventListener('openClientPicker', handleOpenPicker);
    };
  }, [queryClient, setAppLogoUrl]);

  // Applies the saved light/dark/system preference (Settings → App).
  useTheme();

  // Set viewport for PWA and safe area support
  useEffect(() => {
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.name = 'theme-color';
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = '#080808';
  }, []);

  // Register service worker for PWA support
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/serviceWorker.js').catch(() => {
        // Service worker registration failed - app will still work
      });
    }
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Public pages - no layout
  const publicPages = ['Home', 'PublicHome', 'About', 'Contact', 'PrivacyPolicy', 'Terms', 'DataPolicy', 'WaitingList'];
  
  useEffect(() => {
    if (!isLoading && !user && !publicPages.includes(currentPageName)) {
      // Small delay to avoid redirect race during adminViewMode transitions
      const timer = setTimeout(() => {
        base44.auth.redirectToLogin(window.location.href);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, user, currentPageName]);

  if (isLoading || (!user && !publicPages.includes(currentPageName))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#d4a017] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (publicPages.includes(currentPageName)) {
    return children;
  }

  // Client pages - use client layout
  const clientPages = ['ClientDashboard', 'ClientWorkouts', 'ClientMeals', 'ClientProgress', 'ClientSchedule', 'ClientHabits', 'ClientOnboarding', 'Messages', 'ClientResources', 'ClientCommunity', 'ClientInfo', 'ReportBug', 'ClientJournal', 'OnboardingWalkthrough', 'ClientRecovery', 'ClientDocuments'];

  // Always use client layout if user is a client
  if (isClient) {
    return <ClientLayout children={children} currentPageName={currentPageName} />;
  }

  // Use client layout if a trainer/admin is viewing an exclusive client page
  const exclusiveClientPages = clientPages.filter((p) => !['Messages', 'ReportBug'].includes(p));
  if (exclusiveClientPages.includes(currentPageName)) {
    return <ClientLayout children={children} currentPageName={currentPageName} />;
  }



  return (
    <div className="min-h-screen bg-background">
      <OfflineMessage />
      {adminViewMode === 'client' && (
        <div className="fixed top-0 left-0 right-0 z-[999] flex items-center justify-center gap-3 px-4 py-1.5 text-xs font-bold text-black" style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a)', boxShadow: '0 2px 12px rgba(34,197,94,0.4)' }}>
          <Eye className="w-3.5 h-3.5" />
          Client portal PREVIEW MODE
          <button
            onClick={() => {
              localStorage.setItem('adminViewMode', JSON.stringify('full'));
              setAdminViewMode('full');
              window.location.href = createPageUrl('Dashboard');
            }}
            className="ml-2 underline hover:no-underline"
          >
            Exit
          </button>
        </div>
      )}
      {/* Mobile header */}
      <header className={cn("lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between", isClient ? "hidden" : "")}
      style={{ background: 'hsl(var(--sidebar-background))', borderBottom: '1px solid hsl(var(--border))', height: 'calc(56px + env(safe-area-inset-top))', paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' }}>
        <div className="flex items-center gap-3">
          {!['Dashboard', 'Clients', 'Workouts', 'Schedule'].includes(currentPageName) ? (
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-foreground hover:bg-accent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-foreground hover:bg-accent">
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          )}
          <div className="flex items-center gap-2">
            {user?.data?.business_logo_url || user?.business_logo_url ?
            <img src={user?.data?.business_logo_url || user?.business_logo_url} alt="Logo" className="w-8 h-8 object-contain rounded" /> :
            appLogoUrl ?
            <img src={appLogoUrl} alt="Logo" className="w-8 h-8 object-contain rounded" /> :

            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2CD49F, #10b981)' }}>
                <Flame className="w-4 h-4 text-primary-foreground" />
              </div>
            }
            <span className="font-black text-base tracking-wider text-foreground">
              {user ? (user.data?.business_name || user.business_name || "ApexCoach") : "ApexCoach"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && <NotificationBell user={user} />}
          {user &&
          <Avatar className="h-9 w-9 ring-2 ring-[#2CD49F]/50 transition-all duration-300">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="text-sm font-bold text-primary-foreground" style={{ background: 'linear-gradient(135deg, #2CD49F, #10b981)' }}>
                {(user.data?.full_name || user.full_name)?.[0] || user.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          }
        </div>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 w-72 z-40 transition-transform duration-300 ease-out lg:translate-x-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        isClient ? "hidden lg:flex" : ""
      )} style={{
        top: 0,
        bottom: 0,
        background: 'hsl(var(--sidebar-background))',
        borderRight: '1px solid hsl(var(--border))',
        overscrollBehavior: 'contain',
        paddingTop: 'calc(56px + env(safe-area-inset-top))'
      }}>
        
        {/* Logo */}
        <div className="flex-shrink-0 h-20 pt-4 flex items-center gap-3 px-6" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          {user?.data?.business_logo_url || user?.business_logo_url ?
          <img src={user?.data?.business_logo_url || user?.business_logo_url} alt="Logo" className="w-10 h-10 object-contain rounded" /> :
          appLogoUrl ?
          <img src={appLogoUrl} alt="Logo" className="w-10 h-10 object-contain rounded" /> :

          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2CD49F, #10b981)', color: 'hsl(var(--card))' }}>
              <Flame className="w-6 h-6" />
            </div>
          }
          <div className="flex-1 min-w-0">
            <span className="font-black text-lg tracking-wider text-foreground block truncate">
              {user ? (user.data?.business_name || user.business_name || "ApexCoach") : "ApexCoach"}
            </span>
            <p className="text-foreground text-xs tracking-wide truncate" style={{ fontWeight: 700 }}>
              {user?.role === 'admin' ? 'Admin' : 'Trainer'}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent" style={{ paddingBottom: '24px', WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
          {(user?.role === 'admin' && adminViewMode !== 'trainer' ? adminNavGroups : navGroups).map((group, gIdx) => {
            const visibleItems = group.items.filter(item => {
              if (item.page === "AdminContactMessages" && user?.role !== 'admin') return false;
              if (item.page === "AdminBugs" && user?.role !== 'admin') return false;
              if (item.page === "ReportBug" && user?.role === 'admin') return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1">
                <h4 className="px-4 text-xs font-semibold tracking-wider text-[#8F95B2] uppercase mb-2">{group.title}</h4>
                {visibleItems.map((item) => {
                  let pageName = item.page;
                  let displayName = item.name;
                  const pageGroups = {
                    'BusinessHub': ['BusinessHub']
                  };
                  const isActive = currentPageName === pageName || (pageGroups[pageName] && pageGroups[pageName].includes(currentPageName));
                  
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
                      <span className="text-sm">{displayName}</span>
                      {item.page === 'Messages' && unreadMessages.length > 0 &&
                      <Badge className="ml-auto bg-red-600 text-white hover:bg-red-700 text-[10px] px-1.5 py-0 min-w-5 h-5 flex items-center justify-center rounded-full border-0">
                          {unreadMessages.length > 99 ? '99+' : unreadMessages.length}
                        </Badge>
                      }
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User section */}
        {user &&
        <div className="flex-shrink-0 p-4 pb-[calc(1rem+60px+env(safe-area-inset-bottom))] lg:pb-4 space-y-2" style={{ borderTop: '1px solid rgba(0, 230, 118, 0.1)', background: 'transparent' }}>
            {/* Admin: return from trainer view */}
            {user?.role === 'admin' && adminViewMode === 'trainer' && (
              <button
                onClick={() => {
                  localStorage.setItem('adminViewMode', JSON.stringify('full'));
                  setAdminViewMode('full');
                  window.location.href = createPageUrl('Dashboard');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-sm bg-primary/10 border border-primary/25 text-primary"
              >
                <EyeOff className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left font-medium">Back to Admin</span>
              </button>
            )}
            {/* Client Preview Toggle */}
            {adminViewMode === 'client' ? (
              <button
                onClick={() => {
                  localStorage.setItem('adminViewMode', JSON.stringify('full'));
                  localStorage.removeItem('clientPreviewId');
                  setAdminViewMode('full');
                  setClientPreviewId(null);
                  window.location.href = createPageUrl('Dashboard');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-sm"
                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}
              >
                <EyeOff className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left font-medium">Exit Client View</span>
              </button>
            ) : (
              <button
                onClick={() => setClientPreviewPickerOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-sm"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}
              >
                <Eye className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left font-medium">Preview Client Portal</span>
              </button>
            )}

            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Avatar className="h-9 w-9 ring-2 ring-[#2CD49F]/50 flex-shrink-0">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="text-sm font-bold text-primary-foreground" style={{ background: 'linear-gradient(135deg, #2CD49F, #10b981)' }}>
                  {(user.data?.full_name || user.full_name)?.[0] || user.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{user.data?.full_name || user.full_name || "Trainer"}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <NotificationBell user={user} />
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-600 hover:text-red-400 hover:bg-red-950/40 h-8 w-8 flex-shrink-0">
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        }
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
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('apex:open-command-palette'))}
            className="w-full flex items-center bg-background border border-border rounded-full py-2.5 pl-10 pr-3 text-sm text-muted-foreground hover:border-primary/50 focus:outline-none focus:border-primary/50 transition-colors shadow-inner text-left"
          >
            <span className="flex-1">Search pages, clients, actions...</span>
            <kbd className="ml-2 hidden xl:inline-flex items-center gap-0.5 rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell user={user} />
          <div className="bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full">
            <span className="text-xs font-bold tracking-wide text-primary">{user?.role === 'admin' ? 'Admin' : 'Trainer'}</span>
          </div>
          <Avatar className="h-10 w-10 ring-2 ring-[#00E676]/30 hover:scale-105 transition-transform cursor-pointer">
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback className="text-sm font-bold text-black bg-gradient-to-br from-[#00E676] to-[#00A859]">
              {(user?.data?.full_name || user?.full_name)?.[0] || "T"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Main content */}
      <main className="lg:pl-72 min-h-screen lg:pb-0 w-full overflow-x-hidden" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))', paddingTop: 'calc(80px + env(safe-area-inset-top))' }}>
        {/* Floating AI Orb */}
        <Link to={createPageUrl("TrainerAssistant")} className="fixed bottom-24 lg:bottom-8 right-6 z-50 flex items-center justify-center pointer-events-none group hidden md:flex">
          <div className="w-14 h-14 bg-gradient-to-br from-[#2CD49F] to-[#10b981] rounded-full border-2 border-border flex items-center justify-center animate-bounce pointer-events-auto cursor-pointer hover:scale-110 transition-transform">
            <Bot className="w-6 h-6 text-primary-foreground" />
          </div>
        </Link>
        <PullToRefresh onRefresh={handleRefresh} pullingContent="" refreshingContent={<div className="flex justify-center p-4"><div className="w-6 h-6 border-2 border-[#d4a017] border-t-transparent rounded-full animate-spin" /></div>}>
          <div className="p-4 lg:p-6 max-w-[1400px] mx-auto min-h-[calc(100vh-80px)]" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}>

                <FeatureGuide currentPageName={currentPageName} />
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </PullToRefresh>
      </main>

      {!isClient && <BottomNav user={user} unreadMessages={unreadMessages} />}
      <CommandPalette isClient={false} />
      <PWAInstallPrompt />

      <ClientPreviewPicker
        open={clientPreviewPickerOpen}
        onOpenChange={setClientPreviewPickerOpen}
        trainerId={user?.id}
        onSelect={(client) => {
          localStorage.setItem('adminViewMode', JSON.stringify('client'));
          localStorage.setItem('clientPreviewId', client.id);
          localStorage.setItem('clientPreviewEmail', client.email);
          setClientPreviewId(client.id);
          setAdminViewMode('client');
          setClientPreviewPickerOpen(false);
          window.location.href = createPageUrl('ClientDashboard');
        }}
      />
    </div>);

}