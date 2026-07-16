"use client";

import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Heart } from "lucide-react";
import BenefitsPanel from "./BenefitsPanel";

interface AuthShellProps {
  children: ReactNode;
  /**
   * register — form LEFT, illustration RIGHT
   * login    — illustration LEFT, form RIGHT
   */
  variant?: "register" | "login";
  /** Hide the illustration panel entirely (e.g. forgot-password) */
  showPanel?: boolean;
}

export default function AuthShell({
  children,
  variant = "register",
  showPanel = true,
}: AuthShellProps) {
  const shouldReduceMotion = useReducedMotion();
  const isLogin = variant === "login";

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#fafafa] overflow-x-hidden">
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <header className="w-full px-4 sm:px-8 py-4 flex items-center justify-between max-w-6xl mx-auto">
        {/* Logo */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 group"
          aria-label="Medicare — home"
        >
          <div className="flex items-center justify-center w-8 h-8 bg-[#e53935] rounded-lg shadow shadow-red-200 group-hover:bg-[#c62828] transition-colors duration-150">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="text-base font-black text-slate-900 tracking-tight">
            Medi<span className="text-[#e53935]">care</span>
          </span>
        </Link>

        {/* Back to home */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#e53935] transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Home
        </Link>
      </header>

      {/* ── Main card ──────────────────────────────────────────────────── */}
      <main className="flex flex-1 items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" as const }}
          className={[
            "w-full bg-white rounded-[20px] border border-[#E2E8F0] shadow-[0_8px_40px_rgba(15,23,42,0.08)] overflow-hidden",
            showPanel
              ? "max-w-[1040px] grid lg:grid-cols-2"
              : "max-w-[440px]",
          ].join(" ")}
        >
          {/* On login: panel LEFT, form RIGHT. On register: form LEFT, panel RIGHT. */}
          {showPanel && isLogin && (
            <div className="hidden lg:block">
              <BenefitsPanel variant={variant} />
            </div>
          )}

          {/* Form column */}
          <div className="p-7 sm:p-9 flex flex-col justify-center min-h-[600px]">
            {children}
          </div>

          {/* On register: panel RIGHT */}
          {showPanel && !isLogin && (
            <div className="hidden lg:block">
              <BenefitsPanel variant={variant} />
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
