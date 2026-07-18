"use client";

import { useState, useEffect } from "react";
import { Siren, ClipboardList } from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import CallPrimaryContactButton from "@/components/dashboard/CallPrimaryContactButton";

interface WelcomeCardProps {
  user: {
    fullName?: string;
  };
}

function getGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function WelcomeCard({ user }: WelcomeCardProps) {
  const name = user.fullName || "User";
  const firstName = name.split(" ")[0];
  const shouldReduceMotion = useReducedMotion();

  // Avoid hydration mismatch by computing time/date only on the client
  const [greeting, setGreeting] = useState("Hello");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const now = new Date();
    setGreeting(getGreeting(now.getHours()));
    setDateStr(formatDate(now));
  }, []);

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-blue-100/50 bg-gradient-to-br from-blue-50/50 via-slate-50 to-white p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6"
    >
      {/* Decorative vector background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, #2563eb 0%, transparent 40%), radial-gradient(circle at 90% 80%, #3b82f6 0%, transparent 40%)",
        }}
      />

      <div className="relative z-10 flex-1 space-y-4 text-center md:text-left">
        <div>
          {dateStr && (
            <p className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              {dateStr}
            </p>
          )}
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
            {greeting}, <span className="text-blue-600">{firstName}</span> 👋
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 font-medium">
            Your health and safety are our priority.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
          <Link
            href="/dashboard/emergency"
            className="relative z-10 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-100 transition-colors hover:bg-blue-700 active:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            aria-label="Request Emergency Help"
          >
            <Siren className="w-4 h-4" aria-hidden="true" />
            Request Emergency Help
          </Link>
          <Link
            href="/dashboard/requests"
            className="relative z-10 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
            aria-label="View My Requests"
          >
            <ClipboardList className="w-4 h-4" aria-hidden="true" />
            View My Requests
          </Link>

          {/* Call Primary Contact — launches device phone app after confirmation */}
          <CallPrimaryContactButton />
        </div>
      </div>

      {/* Floating SVG Illustration */}
      <motion.div
        animate={shouldReduceMotion ? {} : { y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="hidden md:block flex-shrink-0"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-28 h-28 lg:w-32 lg:h-32 text-blue-500"
        >
          {/* Heart Beat & Medical Symbol */}
          <rect
            x="10"
            y="10"
            width="100"
            height="100"
            rx="24"
            fill="rgba(37, 99, 235, 0.04)"
            stroke="rgba(37, 99, 235, 0.12)"
            strokeWidth="1.5"
          />
          <path
            d="M60 22C60 22 84 38 84 58C84 74.5 70.5 88 60 98C49.5 88 36 74.5 36 58C36 38 60 22 60 22Z"
            fill="rgba(37, 99, 235, 0.08)"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Medical Cross */}
          <rect x="55" y="44" width="10" height="24" rx="2" fill="currentColor" />
          <rect x="48" y="51" width="24" height="10" rx="2" fill="currentColor" />
        </svg>
      </motion.div>
    </motion.div>
  );
}
