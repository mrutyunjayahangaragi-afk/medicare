"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SEVERITY_LEVELS } from "@/types/emergency";
import type { SeverityLevel } from "@/types/database";

interface SeveritySelectorProps {
  value: SeverityLevel | null;
  onChange: (s: SeverityLevel) => void;
  error?: string;
}

export default function SeveritySelector({ value, onChange, error }: SeveritySelectorProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <fieldset>
      <legend className="block text-sm font-bold text-slate-700 mb-2">
        Severity <span className="text-[#E53935]" aria-hidden="true">*</span>
      </legend>
      <div className="grid grid-cols-4 gap-2" role="group">
        {SEVERITY_LEVELS.map((s) => {
          const active = value === s.id;
          return (
            <motion.button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              aria-pressed={active}
              whileHover={shouldReduceMotion ? {} : { scale: 1.04 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
              className={[
                "flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold",
                "transition-all duration-150 cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                active ? s.active : s.inactive + " bg-white hover:bg-slate-50",
              ].join(" ")}
            >
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} aria-hidden="true" />
              {s.label}
            </motion.button>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-[#E53935]" role="alert">{error}</p>}
    </fieldset>
  );
}
