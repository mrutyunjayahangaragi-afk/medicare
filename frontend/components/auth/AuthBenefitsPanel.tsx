"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, Siren, HeartHandshake, Heart } from "lucide-react";

const benefits = [
  {
    icon: <ShieldCheck className="w-5 h-5 text-red-500" />,
    title: "Be Prepared",
    desc: "Emergency situations can happen anytime. Stay one step ahead.",
  },
  {
    icon: <Siren className="w-5 h-5 text-red-500" />,
    title: "Get Help Faster",
    desc: "AI, community, and technology working together to reach you.",
  },
  {
    icon: <HeartHandshake className="w-5 h-5 text-red-500" />,
    title: "Save Lives",
    desc: "Together, we can make a real difference when every second counts.",
  },
];

interface AuthBenefitsPanelProps {
  variant?: "register" | "login";
}

export default function AuthBenefitsPanel({ variant = "register" }: AuthBenefitsPanelProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      className="flex flex-col justify-between h-full"
    >
      {/* Illustration area */}
      <div className="flex flex-col items-center text-center mb-8">
        {/* SVG illustration — shield + cross + users */}
        <div className="relative w-52 h-52 mx-auto mb-6">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-red-100/60 pulse-ring-slow" />
          {/* Main circle */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-red-50 to-red-100 border border-red-200/60 flex items-center justify-center">
            <svg
              viewBox="0 0 120 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-28 h-28"
              aria-hidden="true"
              role="img"
            >
              {/* Shield */}
              <path
                d="M60 10 L95 26 L95 60 C95 82 60 110 60 110 C60 110 25 82 25 60 L25 26 Z"
                fill="rgba(229,57,53,0.12)"
                stroke="#e53935"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              {/* Medical cross */}
              <rect x="52" y="42" width="16" height="36" rx="3" fill="#e53935" />
              <rect x="42" y="52" width="36" height="16" rx="3" fill="#e53935" />
              {/* Small user icons at bottom */}
              <circle cx="38" cy="96" r="6" fill="#fecaca" />
              <circle cx="60" cy="100" r="6" fill="#fecaca" />
              <circle cx="82" cy="96" r="6" fill="#fecaca" />
              <path d="M32 108 Q38 103 44 108" stroke="#e53935" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d="M54 112 Q60 107 66 112" stroke="#e53935" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d="M76 108 Q82 103 88 108" stroke="#e53935" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              {/* Heartbeat line */}
              <polyline
                points="28,70 36,70 40,58 46,82 52,70 68,70 72,58 78,82 84,70 92,70"
                stroke="#ef4444"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.5"
              />
            </svg>
          </div>
          {/* Floating badge */}
          <div className="absolute -top-2 -right-2 bg-white rounded-xl shadow-lg border border-red-100 px-3 py-1.5 flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span className="text-xs font-bold text-slate-700">Live Ready</span>
          </div>
          {/* Floating stats badge */}
          <div className="absolute -bottom-2 -left-2 bg-white rounded-xl shadow-lg border border-green-100 px-3 py-1.5">
            <p className="text-xs font-black text-green-600">10k+</p>
            <p className="text-[10px] text-slate-500 font-medium">Lives Helped</p>
          </div>
        </div>

        <h2 className="text-xl font-black text-slate-900 leading-tight">
          Emergency{" "}
          <span className="red-gradient-text">Response</span>
          <br />
          When It Matters Most
        </h2>
        <p className="text-sm text-slate-500 mt-2 max-w-xs">
          {variant === "register"
            ? "Join thousands of users, volunteers, and hospitals making India safer."
            : "Your trusted network of emergency responders is ready."}
        </p>
      </div>

      {/* Benefits list */}
      <ul className="flex flex-col gap-4">
        {benefits.map((b, i) => (
          <motion.li
            key={b.title}
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.35 + i * 0.1, ease: "easeOut" }}
            className="flex items-start gap-3"
          >
            <div className="flex-shrink-0 w-9 h-9 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center mt-0.5">
              {b.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{b.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{b.desc}</p>
            </div>
          </motion.li>
        ))}
      </ul>

      {/* Trusted by footer */}
      <div className="mt-8 pt-6 border-t border-red-100">
        <p className="text-xs text-slate-400 text-center font-medium">
          Trusted by <strong className="text-slate-600">50,000+</strong> users across India
        </p>
        <div className="flex justify-center gap-2 mt-3">
          {["AIIMS", "Apollo", "Fortis", "NDRF"].map((org) => (
            <span
              key={org}
              className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg"
            >
              {org}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
