"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { useRouter } from "next/navigation";

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: "user" | "responder";
}

export default function NotificationDropdown({
  isOpen,
  onClose,
  userRole,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Database["public"]["Tables"]["notifications"]["Row"][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("[NotificationDropdown] Failed to fetch notifications:", error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error("[NotificationDropdown] Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const supabase = createClient();
      await supabase.rpc("mark_notification_read", { p_notification_id: notificationId });
      
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
    } catch (error) {
      console.error("[NotificationDropdown] Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      const supabase = createClient();
      await supabase.rpc("mark_all_notifications_read()");
      
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    } catch (error) {
      console.error("[NotificationDropdown] Failed to mark all as read:", error);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNotificationClick = (notification: Database["public"]["Tables"]["notifications"]["Row"]) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.request_id) {
      const basePath = userRole === "responder" ? "/responder" : "/dashboard";
      if (notification.type === "new_message") {
        router.push(`${basePath}/messages/${notification.request_id}`);
      } else {
        router.push(`${basePath}/requests/${notification.request_id}`);
      }
    }
    onClose();
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "request_accepted":
      case "assignment_received":
        return <Check className="w-4 h-4 text-green-600" />;
      case "responder_on_the_way":
      case "responder_nearby":
        return <Bell className="w-4 h-4 text-blue-600" />;
      case "responder_arrived":
        return <CheckCheck className="w-4 h-4 text-emerald-600" />;
      case "request_completed":
        return <CheckCheck className="w-4 h-4 text-green-600" />;
      case "request_cancelled":
        return <X className="w-4 h-4 text-red-600" />;
      case "new_message":
        return <Bell className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50"
          ref={dropdownRef}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={isMarkingAll}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {isMarkingAll ? "Marking..." : "Mark all read"}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${
                    !notification.is_read ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm">{notification.title}</p>
                      <p className="text-xs text-slate-600 truncate">{notification.message}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(notification.created_at)}</p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-100">
            <button
              onClick={() => {
                router.push(userRole === "responder" ? "/responder/notifications" : "/dashboard/notifications");
                onClose();
              }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all notifications
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
