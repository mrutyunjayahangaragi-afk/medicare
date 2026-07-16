"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/components/ui/Toast";
import AuthInput from "@/components/auth/AuthInput";
import type { EmergencyContact } from "@/types/database";

const RELATIONSHIPS = [
  "Parent",
  "Spouse",
  "Sibling",
  "Relative",
  "Friend",
  "Guardian",
  "Doctor",
  "Caregiver",
  "Other",
] as const;

const schema = z.object({
  full_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .transform((v) => v.trim()),
  relationship: z
    .string()
    .min(2, "Relationship is required")
    .max(50, "Relationship must be less than 50 characters")
    .transform((v) => v.trim()),
  phone_number: z
    .string()
    .min(7, "Phone number must be at least 7 digits")
    .max(20, "Phone number must be less than 20 digits")
    .regex(/^[+]?[\d\s-()]+$/, "Enter a valid phone number")
    .transform((v) => v.trim()),
  alternate_phone: z
    .string()
    .optional()
    .refine((val: string | undefined) => !val || val.length >= 7, "Phone number must be at least 7 digits")
    .refine((val: string | undefined) => !val || val.length <= 20, "Phone number must be less than 20 digits")
    .refine((val: string | undefined) => !val || /^[+]?[\d\s-()]+$/.test(val), "Enter a valid phone number")
    .transform((val) => val?.trim() || undefined),
  email: z
    .string()
    .optional()
    .refine((val: string | undefined) => !val || /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(val), "Enter a valid email")
    .transform((val) => val?.trim() || undefined),
  is_primary: z.boolean().default(false),
  notify_during_emergency: z.boolean().default(true),
  notes: z
    .string()
    .max(300, "Notes must be less than 300 characters")
    .optional()
    .transform((val) => val?.trim() || undefined),
  custom_relationship: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ContactFormProps {
  contact?: EmergencyContact;
  onSubmit: (data: FormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function ContactForm({ contact, onSubmit, onCancel, isSubmitting }: ContactFormProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: contact
      ? {
          full_name: contact.full_name,
          relationship: contact.relationship ?? undefined,
          phone_number: contact.phone_number,
          alternate_phone: contact.alternate_phone || undefined,
          email: contact.email || undefined,
          is_primary: contact.is_primary,
          notify_during_emergency: contact.notify_during_emergency,
          notes: contact.notes || undefined,
        }
      : {
          full_name: "",
          relationship: "",
          phone_number: "",
          alternate_phone: undefined,
          email: undefined,
          is_primary: false,
          notify_during_emergency: true,
          notes: undefined,
        },
  });

  const relationship = watch("relationship");
  const showCustomRelationship = relationship === "Other";

  const handleFormSubmit = async (data: FormValues) => {
    // Use custom relationship if "Other" is selected
    const finalData = {
      ...data,
      relationship: showCustomRelationship && data.custom_relationship ? data.custom_relationship : data.relationship,
    };
    
    try {
      await onSubmit(finalData);
      reset();
    } catch (error) {
      toast("Failed to save contact. Please try again.", "error");
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
      <AuthInput
        label="Full Name"
        placeholder="Enter contact's full name"
        autoComplete="name"
        required
        error={errors.full_name?.message}
        {...register("full_name")}
      />

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Relationship <span className="text-red-500">*</span>
        </label>
        <select
          {...register("relationship")}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
        >
          {RELATIONSHIPS.map((rel) => (
            <option key={rel} value={rel}>
              {rel}
            </option>
          ))}
        </select>
        {errors.relationship && (
          <p className="mt-1 text-xs text-red-600">{errors.relationship.message}</p>
        )}
      </div>

      {showCustomRelationship && (
        <AuthInput
          label="Custom Relationship"
          placeholder="Specify relationship"
          error={errors.custom_relationship?.message}
          {...register("custom_relationship")}
        />
      )}

      <AuthInput
        label="Phone Number"
        type="tel"
        placeholder="+91 98765 43210"
        autoComplete="tel"
        required
        error={errors.phone_number?.message}
        {...register("phone_number")}
      />

      <AuthInput
        label="Alternate Phone (Optional)"
        type="tel"
        placeholder="+91 98765 43210"
        error={errors.alternate_phone?.message}
        {...register("alternate_phone")}
      />

      <AuthInput
        label="Email (Optional)"
        type="email"
        placeholder="contact@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <div className="space-y-3 pt-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register("is_primary")}
            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">Set as primary emergency contact</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register("notify_during_emergency")}
            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">Notify during emergencies</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Notes (Optional)
        </label>
        <textarea
          {...register("notes")}
          placeholder="Additional notes about this contact..."
          rows={3}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
        />
        {errors.notes && (
          <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : contact ? "Update Contact" : "Add Contact"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
