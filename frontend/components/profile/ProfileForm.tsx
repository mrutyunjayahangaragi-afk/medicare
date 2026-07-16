"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Loader2, Save, Calendar, Mail, Hash, X } from "lucide-react";
import { useRouter } from "next/navigation";
import AuthInput from "@/components/auth/AuthInput";
import { updateProfile } from "@/lib/profile";
import { useToast } from "@/components/ui/Toast";
import type { Database } from "@/types/database";

interface ProfileFormProps {
  profile: Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "id" | "full_name" | "phone" | "created_at"
  >;
  userEmail: string;
}

const schema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "At least 2 characters")
    .max(100, "Maximum 100 characters"),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (value) => {
        if (!value) return true;
        return /^\+?[0-9()\-\s]{7,20}$/.test(value);
      },
      "Enter a valid phone number"
    ),
});

type FormValues = z.infer<typeof schema>;

function ReadonlyField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-500">{label}</label>
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500">
        <span className="flex-shrink-0 text-slate-400">{icon}</span>
        <span className="font-medium truncate">{value}</span>
        <span className="ml-auto text-[10px] font-bold bg-slate-200 text-slate-400 px-1.5 py-0.5 rounded flex-shrink-0">
          Read only
        </span>
      </div>
    </div>
  );
}

export default function ProfileForm({ profile, userEmail }: ProfileFormProps) {
  const router = useRouter();
  const [saveError, setSaveError] = useState<string | null>(null);
  const { toast } = useToast();
  const shouldReduceMotion = useReducedMotion();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
    },
  });

  useEffect(() => {
    reset({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
    });
  }, [profile.full_name, profile.phone, reset]);

  const onSubmit = async (data: FormValues) => {
    setSaveError(null);

    const { error } = await updateProfile({
      full_name: data.full_name,
      phone: data.phone?.trim() ? data.phone.trim() : null,
    });

    if (error) {
      const message =
        error === "Authentication expired"
          ? "Unable to update your profile. Please try again."
          : error;
      setSaveError(message);
      toast("Unable to update your profile. Please try again.", "error");
      return;
    }

    reset({
      full_name: data.full_name,
      phone: data.phone?.trim() ? data.phone.trim() : "",
    });
    toast("Profile updated successfully.", "success");
    router.refresh();
  };

  const handleCancel = () => {
    reset();
    setSaveError(null);
  };

  const formattedDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="space-y-6">
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6"
      >
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Personal Information
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Update your name and contact details.
          </p>
        </div>

        <AnimatePresence initial={false}>
          {saveError && (
            <motion.div
              role="alert"
              key={saveError}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium flex items-start gap-2"
            >
              <span className="flex-1">{saveError}</span>
              <button
                type="button"
                onClick={() => setSaveError(null)}
                className="flex-shrink-0 text-red-400 hover:text-red-600 cursor-pointer"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <AuthInput
            label="Full Name"
            placeholder="Arjun Sharma"
            autoComplete="name"
            required
            error={errors.full_name?.message}
            {...register("full_name")}
          />
          <AuthInput
            label="Phone Number"
            type="tel"
            placeholder="+91 98765 43210"
            autoComplete="tel"
            error={errors.phone?.message}
            {...register("phone")}
          />

          <ReadonlyField label="Email Address" value={userEmail} icon={<Mail className="w-4 h-4" />} />
          <ReadonlyField label="Member Since" value={formattedDate} icon={<Calendar className="w-4 h-4" />} />

          <details className="group">
            <summary className="text-xs font-semibold text-slate-400 cursor-pointer select-none hover:text-slate-600 transition-colors list-none flex items-center gap-1">
              <span className="group-open:hidden">▶ Show account details</span>
              <span className="hidden group-open:inline">▼ Hide account details</span>
            </summary>
            <div className="mt-2">
              <ReadonlyField label="User ID" value={profile.id} icon={<Hash className="w-4 h-4" />} />
            </div>
          </details>

          <div className="flex gap-3 pt-2">
            <motion.button
              type="submit"
              disabled={isSubmitting || !isDirty}
              whileHover={isSubmitting || !isDirty || shouldReduceMotion ? {} : { scale: 1.015 }}
              whileTap={isSubmitting || !isDirty || shouldReduceMotion ? {} : { scale: 0.985 }}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#E53935] hover:bg-[#C62828] disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold rounded-xl transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving profile...</>
              ) : (
                <><Save className="w-4 h-4" /> Save Profile</>
              )}
            </motion.button>

            {isDirty && (
              <motion.button
                type="button"
                onClick={handleCancel}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={shouldReduceMotion ? {} : { scale: 1.015 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.985 }}
                className="px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </motion.button>
            )}
          </div>

          {!isDirty && (
            <p className="text-center text-xs text-slate-400">
              Make changes above to enable Save Profile
            </p>
          )}
        </form>
      </motion.div>
    </div>
  );
}
