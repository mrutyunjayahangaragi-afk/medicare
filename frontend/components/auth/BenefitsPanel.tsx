"use client";

import { motion, useReducedMotion } from "framer-motion";
import AuthIllustration from "./AuthIllustration";

interface BenefitsPanelProps {
  variant?: "register" | "login";
}

export default function BenefitsPanel({ variant = "register" }: BenefitsPanelProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: variant === "login" ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.15, ease: "easeOut" as const }}
      className="h-full p-7 xl:p-9 bg-gradient-to-br from-[#fff0f0] to-[#ffe4e4] flex flex-col"
    >
      <AuthIllustration variant={variant} />
    </motion.div>
  );
}
