"use client";

import { useState } from "react";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { type LoginPortal } from "@/types/auth";
import PortalSelector from "./PortalSelector";
import AuthLayout from "./AuthLayout";

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}

function getQueryError(err: string | null): string | null {
  if (err === "oauth_failed") return "Google sign-in failed. Please try again.";
  if (err === "invalid_link") return "This link is invalid.";
  if (err === "link_expired") return "This link has expired.";
  if (err === "unauthorized") return "Your account is not authorized for the selected portal.";
  if (err === "pending") return "Your application is still under review.";
  if (err === "rejected") return "Your application has been rejected.";
  if (err === "suspended") return "Your access has been suspended. Contact support.";
  return null;
}

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPortal, setSelectedPortal] = useState<LoginPortal>("user");
  const shouldReduceMotion = useReducedMotion();
  const searchParams = useSearchParams();

  const queryError = getQueryError(searchParams.get("error"));
  const displayError = error ?? queryError;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?portal=${selectedPortal}`,
        },
      });
      if (oauthError) throw oauthError;
      // Browser redirects on success — no further action
    } catch (err) {
      console.error("[AUTH] Google login error:", err);
      setLoading(false);
      setError("Google sign-in failed. Please try again.");
    }
  };

  return (
    <AuthLayout variant="login">
      <div className="w-full">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2">
            Welcome Back!
          </h1>
          <p className="text-base text-slate-500 leading-relaxed">
            Sign in to continue to Medicare.
          </p>
        </div>

        {/* Error banner */}
        <AnimatePresence initial={false}>
          {displayError && (
            <div
              role="alert"
              className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium"
            >
              {displayError}
            </div>
          )}
        </AnimatePresence>

        {/* Portal Selector */}
        <div className="mb-6">
          <PortalSelector value={selectedPortal} onChange={setSelectedPortal} />
        </div>

        {/* Google button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-slate-800 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4]/50"
          aria-label="Sign in with Google"
        >
          {loading ? (
            <>
              <Loader2 className="w-4.5 h-4.5 animate-spin text-slate-400" />
              <span>Connecting to Google…</span>
            </>
          ) : (
            <>
              <GoogleLogo />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" aria-hidden="true" />
          <span>Secured by Supabase · No password needed</span>
        </div>

        {/* Terms */}
        <p className="text-center text-xs text-slate-400 mt-4 leading-relaxed">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-red-500 font-semibold hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-red-500 font-semibold hover:underline">
            Privacy Policy
          </Link>
        </p>

        {/* Register link */}
        <p className="text-center text-sm text-slate-600 mt-6">
          Don't have an account?{" "}
          <Link href="/register" className="text-red-500 font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
