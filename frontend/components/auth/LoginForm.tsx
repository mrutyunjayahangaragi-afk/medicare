"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Mail } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { type LoginPortal } from "@/types/auth";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import PortalSelector from "./PortalSelector";
import AuthLayout from "./AuthLayout";
import AuthInput from "./AuthInput";
import PasswordInput from "./PasswordInput";

// ── Zod schema ─────────────────────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").min(8, "Password must be at least 8 characters"),
  remember: z.boolean().optional(),
});
type LoginFormValues = z.infer<typeof loginSchema>;

// ── Google logo SVG ────────────────────────────────────────────────────
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
  if (err === "oauth_failed")  return "Google sign-in failed. Please try again.";
  if (err === "invalid_link")  return "This link is invalid.";
  if (err === "link_expired")  return "This link has expired.";
  if (err === "unauthorized")  return "Your account is not authorized for the selected portal.";
  if (err === "pending")       return "Your application is still under review.";
  if (err === "rejected")      return "Your application has been rejected.";
  if (err === "suspended")     return "Your access has been suspended. Contact support.";
  return null;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldReduceMotion = useReducedMotion();

  // Shared state
  const [selectedPortal, setSelectedPortal] = useState<LoginPortal>("user");
  const [error, setError]                   = useState<string | null>(null);

  // Email/password state
  const [emailLoading, setEmailLoading]     = useState(false);

  // Google state
  const [googleLoading, setGoogleLoading]   = useState(false);

  const queryError   = getQueryError(searchParams.get("error"));
  const displayError = error ?? queryError;
  const nextUrl      = searchParams.get("next") ?? "/dashboard";

  // ── React Hook Form ─────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const passwordValue = watch("password");

  // ── Email / password login ──────────────────────────────────────────
  const onEmailLogin = async (data: LoginFormValues) => {
    setEmailLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email:    data.email.trim(),
        password: data.password,
      });

      if (signInError) {
        setError(getAuthErrorMessage(signInError));
        return;
      }

      // Step 1: Authenticate first — verify session is live.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Session error. Please try again.");
        return;
      }

      // Step 2: Fetch role using the authenticated user UUID — never the email.
      //         Use maybeSingle() so a missing row returns null instead of throwing.
      //         Never silently default to "user" — surface the error if the query fails.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        // Role query failed (RLS, network, schema issue) — do not silently default.
        console.error("[LoginForm] Profile role query failed:", profileError.message, profileError.code);
        setError("Could not load your account role. Please try again.");
        return;
      }

      if (!profile) {
        // No profile row found — the profile may not have been created yet.
        console.warn("[LoginForm] No profile row found for userId:", user.id);
        setError("Account setup is incomplete. Please contact support.");
        return;
      }

      // Step 3: Normalize the role — trim + toLowerCase prevents case mismatch.
      const role = (profile.role as string).trim().toLowerCase();

      // Step 4: Map DB role → destination portal path.
      let destination: string;
      if (role === "admin")                                      destination = "/admin";
      else if (role === "hospital_staff" || role === "hospital") destination = "/hospital";
      else if (role === "responder" || role === "volunteer")     destination = "/responder";
      else                                                       destination = "/dashboard";

      // Dev-safe audit log — no passwords or tokens logged.
      console.info("[LoginForm] Resolved access", {
        userId: user.id,
        databaseRole: role,
        destination,
      });

      // Step 5: Honour ?next= only when the user is authorized for that path.
      const rawNext = nextUrl !== "/dashboard" ? nextUrl : null;
      if (rawNext) {
        const allowedForRole =
          (rawNext.startsWith("/admin")     && role === "admin") ||
          (rawNext.startsWith("/hospital")  && (role === "hospital_staff" || role === "hospital")) ||
          (rawNext.startsWith("/responder") && (role === "responder" || role === "volunteer")) ||
          (rawNext.startsWith("/dashboard") && role === "user");
        if (allowedForRole) destination = rawNext;
      }

      router.push(destination);
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Google login ────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?portal=${selectedPortal}`,
        },
      });
      if (oauthError) throw oauthError;
      // Browser redirects — no further action needed
    } catch {
      setGoogleLoading(false);
      setError("Google sign-in failed. Please try again.");
    }
  };

  const isAnyLoading = emailLoading || googleLoading;

  return (
    <AuthLayout variant="login">
      <div className="w-full">
        {/* ── Heading ── */}
        <div className="mb-7">
          <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2">
            Welcome Back!
          </h1>
          <p className="text-base text-slate-500 leading-relaxed">
            Sign in to continue to Medicare.
          </p>
        </div>

        {/* ── Error banner ── */}
        <AnimatePresence initial={false}>
          {displayError && (
            <div
              role="alert"
              className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium"
            >
              {displayError}
            </div>
          )}
        </AnimatePresence>

        {/* ── Portal Selector ── */}
        <div className="mb-6">
          <PortalSelector value={selectedPortal} onChange={setSelectedPortal} />
        </div>

        {/* ── Admin demo credentials hint ── */}
        {selectedPortal === "admin" && (
          <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
            <p className="font-semibold text-amber-800 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-500 flex-shrink-0" aria-hidden="true" />
              Admin Demo Credentials
            </p>
            <div className="space-y-0.5 text-amber-700 font-mono text-xs">
              <p><span className="font-sans font-semibold text-amber-800">Email:</span> apatroti3@gmail.com</p>
              <p><span className="font-sans font-semibold text-amber-800">Password:</span> Admin@123</p>
            </div>
          </div>
        )}

        {/* ── Email / Password form ── */}
        <form
          onSubmit={handleSubmit(onEmailLogin)}
          noValidate
          aria-label="Email and password login form"
          className="flex flex-col gap-4"
        >
          <AuthInput
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            error={errors.email?.message}
            {...register("email")}
          />

          <PasswordInput
            label="Password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            watchValue={passwordValue}
            error={errors.password?.message}
            {...register("password")}
          />

          {/* Remember me + Forgot password row */}
          <div className="flex items-center justify-between gap-4 -mt-1">
            <label className="flex items-center gap-2 cursor-pointer group select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 accent-[#E53935] cursor-pointer"
                {...register("remember")}
              />
              <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
                Remember me
              </span>
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-red-500 hover:text-red-600 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 rounded"
            >
              Forgot password?
            </Link>
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={isAnyLoading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[#E53935] hover:bg-[#C62828] disabled:bg-red-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-sm shadow-red-200 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935]/50"
            aria-label="Sign in with email and password"
          >
            {emailLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
            ) : (
              <><Mail className="w-4 h-4" /> Sign In</>
            )}
          </button>
        </form>

        {/* ── OR divider ── */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* ── Google button (unchanged) ── */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isAnyLoading}
          className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-slate-800 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4]/50"
          aria-label="Sign in with Google"
        >
          {googleLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin text-slate-400" /><span>Connecting to Google…</span></>
          ) : (
            <><GoogleLogo /><span>Continue with Google</span></>
          )}
        </button>

        {/* ── Trust indicator ── */}
        <div className="flex items-center justify-center gap-1.5 mt-5 text-xs text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" aria-hidden="true" />
          <span>Secured by Supabase · Your data is protected</span>
        </div>

        {/* ── Terms ── */}
        <p className="text-center text-xs text-slate-400 mt-4 leading-relaxed">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="text-red-500 font-semibold hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-red-500 font-semibold hover:underline">
            Privacy Policy
          </Link>
        </p>

        {/* ── Register link ── */}
        <p className="text-center text-sm text-slate-600 mt-5">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-red-500 font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
