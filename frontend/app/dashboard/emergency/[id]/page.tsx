"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { ArrowLeft, MapPin, Clock, Phone, AlertCircle } from "lucide-react";
import TopNavbar from "@/components/dashboard/TopNavbar";
import { createClient } from "@/lib/supabase/client";
import { fetchEmergencyById } from "@/lib/emergency";
import { EMERGENCY_TYPES, SEVERITY_LEVELS, STATUS_CONFIG } from "@/types/emergency";
import type { EmergencyRequest, EmergencyStatus } from "@/types/emergency";
import type { Profile } from "@/types/auth";

const EmergencyMap = dynamic(() => import("@/components/emergency/EmergencyMap"), { ssr: false });

const STATUS_ORDER: EmergencyStatus[] = [
  "pending", "accepted", "volunteer_assigned", "hospital_assigned", "completed",
];

function StatusTimeline({ current }: { current: EmergencyStatus }) {
  const isCancelled = current === "cancelled";
  const currentIdx  = STATUS_ORDER.indexOf(current);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black text-slate-900">Status Timeline</h3>
      {isCancelled ? (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-[#E53935]" />
          <span className="text-sm font-bold text-[#E53935]">Request Cancelled</span>
        </div>
      ) : (
        <ol className="relative pl-4 space-y-3 border-l-2 border-slate-100" aria-label="Status timeline">
          {STATUS_ORDER.map((status, idx) => {
            const cfg    = STATUS_CONFIG[status];
            const done   = idx <= currentIdx;
            const active = idx === currentIdx;
            return (
              <li key={status} className="relative pl-5">
                <span
                  className={[
                    "absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white",
                    done ? cfg.bg.replace("100", "400") : "bg-slate-200",
                  ].join(" ")}
                  aria-hidden="true"
                />
                <p className={`text-sm font-semibold ${done ? cfg.color : "text-slate-300"}`}>
                  {cfg.label}
                  {active && (
                    <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                      Current
                    </span>
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default function EmergencyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [request, setRequest] = useState<EmergencyRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: profileData } = await supabase
        .from("profiles").select("*").eq("id", user.id).single();
      // Allow access for any authenticated user — is_verified is enforced
      // at the dashboard level, not on individual request detail pages.
      setProfile((profileData ?? { id: user.id }) as Profile);

      const req = await fetchEmergencyById(id);
      if (!req) { setNotFound(true); setLoading(false); return; }
      setRequest(req);
      setLoading(false);
    };
    load();
  }, [id, router]);

  if (!profile || loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-[#E53935] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !request) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <TopNavbar profile={profile} />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
          <AlertCircle className="w-12 h-12 text-slate-300" />
          <p className="text-base font-bold text-slate-700">Request not found</p>
          <Link href="/dashboard/emergency/history" className="text-sm font-semibold text-[#E53935] hover:underline">
            Back to History
          </Link>
        </main>
      </div>
    );
  }

  const typeInfo  = EMERGENCY_TYPES.find((t) => t.id === request.emergency_type);
  const sevInfo   = SEVERITY_LEVELS.find((s) => s.id === request.severity);
  const statusCfg = STATUS_CONFIG[request.status];
  const locationText = request.manual_address || null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopNavbar profile={profile} />

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/dashboard/emergency/history"
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors group"
            aria-label="Back to history"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900">Emergency Details</h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[220px]">{request.id}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-5">
          {/* Left */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            {/* Type + severity card */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl" aria-hidden="true">{typeInfo?.emoji ?? "❓"}</span>
                  <div>
                    <p className="text-lg font-black text-slate-900">{typeInfo?.label ?? request.emergency_type}</p>
                    {sevInfo && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border-2 ${sevInfo.active} inline-flex items-center gap-1 mt-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sevInfo.dot}`} />
                        {sevInfo.label} Severity
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 ${statusCfg.bg} ${statusCfg.color}`}>
                  {statusCfg.label}
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description</p>
                <p className="text-sm text-slate-700 leading-relaxed">{request.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-xs text-slate-500">{request.contact_number}</p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-xs text-slate-400">
                  {new Date(request.created_at).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
                </p>
              </div>
            </div>

            {/* Map */}
            {request.latitude != null && request.longitude != null && (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-[#E53935]" />
                  <p className="text-sm font-bold text-slate-900">GPS Location</p>
                </div>
                {locationText && (
                  <p className="text-xs text-slate-500 mb-3 leading-snug">{locationText}</p>
                )}
                <EmergencyMap
                  latitude={request.latitude}
                  longitude={request.longitude}
                  className="h-52 w-full rounded-xl overflow-hidden border border-slate-100"
                />
                <p className="text-xs text-slate-400 mt-2 font-mono">
                  {request.latitude.toFixed(6)}, {request.longitude.toFixed(6)}
                  {request.location_accuracy != null && ` ± ${Math.round(request.location_accuracy)}m`}
                </p>
              </div>
            )}

            {/* Manual address only */}
            {locationText && request.latitude == null && (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-[#E53935]" />
                  <p className="text-sm font-bold text-slate-900">Manual Address</p>
                </div>
                <p className="text-sm text-slate-600">{locationText}</p>
              </div>
            )}

            {/* Evidence path */}
            {request.evidence_path && (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                <p className="text-sm font-bold text-slate-900 mb-2">Evidence</p>
                <p className="text-xs text-slate-400 font-mono break-all">{request.evidence_path}</p>
              </div>
            )}
          </motion.div>

          {/* Right: timeline */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 h-fit"
          >
            <StatusTimeline current={request.status} />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
