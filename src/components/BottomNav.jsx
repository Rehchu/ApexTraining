import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "../utils";
import { LayoutDashboard, Users, MessageCircle, CalendarDays, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const navItems = [
  { name: "Home", icon: LayoutDashboard, page: "Dashboard", accent: { color: '#d4a017', rgba: '212,175,55' } },
  { name: "Clients", icon: Users, page: "Clients", accent: { color: '#22c55e', rgba: '34,197,94' } },
  { name: "Workouts", icon: Dumbbell, page: "Workouts", accent: { color: '#ef4444', rgba: '239,68,68' } },
  { name: "Schedule", icon: CalendarDays, page: "Schedule", accent: { color: '#8b5cf6', rgba: '139,92,246' } },
];

export default function BottomNav({ user, unreadMessages = [] }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const { data: unreadNotifications = [] } = useQuery({
    queryKey: ["unreadNotifications", user?.id],
    queryFn: () => base44.entities.Notification.filter({ user_id: user?.id, read: false }),
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  useEffect(() => {
    const activeItem = navItems.find(item => currentPath === createPageUrl(item.page) || currentPath.startsWith(createPageUrl(item.page) + '/'));
    if (activeItem) {
      sessionStorage.setItem(`nav_${activeItem.page}`, currentPath + location.search);
    }
  }, [currentPath, location.search]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{
        background: 'hsl(var(--background))',
        borderTop: '1px solid hsl(var(--border))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      <div className="flex items-stretch justify-around" style={{ height: '60px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === createPageUrl(item.page);

          return (
            <Link
              key={item.name}
              to={isActive ? createPageUrl(item.page) : (sessionStorage.getItem(`nav_${item.page}`) || createPageUrl(item.page))}
              replace={true}
              onClick={() => {
                if (isActive) {
                   sessionStorage.removeItem(`nav_${item.page}`);
                   window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top if already active
                }
              }}
              className="flex flex-col items-center justify-center flex-1 gap-0.5 transition-all duration-300 group"
            >
              <div
                className="p-2 rounded-xl transition-all relative"
                style={isActive ? {
                  background: `rgba(0, 230, 118, 0.15)`,
                  boxShadow: '0 0 10px rgba(0,230,118,0.2)'
                } : {}}
              >
                <Icon className="w-5 h-5 transition-transform group-hover:scale-110" style={{ color: isActive ? '#00E676' : '#9496A1', filter: isActive ? 'drop-shadow(0 0 5px rgba(0,230,118,0.5))' : 'none' }} />
                {item.page === 'Messages' && unreadMessages.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] px-1 py-0 min-w-[16px] h-4 flex items-center justify-center rounded-full border-0 shadow-lg">
                    {unreadMessages.length > 99 ? '99+' : unreadMessages.length}
                  </Badge>
                )}
                {item.page === 'Dashboard' && unreadNotifications.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] px-1 py-0 min-w-[16px] h-4 flex items-center justify-center rounded-full border-0 shadow-lg">
                    {unreadNotifications.length > 99 ? '99+' : unreadNotifications.length}
                  </Badge>
                )}
              </div>
              <span
                className="text-[9px] font-bold tracking-wider transition-colors"
                style={{ color: isActive ? '#00E676' : '#9496A1', textShadow: isActive ? '0 0 5px rgba(0,230,118,0.3)' : 'none' }}
              >
                {item.name.toUpperCase()}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}