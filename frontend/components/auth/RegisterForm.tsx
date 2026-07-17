"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, UserPlus, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { type RegistrationType } from "@/types/auth";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import RegistrationTypeSelector from "./RegistrationTypeSelector";
import AuthLayout from "./AuthLayout";
import AuthInput from "./AuthInput";
import PasswordInput from "./PasswordInput";

// ── Zod schema ─────────────────────────────────────────────────────────
const registerSchema = z
  .object({
    full_name:       z.string().min(2, "Full name must be at least 2 characters").max(100),
    email:           z.string().min(1, "Email is required").email("Enter a valid email address"),
    password:        z
      .string()
      .min(1, "Password is required")
      .min(8, "Minimum 8 characters")
      .regex(/[A-Z]/, "Needs an uppercase letter")
      .regex(/[a-z]/, "Needs a lowercase letter")
      .regex(/[0-9]/, "Needs a number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    terms:           z.boolean().refine((v) => v === true, {
      message: "You must accept the Terms of Service to continue",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

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
  if (err === "oauth_failed") return "Google sign-in failed. Please try again.";
  if (err === "invalid_link") return "This link is invalid.";
  if (err === "link_expired") return "This link has expired.";
  return null;
}

export default function RegisterForm() {
  const router          = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const searchParams    = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;

  const [selectedType, setSelectedType]     = useState<RegistrationType>("user");
  const [error, setError]                   = useState<string | null>(null);
  const [emailLoading, setEmailLoading]     = useState(false);
  const [googleLoading, setGoogleLoading]   = useState(false);
  const [emailSent, setEmailSent]           = useState(false);

  const queryError   = searchParams ? getQueryError(searchParams.get("error")) : null;
  const displayError = error ?? queryError;

  // ── React Hook Form ─────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const passwordValue = watch("password");

  // ── Email registration ──────────────────────────────────────────────
  const onEmailRegister = async (data: RegisterFormValues) => {
    setEmailLoading(true);
    setError(null);

    try {
      const supabase  = createClient();
      const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

      const { error: signUpError } = await supabase.auth.signUp({
        email:    data.email.trim(),
        password: data.password,
        options:  {
          emailRedirectTo: `${siteUrl}/auth/callback?type=${selectedType}`,
          data: {
            full_name: data.full_name.trim(),
          },
        },
      });

      if (signUpError) {
        setError(getAuthErrorMessage(signUpError));
        return;
      }

      // Show "check your inbox" state
      setEmailSent(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Google sign-up (unchanged) ──────────────────────────────────────
  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?type=${selectedType}`,
        },
      });
      if (oauthError) throw oauthError;
      // Browser redirects on success — no further action
    } catch {
      setGoogleLoading(false);
      setError("Google sign-in failed. Please try again.");
    }
  };

  const isAnyLoading = emailLoading || googleLoading;

  // ── Email verification sent state ───────────────────────────────────
  if (emailSent) {
    return (
      <AuthLayout variant="register">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full text-center py-6"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="flex items-center justify-center w-16 h-16 bg-green-50 border border-green-200 rounded-2xl mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Check Your Inbox</h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto mb-8">
            We sent a confirmation link to your email address. Click the link to activate
            your account and get started.
            <br />
            <span className="text-slate-400 text-xs mt-2 block">
              Didn&apos;t receive it? Check your spam folder.
            </span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-bold rounded-xl shadow-sm shadow-red-200 transition-colors duration-150"
            >
              Go to Login
            </Link>
            <button
              type="button"
              onClick={() => setEmailSent(false)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
            >
              Use a different email
            </button>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout variant="register">
      <div className="w-full">
        {/* ── Heading ── */}
        <div className="mb-7">
          <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2">
            Create Your Account
          </h1>
          <p className="text-base text-slate-500 leading-relaxed">
            Join Medicare to access emergency support and healthcare services.
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

        {/* ── Registration Type Selector ── */}
        <div className="mb-6">
          <RegistrationTypeSelector value={selectedType} onChange={setSelectedType} />
        </div>

        {/* ── Email registration form ── */}
        <form
          onSubmit={handleSubmit(onEmailRegister)}
          noValidate
          aria-label="Email registration form"
          className="flex flex-col gap-4"
        >
          <AuthInput
            label="Full Name"
            type="text"
            placeholder="Arjun Sharma"
            autoComplete="name"
            required
            error={errors.full_name?.message}
            {...register("full_name")}
          />

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
            placeholder="Create a strong password"
            autoComplete="new-password"
            required
            showStrength
            watchValue={passwordValue}
            error={errors.password?.message}
            {...register("password")}
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Repeat your password"
            autoComplete="new-password"
            required
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          {/* Terms checkbox */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 flex-shrink-0 rounded border-slate-300 accent-[#E53935] cursor-pointer"
                {...register("terms")}
              />
              <span className="text-sm text-slate-600 leading-snug">
                I agree to the{" "}
                <Link href="/terms" className="text-red-500 font-semibold hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-red-500 font-semibold hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.terms && (
              <p className="mt-1 text-xs font-medium text-red-500 ml-7" role="alert">
                {errors.terms.message}
              </p>
            )}
          </div>

          {/* Register button */}
          <button
            type="submit"
            disabled={isAnyLoading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[#E53935] hover:bg-[#C62828] disabled:bg-red-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-sm shadow-red-200 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935]/50"
            aria-label="Create account with email and password"
          >
            {emailLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
            ) : (
              <><UserPlus className="w-4 h-4" /> Create Account</>
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
          onClick={handleGoogleSignUp}
          disabled={isAnyLoading}
          className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-slate-800 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4]/50"
          aria-label="Sign up with Google"
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

        {/* ── Login link ── */}
        <p className="text-center text-sm text-slate-600 mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-red-500 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
