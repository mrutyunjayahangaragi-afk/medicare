"use client";

import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AuthLogo from "./AuthLogo";
import AuthBenefitsPanel from "./AuthBenefitsPanel";

interface AuthLayoutProps {
  children: ReactNode;
  /** Panel variant changes the subtitle copy */
  variant?: "register" | "login";
  /** Hide the right panel (e.g. forgot-password) */
  showPanel?: boolean;
}

export default function AuthLayout({
  children,
  variant = "register",
  showPanel = true,
}: AuthLayoutProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-red-50/60 via-white to-rose-50/40 relative overflow-x-hidden">
      {/* Decorative background blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-red-100/30 blur-3xl -translate-y-1/2 translate-x-1/3"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-rose-100/20 blur-3xl translate-y-1/3 -translate-x-1/4"
      />

      {/* Top bar */}
      <header className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <AuthLogo />
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-red-500 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Home
        </Link>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className={[
            "w-full bg-white rounded-[1.5rem] border border-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.10)]",
            showPanel
              ? "max-w-[1100px] grid lg:grid-cols-[1fr_420px] gap-0 overflow-hidden"
              : "max-w-[480px]",
          ].join(" ")}
        >
          {/* Left / form side */}
          <div className="p-7 sm:p-10">{children}</div>

          {/* Right / benefits panel */}
          {showPanel && (
            <div className="hidden lg:flex flex-col bg-gradient-to-br from-red-50 to-rose-100/60 border-l border-red-100 p-8 xl:p-10">
              <AuthBenefitsPanel variant={variant} />
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
