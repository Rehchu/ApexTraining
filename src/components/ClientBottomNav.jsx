import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Dumbbell, Utensils, LineChart, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const navItems = [
  { name: "Today", icon: LayoutDashboard, page: "ClientDashboard", feature: "dashboard" },
  { name: "Workouts", icon: Dumbbell, page: "ClientWorkouts", feature: "workouts" },
  { name: "Nutrition", icon: Utensils, page: "ClientMeals", feature: "nutrition" },
  { name: "Progress", icon: LineChart, page: "ClientProgress", feature: "progress" },
];

export default function ClientBottomNav({ currentPageName, user, clientProfile, unreadMessages = [], portalFeatures = {} }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const { data: unreadNotifications = [] } = useQuery({
    queryKey: ["unreadNotifications", user?.id],
    queryFn: () => base44.entities.Notification.filter({ user_id: user?.id, read: false }),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const isIndependent = clientProfile && clientProfile.trainer_id === null;

  useEffect(() => {
    const activeItem = navItems.find((item) => {
      let pageName = item.page;
      if (isIndependent && item.page === "ClientDashboard") pageName = "IndependentDashboard";
      return currentPath === createPageUrl(pageName) || currentPath.startsWith(createPageUrl(pageName) + "/");
    });
    if (activeItem) {
      let pageName = activeItem.page;
      if (isIndependent && activeItem.page === "ClientDashboard") pageName = "IndependentDashboard";
      sessionStorage.setItem(`nav_${pageName}`, currentPath + location.search);
    }
  }, [currentPath, location.search, isIndependent]);

  const badgeCount = unreadMessages.length + unreadNotifications.length;

  return (
    <nav className="apex-bottom-nav fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="flex items-stretch justify-around h-[62px]">
        {navItems.filter((item) => item.feature === "dashboard" || portalFeatures[item.feature] !== false).map((item) => {
          let pageName = item.page;
          if (isIndependent && item.page === "ClientDashboard") pageName = "IndependentDashboard";

          const Icon = item.icon;
          const isActive = currentPageName === pageName;

          return (
            <Link
              key={pageName}
              to={isActive ? createPageUrl(pageName) : sessionStorage.getItem(`nav_${pageName}`) || createPageUrl(pageName)}
              replace={true}
              onClick={() => {
                if (isActive) {
                  sessionStorage.removeItem(`nav_${pageName}`);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="flex flex-col items-center justify-center flex-1 gap-1 group"
            >
              <div className={`relative px-3 py-1 rounded-xl transition-colors ${isActive ? "bg-primary/15" : ""}`}>
                <Icon className={`w-5 h-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                {item.page === "ClientDashboard" && badgeCount > 0 && (
                  <Badge className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] px-1 py-0 min-w-[16px] h-4 flex items-center justify-center rounded-full border-0">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </Badge>
                )}
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* More — opens the slide-in menu */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("apex:open-menu"))}
          className="flex flex-col items-center justify-center flex-1 gap-1"
        >
          <div className="px-3 py-1 rounded-xl">
            <Menu className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">More</span>
        </button>
      </div>
    </nav>
  );
}
