"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, Siren, HeartHandshake } from "lucide-react";

const benefits = [
  {
    icon: ShieldCheck,
    title: "Be Prepared",
    desc: "Emergency situations can happen anytime.",
  },
  {
    icon: Siren,
    title: "Get Help Faster",
    desc: "AI, community, and technology working together.",
  },
  {
    icon: HeartHandshake,
    title: "Save Lives",
    desc: "Together, we can make a real difference.",
  },
];

interface AuthIllustrationProps {
  variant?: "register" | "login";
}

export default function AuthIllustration({ variant = "register" }: AuthIllustrationProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Top: illustration */}
      <div className="flex flex-col items-center text-center">
        {/* Heading */}
        <div className="mb-5">
          <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">
            {variant === "login" ? "Trusted Platform" : "Emergency Ready"}
          </p>
          <h2 className="text-xl font-black text-slate-800 leading-snug">
            {variant === "login"
              ? "Your Safety Network\nIs Always On"
              : "Emergency Response\nWhen It Matters Most"}
          </h2>
        </div>

        {/* SVG medical illustration */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : { y: [0, -6, 0] }
          }
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative w-48 h-48 mx-auto mb-4"
        >
          {/* Soft glow background */}
          <div className="absolute inset-0 rounded-full bg-red-100/80" />
          {/* Inner circle */}
          <div className="absolute inset-3 rounded-full bg-white/60 flex items-center justify-center">
            <svg
              viewBox="0 0 120 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-32 h-32"
              aria-label="Medicare emergency response illustration"
              role="img"
            >
              {/* Shield body */}
              <path
                d="M60 8 L92 22 L92 58 C92 78 60 108 60 108 C60 108 28 78 28 58 L28 22 Z"
                fill="rgba(229,57,53,0.10)"
                stroke="#e53935"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              {/* Medical cross vertical */}
              <rect x="53" y="40" width="14" height="32" rx="3" fill="#e53935" />
              {/* Medical cross horizontal */}
              <rect x="40" y="53" width="40" height="14" rx="3" fill="#e53935" />
              {/* People silhouettes at base */}
              <circle cx="36" cy="94" r="5.5" fill="#fca5a5" />
              <circle cx="60" cy="97" r="5.5" fill="#fca5a5" />
              <circle cx="84" cy="94" r="5.5" fill="#fca5a5" />
              {/* Heartbeat line across middle */}
              <polyline
                points="22,66 30,66 35,55 42,77 49,66 71,66 76,55 83,77 90,66 98,66"
                stroke="#ef4444"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.45"
              />
            </svg>
          </div>

          {/* Floating micro-badge top-right */}
          <div className="absolute -top-1 -right-1 bg-white border border-red-100 rounded-xl shadow-md px-2.5 py-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-700">Live</span>
          </div>
          {/* Floating micro-badge bottom-left */}
          <div className="absolute -bottom-1 -left-1 bg-white border border-slate-100 rounded-xl shadow-md px-2.5 py-1.5 text-center">
            <p className="text-xs font-black text-red-500 leading-none">10k+</p>
            <p className="text-[10px] text-slate-400 font-medium">Helped</p>
          </div>
        </motion.div>

        <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
          {variant === "register"
            ? "Join thousands across India staying safe together."
            : "Your trusted network of emergency responders is ready."}
        </p>
      </div>

      {/* Middle: benefits list */}
      <ul className="flex flex-col gap-3 my-6">
        {benefits.map((b, i) => {
          const Icon = b.icon;
          return (
            <motion.li
              key={b.title}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.35, ease: "easeOut" as const }}
              className="flex items-start gap-3"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/70 border border-red-100 shadow-sm flex items-center justify-center mt-0.5">
                <Icon className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 leading-tight">{b.title}</p>
                <p className="text-xs text-slate-500 leading-snug">{b.desc}</p>
              </div>
            </motion.li>
          );
        })}
      </ul>

      {/* Bottom: trust row */}
      <div className="pt-4 border-t border-red-100/80">
        <p className="text-[11px] text-slate-400 text-center mb-2">Trusted by</p>
        <div className="flex justify-center gap-1.5 flex-wrap">
          {["AIIMS", "Apollo", "Fortis", "NDRF"].map((org) => (
            <span
              key={org}
              className="text-[10px] font-bold text-slate-400 bg-white/60 border border-red-100 px-2 py-0.5 rounded-lg"
            >
              {org}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
