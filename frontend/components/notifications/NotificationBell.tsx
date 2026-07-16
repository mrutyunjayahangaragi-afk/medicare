"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { useUserRealtime } from "@/components/realtime/UserRealtimeProvider";

interface NotificationBellProps {
  onClick?: () => void;
}

export default function NotificationBell({ onClick }: NotificationBellProps) {
  let realtimeUnreadCount = 0;

  try {
    const realtime = useUserRealtime();
    realtimeUnreadCount = realtime.unreadCount;
  } catch (error) {
    // Fallback if rendered outside the provider
  }

  const displayCount = realtimeUnreadCount > 99 ? "99+" : realtimeUnreadCount;

  return (
    <button
      onClick={onClick}
      className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
      aria-label={`Notifications${realtimeUnreadCount > 0 ? ` (${realtimeUnreadCount} unread)` : ""}`}
    >
      <Bell className="w-5 h-5 text-slate-600" />
      
      <AnimatePresence>
        {realtimeUnreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {displayCount}
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
