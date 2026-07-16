"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Phone,
  MapPin,
  FileText,
  Heart,
  Lightbulb,
} from "lucide-react";

interface Tip {
  icon: React.ReactNode;
  heading: string;
  body: string;
}

const TIPS: Tip[] = [
  {
    icon: <Phone className="w-5 h-5" aria-hidden="true" />,
    heading: "Keep emergency contacts updated",
    body: "Make sure your trusted contacts are current so they can be notified quickly during an emergency.",
  },
  {
    icon: <MapPin className="w-5 h-5" aria-hidden="true" />,
    heading: "Allow location access",
    body: "Enabling location permissions helps emergency responders reach you faster and more accurately.",
  },
  {
    icon: <FileText className="w-5 h-5" aria-hidden="true" />,
    heading: "Provide accurate information",
    body: "Always submit clear and accurate emergency details — correct information saves critical time.",
  },
  {
    icon: <Heart className="w-5 h-5" aria-hidden="true" />,
    heading: "Keep medical details handy",
    body: "Maintain an updated summary of allergies, blood type, and existing conditions for faster care.",
  },
];

export default function HealthTips() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section aria-labelledby="health-tips-heading">
      <div className="flex items-center gap-2.5 mb-4">
        <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0" aria-hidden="true" />
        <h2
          id="health-tips-heading"
          className="text-base font-black text-slate-900"
        >
          Health &amp; Safety Tips
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TIPS.map((tip, i) => (
          <motion.article
            key={tip.heading}
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 * i, ease: "easeOut" }}
            className="flex items-start gap-4 bg-white border border-slate-100 rounded-2xl shadow-sm p-5"
          >
            {/* Icon */}
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mt-0.5"
              aria-hidden="true"
            >
              {tip.icon}
            </div>

            {/* Content */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 leading-snug mb-1">
                {tip.heading}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">{tip.body}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
