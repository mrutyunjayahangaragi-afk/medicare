"use client";

import { motion } from "framer-motion";
import { Check, CheckCheck, X, Bell, AlertCircle } from "lucide-react";
import type { Database } from "@/types/database";

interface NotificationItemProps {
  notification: Database["public"]["Tables"]["notifications"]["Row"];
  onMarkAsRead: (id: string) => void;
  onClick: (notification: Database["public"]["Tables"]["notifications"]["Row"]) => void;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
}: NotificationItemProps) {
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
        return <Check className="w-5 h-5 text-green-600" />;
      case "responder_on_the_way":
      case "responder_nearby":
        return <Bell className="w-5 h-5 text-blue-600" />;
      case "responder_arrived":
        return <CheckCheck className="w-5 h-5 text-emerald-600" />;
      case "request_completed":
        return <CheckCheck className="w-5 h-5 text-green-600" />;
      case "request_cancelled":
        return <X className="w-5 h-5 text-red-600" />;
      case "new_message":
        return <Bell className="w-5 h-5 text-indigo-600" />;
      case "request_submitted":
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    onClick(notification);
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm ${
        !notification.is_read
          ? "bg-blue-50 border-blue-200"
          : "bg-white border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          !notification.is_read ? "bg-white" : "bg-slate-100"
        }`}>
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-slate-900">{notification.title}</h4>
            {!notification.is_read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
            )}
          </div>
          <p className="text-sm text-slate-600 mt-1 line-clamp-2">{notification.message}</p>
          <p className="text-xs text-slate-400 mt-2">{formatRelativeTime(notification.created_at)}</p>
        </div>
      </div>
    </motion.button>
  );
}
