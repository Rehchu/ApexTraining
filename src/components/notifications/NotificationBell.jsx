import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function NotificationBell({ user }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => base44.entities.Notification.filter({ user_id: user?.id }, "-created_date", 50),
    enabled: !!user,
    refetchInterval: 60000, // Reduced frequency to avoid rate limits
  });

  useEffect(() => {
    if (!user) return;
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === "create" && event.data.user_id === user.id) {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    });
    return unsubscribe;
  }, [user, queryClient]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const [notifiedIds, setNotifiedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('notified_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [permission, setPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  );

  const requestPermission = async () => {
    if (!('Notification' in window) || !('PushManager' in window)) {
      alert("Push notifications are not supported on this browser or device.");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;

      // Also do the full push subscription
      if (!('serviceWorker' in navigator)) return;
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) return;

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

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8(publicKey)
      });
      await base44.functions.invoke('webPush', { action: 'subscribe', subscription: subscription.toJSON() });
    } catch (e) {
      console.error("Error requesting permission / subscribing", e);
    }
  };

  useEffect(() => {
    if (!notifications.length) return;

    const unreadNotifications = notifications.filter(n => !n.read);
    const newNotifications = unreadNotifications.filter(n => !notifiedIds.includes(n.id));

    if (newNotifications.length > 0) {
      // Show system notifications for new unread notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        newNotifications.forEach(notification => {
          try {
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
              // Try using service worker to show notification (works better on mobile PWAs)
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(notification.title || "New Notification", {
                  body: notification.message,
                  icon: "/icon-192x192.png",
                  data: notification.link || "/"
                });
              });
            } else {
              // Fallback to standard Notification API
              const sysNotif = new Notification(notification.title || "New Notification", {
                body: notification.message,
                icon: "/icon-192x192.png"
              });
              sysNotif.onclick = () => {
                window.focus();
                if (notification.link) navigate(notification.link);
                sysNotif.close();
              };
            }
          } catch (e) {
            console.error("Error showing notification:", e);
          }
        });
      }

      // Update notified IDs
      const newIds = [...notifiedIds, ...newNotifications.map(n => n.id)];
      // Keep only recent 100 IDs to prevent localStorage from growing too large
      const trimmedIds = newIds.slice(-100);
      setNotifiedIds(trimmedIds);
      localStorage.setItem('notified_ids', JSON.stringify(trimmedIds));
    }
  }, [notifications, notifiedIds, navigate]);

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => Promise.all(
      notifications.filter(n => !n.read).map(n => 
        base44.entities.Notification.update(n.id, { read: true })
      )
    ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const safeDateParse = (d) => {
    if (!d) return new Date();
    let str = d;
    if (typeof str === 'string') {
      str = str.replace(' ', 'T');
      if (!str.endsWith('Z') && !str.includes('+') && str.length > 10) {
        str += 'Z';
      }
    }
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 text-white text-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex gap-2">
            {permission === 'default' && (
              <Button
                variant="outline"
                size="sm"
                onClick={requestPermission}
                className="text-xs h-7"
              >
                Enable Push
              </Button>
            )}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                className="text-xs h-7"
              >
                <Check className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "w-full p-4 text-left hover:bg-slate-50 border-b transition-colors",
                  !notification.read && "bg-blue-50/50"
                )}
              >
                <div className="flex gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                    !notification.read ? "bg-blue-600" : "bg-slate-300"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900">{notification.title}</p>
                    <p className="text-xs text-slate-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {safeDateParse(notification.created_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-slate-500 mt-2">No notifications</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}