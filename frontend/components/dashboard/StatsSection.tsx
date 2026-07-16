"use client";

import StatsCard from "./StatsCard";
import { Siren, Activity, CheckCircle2, Users, Clock } from "lucide-react";

interface StatsSectionProps {
  totalRequests: number;
  activeRequests: number;
  pendingRequests: number;
  completedRequests: number;
  emergencyContactsCount: number;
}

export default function StatsSection({
  totalRequests,
  activeRequests,
  pendingRequests,
  completedRequests,
  emergencyContactsCount,
}: StatsSectionProps) {
  const stats = [
    {
      label: "Total Requests",
      value: totalRequests,
      icon: Siren,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      subtitle: "All time",
      delay: 0.1,
    },
    {
      label: "Pending",
      value: pendingRequests,
      icon: Clock,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-50",
      subtitle: "Awaiting response",
      delay: 0.15,
    },
    {
      label: "Active",
      value: activeRequests,
      icon: Activity,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      subtitle: "Currently in progress",
      delay: 0.2,
    },
    {
      label: "Completed",
      value: completedRequests,
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      subtitle: "Successfully resolved",
      delay: 0.25,
    },
    {
      label: "Emergency Contacts",
      value: emergencyContactsCount,
      icon: Users,
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-50",
      subtitle: "Trusted contacts saved",
      delay: 0.3,
    },
  ];

  return (
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">
        Overview Statistics
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <StatsCard key={s.label} {...s} />
        ))}
      </div>
    </section>
  );
}
