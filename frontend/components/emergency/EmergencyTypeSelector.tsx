"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EMERGENCY_TYPES } from "@/types/emergency";
import type { EmergencyType } from "@/types/database";

interface EmergencyTypeSelectorProps {
  value: EmergencyType | null;
  onChange: (t: EmergencyType) => void;
  error?: string;
}

export default function EmergencyTypeSelector({ value, onChange, error }: EmergencyTypeSelectorProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <fieldset>
      <legend className="block text-sm font-bold text-slate-700 mb-2">
        Emergency Type <span className="text-[#E53935]" aria-hidden="true">*</span>
      </legend>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2" role="group">
        {EMERGENCY_TYPES.map((t) => {
          const active = value === t.id;
          return (
            <motion.button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-pressed={active}
              whileHover={shouldReduceMotion ? {} : { scale: 1.03 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
              className={[
                "flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 text-xs font-semibold",
                "transition-all duration-150 cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935]/40",
                active
                  ? "border-[#E53935] bg-red-50 text-[#E53935] shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
            >
              <span className="text-xl leading-none" aria-hidden="true">{t.emoji}</span>
              <span className="text-center leading-snug">{t.label}</span>
            </motion.button>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-[#E53935]" role="alert">{error}</p>}
    </fieldset>
  );
}
