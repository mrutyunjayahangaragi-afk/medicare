"use client";

import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Clock, Activity } from "lucide-react";

interface ResponderEmptyStateProps {
  type: "available" | "assigned" | "active" | "completed" | "unauthorized" | "network-error";
  onAction?: () => void;
  actionLabel?: string;
}

const EMPTY_STATE_CONFIG = {
  available: {
    icon: <CheckCircle className="w-10 h-10" />,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    title: "No Available Requests",
    description: "There are currently no emergency requests waiting for assignment. You'll be notified when new requests come in.",
  },
  assigned: {
    icon: <Activity className="w-10 h-10" />,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "No Assigned Requests",
    description: "You don't have any requests assigned to you. Check the available requests to accept one.",
  },
  active: {
    icon: <Clock className="w-10 h-10" />,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    title: "No Active Responses",
    description: "You don't have any active responses in progress.",
  },
  completed: {
    icon: <CheckCircle className="w-10 h-10" />,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    title: "No Completed Requests",
    description: "You haven't completed any emergency requests yet.",
  },
  unauthorized: {
    icon: <AlertCircle className="w-10 h-10" />,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    title: "Access Denied",
    description: "You don't have permission to access the responder dashboard. Please contact an administrator.",
  },
  "network-error": {
    icon: <AlertCircle className="w-10 h-10" />,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    title: "Connection Error",
    description: "Unable to connect to the server. Please check your internet connection and try again.",
  },
};

export default function ResponderEmptyState({
  type,
  onAction,
  actionLabel,
}: ResponderEmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className={`w-20 h-20 ${config.iconBg} rounded-full flex items-center justify-center mb-6`}>
        <span className={config.iconColor}>{config.icon}</span>
      </div>

      <h3 className="text-xl font-semibold text-slate-900 mb-2">{config.title}</h3>

      <p className="text-slate-500 text-center max-w-md mb-8">{config.description}</p>

      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors shadow-md hover:shadow-lg"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
