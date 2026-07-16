"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Heart, Clock, ArrowLeft, LogOut, Loader2, HandHeart, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const roleConfig = {
  volunteer: {
    label: "Volunteer",
    icon: <HandHeart className="w-8 h-8 text-green-500" />,
    iconBg: "bg-green-50 border-green-200",
    accent: "text-green-600",
    future: "/volunteer/dashboard",
  },
  hospital: {
    label: "Hospital",
    icon: <Building2 className="w-8 h-8 text-blue-500" />,
    iconBg: "bg-blue-50 border-blue-200",
    accent: "text-blue-600",
    future: "/hospital/dashboard",
  },
} as const;

type KnownRole = keyof typeof roleConfig;

function isKnownRole(r: string | null): r is KnownRole {
  return r === "volunteer" || r === "hospital";
}

export default function ComingSoonView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const roleParam = searchParams.get("role");
  const config = isKnownRole(roleParam) ? roleConfig[roleParam] : null;

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center"
      >
        {/* Medicare logo */}
        <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center group-hover:bg-red-600 transition-colors">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="text-base font-black text-slate-900">
            Medi<span className="text-red-500">care</span>
          </span>
        </Link>

        {/* Role icon */}
        {config ? (
          <div className={`w-16 h-16 ${config.iconBg} border-2 rounded-2xl flex items-center justify-center mx-auto mb-5`}>
            {config.icon}
          </div>
        ) : (
          <div className="w-16 h-16 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Clock className="w-8 h-8 text-slate-400" />
          </div>
        )}

        {/* Clock badge */}
        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-3 py-1 rounded-full mb-4">
          <Clock className="w-3.5 h-3.5" />
          Coming Soon
        </div>

        <h1 className="text-2xl font-black text-slate-900 mb-2">
          {config ? `${config.label} Dashboard` : "Dashboard"}
        </h1>

        <p className="text-sm text-slate-500 leading-relaxed mb-8">
          Your role-specific dashboard will be implemented in a later step.
          {config && (
            <>
              {" "}The{" "}
              <span className={`font-bold ${config.accent}`}>{config.label}</span>{" "}
              portal is being built with full emergency management, real-time tracking,
              and role-specific features.
            </>
          )}
        </p>

        {/* Future route note */}
        {config && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6 text-left">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
              Future route
            </p>
            <code className="text-xs font-mono text-slate-600">{config.future}</code>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E53935] hover:bg-[#C62828] disabled:bg-red-300 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {loggingOut ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Signing out…</>
            ) : (
              <><LogOut className="w-4 h-4" /> Logout</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
