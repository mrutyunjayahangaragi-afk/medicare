"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/components/ui/Toast";
import { updateProfile } from "@/lib/profile";
import type { Database } from "@/types/database";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"] as const;
const GENDERS = ["male", "female", "other", "prefer_not_to_say"] as const;

const schema = z.object({
  date_of_birth: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Enter a valid date")
    .refine((val) => !val || new Date(val) <= new Date(), "Date of birth cannot be in the future"),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  address: z
    .string()
    .max(300, "Address must be less than 300 characters")
    .optional()
    .transform((val) => val?.trim() || undefined),
  blood_group: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"]).optional(),
  allergies: z
    .string()
    .max(500, "Allergies must be less than 500 characters")
    .optional()
    .transform((val) => val?.trim() || undefined),
  medical_conditions: z
    .string()
    .max(500, "Medical conditions must be less than 500 characters")
    .optional()
    .transform((val) => val?.trim() || undefined),
  current_medications: z
    .string()
    .max(500, "Current medications must be less than 500 characters")
    .optional()
    .transform((val) => val?.trim() || undefined),
  medical_notes: z
    .string()
    .max(1000, "Medical notes must be less than 1000 characters")
    .optional()
    .transform((val) => val?.trim() || undefined),
});

type FormValues = z.infer<typeof schema>;

interface MedicalInformationFormProps {
  profile: Database["public"]["Tables"]["profiles"]["Row"];
}

export default function MedicalInformationForm({ profile }: MedicalInformationFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date_of_birth: profile.date_of_birth || undefined,
      gender: profile.gender || undefined,
      address: profile.address || undefined,
      blood_group: profile.blood_group || undefined,
      allergies: profile.allergies || undefined,
      medical_conditions: profile.medical_conditions || undefined,
      current_medications: profile.current_medications || undefined,
      medical_notes: profile.medical_notes || undefined,
    },
  });

  useEffect(() => {
    reset({
      date_of_birth: profile.date_of_birth || undefined,
      gender: profile.gender || undefined,
      address: profile.address || undefined,
      blood_group: profile.blood_group || undefined,
      allergies: profile.allergies || undefined,
      medical_conditions: profile.medical_conditions || undefined,
      current_medications: profile.current_medications || undefined,
      medical_notes: profile.medical_notes || undefined,
    });
  }, [profile, reset]);

  const handleFormSubmit = async (data: FormValues) => {
    try {
      const { error } = await updateProfile({
        date_of_birth: data.date_of_birth ?? null,
        gender: data.gender ?? null,
        address: data.address ?? null,
        blood_group: data.blood_group ?? null,
        allergies: data.allergies ?? null,
        medical_conditions: data.medical_conditions ?? null,
        current_medications: data.current_medications ?? null,
        medical_notes: data.medical_notes ?? null,
      });

      if (error) {
        toast("Unable to update your profile. Please try again.", "error");
        return;
      }

      reset(data);
      toast("Profile updated successfully.", "success");
      router.refresh();
    } catch (error) {
      toast("Unable to update your profile. Please try again.", "error");
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Date of Birth (Optional)
          </label>
          <input
            type="date"
            {...register("date_of_birth")}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          {errors.date_of_birth && (
            <p className="mt-1 text-xs text-red-600">{errors.date_of_birth.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Gender (Optional)
          </label>
          <select
            {...register("gender")}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            <option value="">Select gender</option>
            {GENDERS.map((gender) => (
              <option key={gender} value={gender}>
                {gender === "prefer_not_to_say" ? "Prefer not to say" : gender.charAt(0).toUpperCase() + gender.slice(1)}
              </option>
            ))}
          </select>
          {errors.gender && (
            <p className="mt-1 text-xs text-red-600">{errors.gender.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Address (Optional)
        </label>
        <textarea
          {...register("address")}
          placeholder="Enter your address"
          rows={2}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
        />
        {errors.address && (
          <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Blood Group (Optional)
        </label>
        <select
          {...register("blood_group")}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
        >
          <option value="">Select blood group</option>
          {BLOOD_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
        {errors.blood_group && (
          <p className="mt-1 text-xs text-red-600">{errors.blood_group.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Allergies (Optional)
        </label>
        <textarea
          {...register("allergies")}
          placeholder="List any known allergies (e.g., penicillin, peanuts, latex)"
          rows={2}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
        />
        {errors.allergies && (
          <p className="mt-1 text-xs text-red-600">{errors.allergies.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Medical Conditions (Optional)
        </label>
        <textarea
          {...register("medical_conditions")}
          placeholder="List any chronic medical conditions (e.g., diabetes, asthma, hypertension)"
          rows={2}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
        />
        {errors.medical_conditions && (
          <p className="mt-1 text-xs text-red-600">{errors.medical_conditions.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Current Medications (Optional)
        </label>
        <textarea
          {...register("current_medications")}
          placeholder="List any current medications with dosages"
          rows={2}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
        />
        {errors.current_medications && (
          <p className="mt-1 text-xs text-red-600">{errors.current_medications.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Medical Notes (Optional)
        </label>
        <textarea
          {...register("medical_notes")}
          placeholder="Any additional medical information that may be helpful during emergencies"
          rows={3}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
        />
        {errors.medical_notes && (
          <p className="mt-1 text-xs text-red-600">{errors.medical_notes.message}</p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving profile..." : "Save Medical Information"}
        </button>
      </div>

      {!isDirty && (
        <p className="text-center text-xs text-slate-400">
          Make changes above to enable Save
        </p>
      )}
    </form>
  );
}
