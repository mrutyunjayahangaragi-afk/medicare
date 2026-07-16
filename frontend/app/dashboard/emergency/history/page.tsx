"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ClipboardList, Plus } from "lucide-react";
import TopNavbar from "@/components/dashboard/TopNavbar";
import HistoryCard from "@/components/emergency/HistoryCard";
import { createClient } from "@/lib/supabase/client";
import { fetchMyEmergencyRequests } from "@/lib/emergency";
import type { Profile } from "@/types/auth";
import type { EmergencyRequest } from "@/types/emergency";

export default function EmergencyHistoryPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!data?.is_verified) { router.replace("/login"); return; }
      setProfile(data as Profile);

      const list = await fetchMyEmergencyRequests();
      setRequests(list);
      setLoading(false);
    };
    load();
  }, [router]);

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-[#E53935] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopNavbar profile={profile} />

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/emergency"
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors group"
              aria-label="Back to Emergency"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-900">Emergency History</h1>
              <p className="text-xs text-slate-400 mt-0.5">Your past emergency requests</p>
            </div>
          </div>

          <Link
            href="/dashboard/emergency"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-bold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Request
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-28 bg-slate-200 rounded" />
                    <div className="h-3 w-16 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-slate-300" aria-hidden="true" />
            </div>
            <p className="text-base font-bold text-slate-700 mb-1">No Emergency Requests Yet</p>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-6">
              Your submitted emergency requests will appear here.
            </p>
            <Link
              href="/dashboard/emergency"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-bold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create First Request
            </Link>
          </motion.div>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-4 font-medium">
              {requests.length} request{requests.length !== 1 ? "s" : ""}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {requests.map((r, i) => (
                <HistoryCard key={r.id} request={r} index={i} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
