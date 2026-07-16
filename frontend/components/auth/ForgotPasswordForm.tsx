"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import AuthInput from "./AuthInput";
import { createClient } from "@/lib/supabase/client";

const forgotSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async (data: ForgotFormValues) => {
    setLoading(true);

    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    // Always show the generic success message — never reveal whether
    // an email is registered or not.
    await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${siteUrl}/auth/update-password`,
    });

    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            key="form"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full mb-3">
                <Mail className="w-3.5 h-3.5" />
                Password Reset
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                Forgot Password?
              </h1>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                Enter your email address and we&apos;ll send reset instructions.
              </p>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              aria-label="Forgot password form"
              className="flex flex-col gap-5"
            >
              <AuthInput
                label="Email Address"
                type="email"
                placeholder="arjun@example.com"
                autoComplete="email"
                required
                error={errors.email?.message}
                {...register("email")}
              />

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={loading ? {} : { scale: 1.01 }}
                whileTap={loading ? {} : { scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#E53935] hover:bg-[#C62828] disabled:bg-red-300 text-white text-sm font-bold rounded-xl shadow-sm shadow-red-200 transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                ) : (
                  <><Mail className="w-4 h-4" /> Send Reset Link</>
                )}
              </motion.button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 rounded"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-center py-6"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-green-50 border border-green-200 rounded-2xl mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Check Your Inbox</h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
              If an account exists for this email, reset instructions will be sent shortly.
              Check your spam folder if you don&apos;t see it.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-bold rounded-xl shadow-sm shadow-red-200 transition-colors duration-150"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
              >
                Try a different email
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
