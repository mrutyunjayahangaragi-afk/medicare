"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Activity, CheckCircle, Clock } from "lucide-react";

interface ResponderStatsProps {
  availableRequests: number;
  activeAssignments: number;
  completedToday: number;
  criticalRequests: number;
  isLoading?: boolean;
}

export default function ResponderStats({
  availableRequests,
  activeAssignments,
  completedToday,
  criticalRequests,
  isLoading = false,
}: ResponderStatsProps) {
  const stats = [
    {
      label: "Available Requests",
      value: availableRequests,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    {
      label: "Active Assignments",
      value: activeAssignments,
      icon: <Activity className="w-5 h-5" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      label: "Completed Today",
      value: completedToday,
      icon: <CheckCircle className="w-5 h-5" />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },
    {
      label: "Critical Requests",
      value: criticalRequests,
      icon: <Clock className="w-5 h-5" />,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((_, index) => (
          <div
            key={index}
            className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse"
          >
            <div className="h-12 bg-slate-200 rounded-lg mb-4" />
            <div className="h-8 bg-slate-200 rounded-lg w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className={`bg-white border ${stat.borderColor} rounded-2xl p-6`}
        >
          <div className={`flex items-center gap-3 ${stat.bgColor} w-12 h-12 rounded-xl mb-4`}>
            <span className={stat.color}>{stat.icon}</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
          <p className="text-sm text-slate-600">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
