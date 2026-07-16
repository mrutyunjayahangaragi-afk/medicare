"use client";

import { forwardRef, InputHTMLAttributes, useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  showStrength?: boolean;
  watchValue?: string;
}

function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-400" };
  if (score === 2) return { score, label: "Fair", color: "bg-amber-400" };
  if (score === 3) return { score, label: "Good", color: "bg-yellow-400" };
  if (score === 4) return { score, label: "Strong", color: "bg-green-400" };
  return { score, label: "Very Strong", color: "bg-green-500" };
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, showStrength = false, watchValue, id, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const uid = useId();
    const inputId = id ?? uid;
    const errorId = `${inputId}-error`;
    const strength = showStrength ? getStrength(watchValue ?? "") : null;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-semibold text-slate-700">
          {label}
          {props.required && (
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
          )}
        </label>

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={[
              "w-full px-4 py-3 pr-11 rounded-xl border bg-white text-slate-900 text-sm placeholder:text-slate-400",
              "transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400",
              error
                ? "border-red-400 bg-red-50/40"
                : "border-slate-200 hover:border-slate-300",
            ].join(" ")}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            tabIndex={-1}
          >
            {visible ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
          </button>
        </div>

        {/* Password strength bar */}
        {showStrength && watchValue && (
          <div className="space-y-1">
            <div className="flex gap-1 h-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={[
                    "flex-1 rounded-full transition-all duration-300",
                    strength && i <= strength.score ? strength.color : "bg-slate-200",
                  ].join(" ")}
                />
              ))}
            </div>
            {strength && strength.label && (
              <p className="text-xs text-slate-500">
                Strength:{" "}
                <span
                  className={
                    strength.score <= 1
                      ? "text-red-500 font-semibold"
                      : strength.score <= 3
                      ? "text-amber-500 font-semibold"
                      : "text-green-600 font-semibold"
                  }
                >
                  {strength.label}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Password rules hint (shown when no error) */}
        {showStrength && !error && (
          <p className="text-xs text-slate-400">
            Min 8 chars · uppercase · lowercase · number
          </p>
        )}

        <AnimatePresence initial={false}>
          {error && (
            <motion.p
              id={errorId}
              role="alert"
              key={error}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="text-xs font-medium text-red-500"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
export default PasswordInput;
