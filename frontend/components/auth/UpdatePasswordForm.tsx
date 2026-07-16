"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";
import PasswordInput from "./PasswordInput";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth/errors";

const schema = z
  .object({
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Minimum 8 characters")
      .regex(/[A-Z]/, "Needs an uppercase letter")
      .regex(/[a-z]/, "Needs a lowercase letter")
      .regex(/[0-9]/, "Needs a number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function UpdatePasswordForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // eslint-disable-next-line react-hooks/incompatible-library
  const passwordValue = watch("password");

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setAuthError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: data.password });

    setLoading(false);

    if (error) {
      setAuthError(getAuthErrorMessage(error));
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 2500);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {!success ? (
          <motion.div
            key="form"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-7">
              <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full mb-3">
                <Lock className="w-3.5 h-3.5" />
                New Password
              </div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">
                Update Your Password
              </h1>
              <p className="text-sm text-slate-500 mt-1.5">
                Choose a strong new password for your account.
              </p>
            </div>

            {/* Auth error */}
            <AnimatePresence initial={false}>
              {authError && (
                <motion.div
                  role="alert"
                  key={authError}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium"
                >
                  {authError}
                </motion.div>
              )}
            </AnimatePresence>

            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="flex flex-col gap-4"
            >
              <PasswordInput
                label="New Password"
                placeholder="Create a strong password"
                autoComplete="new-password"
                required
                showStrength
                watchValue={passwordValue}
                error={errors.password?.message}
                {...register("password")}
              />
              <PasswordInput
                label="Confirm New Password"
                placeholder="Repeat your new password"
                autoComplete="new-password"
                required
                error={errors.confirmPassword?.message}
                {...register("confirmPassword")}
              />

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={loading ? {} : { scale: 1.015 }}
                whileTap={loading ? {} : { scale: 0.985 }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#E53935] hover:bg-[#C62828] disabled:bg-red-300 text-white text-sm font-bold rounded-xl transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
                ) : (
                  "Update Password"
                )}
              </motion.button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-8"
            aria-live="polite"
          >
            <div className="flex items-center justify-center w-14 h-14 bg-green-50 border border-green-200 rounded-2xl mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Password Updated</h2>
            <p className="text-sm text-slate-500">
              Your password has been updated successfully. Redirecting to login…
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
