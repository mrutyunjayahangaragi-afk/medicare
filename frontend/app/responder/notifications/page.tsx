"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NotificationList from "@/components/notifications/NotificationList";
import NotificationRealtimeSync from "@/components/notifications/NotificationRealtimeSync";
import type { Database } from "@/types/database";

export default function ResponderNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Database["public"]["Tables"]["notifications"]["Row"][]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[ResponderNotifications] Failed to fetch notifications:", error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error("[ResponderNotifications] Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const supabase = createClient();
      await supabase.rpc("mark_notification_read", { p_notification_id: id });
      
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
    } catch (error) {
      console.error("[ResponderNotifications] Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const supabase = createClient();
      await supabase.rpc("mark_all_notifications_read()");
      
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    } catch (error) {
      console.error("[ResponderNotifications] Failed to mark all as read:", error);
    }
  };

  const handleNotificationClick = (notification: Database["public"]["Tables"]["notifications"]["Row"]) => {
    if (notification.request_id) {
      if (notification.type === "new_message") {
        router.push(`/responder/messages/${notification.request_id}`);
      } else {
        router.push(`/responder/requests/${notification.request_id}`);
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <NotificationRealtimeSync
        onNewNotification={(notification) => {
          setNotifications((prev) => [notification, ...prev]);
        }}
        onNotificationUpdate={(notification) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === notification.id ? notification : n))
 );
        }}
      />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 mb-8"
        >
          <button
            onClick={() => router.push("/responder")}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="Go back to dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Notifications</h1>
        </motion.div>

        {/* Notifications List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <NotificationList
            notifications={notifications}
            isLoading={isLoading}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onNotificationClick={handleNotificationClick}
          />
        </motion.div>
      </div>
    </div>
  );
}
