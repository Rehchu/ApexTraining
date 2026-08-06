import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  Library,
  FileText,
  DollarSign,
  Users2,
  Settings,
  Menu,
  X,
  LogOut,
  Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const ADMIN_MENU_ITEMS = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Users", icon: Users, page: "Clients" },
  { name: "Trainers", icon: Users2, page: "TrainerCommunity" },
  { name: "Messages", icon: MessageCircle, page: "Messages" },
  { name: "Resources", icon: Library, page: "Resources" },
  { name: "Contracts", icon: FileText, page: "Contracts" },
  { name: "Settings", icon: Settings, page: "Settings" }
];

export default function AdminCompactMenu({ user, currentPageName, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between"
        style={{ 
          background: 'rgba(8,8,8,0.97)', 
          borderBottom: '1px solid rgba(212,175,55,0.15)', 
          backdropFilter: 'blur(24px)', 
          height: 'calc(56px + env(safe-area-inset-top))',
          paddingTop: 'env(safe-area-inset-top)',
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
          paddingRight: 'max(16px, env(safe-area-inset-right))'
        }}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)} className="text-foreground hover:bg-yellow-950/30">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #d4a017, #f5c842)' }}>
            <Flame className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="font-black text-sm tracking-wider text-foreground">ADMIN</span>
        </div>
        {user && (
          <Avatar className="h-8 w-8 ring-2 ring-yellow-500/30">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="text-xs font-bold text-black" style={{ background: 'linear-gradient(135deg, #d4a017, #f5c842)' }}>
              {(user.data?.full_name || user.full_name)?.[0] || user.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </header>

      {/* Compact Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 z-40 transition-transform duration-300 ease-out lg:translate-x-0 flex flex-col",
        menuOpen ? "translate-x-0" : "-translate-x-full"
      )} style={{ 
        background: 'rgba(6,6,8,0.98)', 
        borderRight: '1px solid rgba(212,175,55,0.1)', 
        backdropFilter: 'blur(24px)',
        paddingTop: 'calc(56px + env(safe-area-inset-top))'
      }}>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {ADMIN_MENU_ITEMS.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "text-yellow-400 bg-yellow-500/15 border border-yellow-500/30" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        {user && (
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-8 w-8 ring-2 ring-yellow-500/20">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="text-xs font-bold text-black" style={{ background: 'linear-gradient(135deg, #d4a017, #f5c842)' }}>
                  {(user.data?.full_name || user.full_name)?.[0] || user.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{user.data?.full_name || user.full_name || "Admin"}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLogout} 
              className="w-full text-xs text-muted-foreground hover:text-red-400 justify-start"
            >
              <LogOut className="w-3 h-3 mr-2" /> Logout
            </Button>
          </div>
        )}
      </aside>

      {/* Mobile overlay */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden" 
          onClick={() => setMenuOpen(false)} 
        />
      )}
    </>
  );
}