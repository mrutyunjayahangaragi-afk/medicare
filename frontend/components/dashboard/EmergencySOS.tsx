"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Siren } from "lucide-react";

export default function EmergencySOS() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
      aria-labelledby="sos-heading"
      className="relative overflow-hidden rounded-2xl border border-red-100 bg-red-50 p-6 sm:p-7"
    >
      {/* Subtle background pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 80% 50%, #ef4444 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* Icon with pulsing ring */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <div className="relative w-16 h-16">
            {/* Outer pulsing ring */}
            {!shouldReduceMotion && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.4], opacity: [0.35, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                  className="pointer-events-none absolute inset-0 rounded-full bg-red-400"
                  aria-hidden="true"
                />
                <motion.div
                  animate={{ scale: [1, 1.25], opacity: [0.25, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
                  className="pointer-events-none absolute inset-0 rounded-full bg-red-300"
                  aria-hidden="true"
                />
              </>
            )}
            {/* Icon circle */}
            <div className="relative z-10 w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-300/50">
              <Siren className="w-7 h-7 text-white" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h2
            id="sos-heading"
            className="text-lg font-black text-red-900 leading-snug"
          >
            Need immediate help?
          </h2>
          <p className="mt-1 text-sm text-red-700/80 leading-relaxed max-w-xl">
            Send your location and emergency details to the nearest response team.
          </p>
        </div>

        {/* CTA */}
        <div className="relative z-10 flex-shrink-0">
          <Link
            href="/dashboard/emergency"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-red-300/40 transition-colors hover:bg-red-700 active:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            aria-label="Send SOS request — navigate to emergency form"
          >
            <Siren className="w-4 h-4" aria-hidden="true" />
            Send SOS Request
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
