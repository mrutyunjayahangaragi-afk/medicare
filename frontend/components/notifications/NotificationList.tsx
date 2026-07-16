"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Filter, CheckCheck } from "lucide-react";
import NotificationItem from "./NotificationItem";
import type { Database } from "@/types/database";

type NotificationFilter = "all" | "unread" | "emergency" | "messages" | "system";

interface NotificationListProps {
  notifications: Database["public"]["Tables"]["notifications"]["Row"][];
  isLoading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: Database["public"]["Tables"]["notifications"]["Row"]) => void;
}

export default function NotificationList({
  notifications,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
}: NotificationListProps) {
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const filteredNotifications = notifications.filter((notification) => {
    switch (filter) {
      case "unread":
        return !notification.is_read;
      case "emergency":
        return [
          "request_accepted",
          "responder_on_the_way",
          "responder_nearby",
          "responder_arrived",
          "request_completed",
          "request_cancelled",
        ].includes(notification.type);
      case "messages":
        return notification.type === "new_message";
      case "system":
        return notification.type === "system";
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filters: { key: NotificationFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "emergency", label: "Emergency Updates" },
    { key: "messages", label: "Messages" },
    { key: "system", label: "System" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse p-4 bg-slate-100 rounded-xl">
            <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
            <div className="h-3 bg-slate-200 rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Filter className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No notifications yet</h3>
        <p className="text-slate-500 text-center max-w-sm">
          You'll see emergency updates, responder alerts, and messages here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Notifications</h2>
          <p className="text-sm text-slate-500">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.key
                ? "bg-blue-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications */}
      {filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-slate-500">No notifications match this filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onClick={onNotificationClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
