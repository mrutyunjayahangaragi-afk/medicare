"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ClipboardList, ArrowRight, Calendar, MapPin, AlertTriangle } from "lucide-react";

export type EmergencyRequest = {
  id: string;
  emergencyType: string;
  createdAt: string;
  location: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Pending" | "Accepted" | "In Progress" | "Completed" | "Cancelled";
};

interface RecentRequestsProps {
  requests: EmergencyRequest[];
}

const STATUS_CONFIG: Record<
  EmergencyRequest["status"],
  { label: string; className: string; dot: string }
> = {
  Pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  Accepted: {
    label: "Accepted",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
  },
  "In Progress": {
    label: "In Progress",
    className: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    dot: "bg-indigo-500",
  },
  Completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  Cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 border border-red-200",
    dot: "bg-red-400",
  },
};

const SEVERITY_CONFIG: Record<
  EmergencyRequest["severity"],
  { className: string }
> = {
  Low:      { className: "text-slate-500" },
  Medium:   { className: "text-amber-600" },
  High:     { className: "text-orange-600" },
  Critical: { className: "text-red-600 font-bold" },
};

function StatusBadge({ status }: { status: EmergencyRequest["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`}
        aria-hidden="true"
      />
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function RecentRequests({ requests }: RecentRequestsProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
      aria-labelledby="recent-requests-heading"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h2
          id="recent-requests-heading"
          className="text-base font-black text-slate-900"
        >
          Recent Emergency Requests
        </h2>
        {requests.length > 0 && (
          <Link
            href="/dashboard/requests"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            aria-label="View all emergency requests"
          >
            View all
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        )}
      </div>

      {requests.length === 0 ? (
        /* ── Empty State ── */
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-5">
            <ClipboardList className="w-8 h-8 text-slate-300" aria-hidden="true" />
          </div>
          <p className="text-sm font-bold text-slate-700 mb-1">
            No emergency requests yet.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mb-5">
            Your submitted requests will appear here.
          </p>
          <Link
            href="/dashboard/emergency"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 min-h-[44px]"
          >
            Create First Request
          </Link>
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden md:block bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Emergency requests">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Type", "Date & Time", "Location", "Severity", "Status", "Action"].map(
                      (col) => (
                        <th
                          key={col}
                          scope="col"
                          className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {requests.map((req) => {
                    const sevCfg = SEVERITY_CONFIG[req.severity];
                    return (
                      <tr
                        key={req.id}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-800 capitalize whitespace-nowrap">
                          {req.emergencyType}
                        </td>
                        <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                            {formatDate(req.createdAt)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 max-w-[160px] truncate">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                            {req.location}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`flex items-center gap-1 text-xs font-semibold ${sevCfg.className}`}
                          >
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                            {req.severity}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <StatusBadge status={req.status} />
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <Link
                            href={`/dashboard/requests/${req.id}`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors focus-visible:underline"
                            aria-label={`View details for ${req.emergencyType} request`}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="md:hidden space-y-3">
            {requests.map((req) => {
              const sevCfg = SEVERITY_CONFIG[req.severity];
              return (
                <div
                  key={req.id}
                  className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold text-slate-800 capitalize leading-snug">
                      {req.emergencyType}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-500">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                      {formatDate(req.createdAt)}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate">{req.location}</span>
                    </p>
                    <p className={`flex items-center gap-1 font-semibold ${sevCfg.className}`}>
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                      Severity: {req.severity}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/requests/${req.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    aria-label={`View details for ${req.emergencyType} request`}
                  >
                    View Details <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.section>
  );
}
