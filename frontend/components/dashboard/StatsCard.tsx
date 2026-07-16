"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  subtitle?: string;
  delay?: number;
}

function AnimatedCounter({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (!inView || shouldReduce) return;
    const el = ref.current;
    if (!el) return;
    let startTime = 0;
    const duration = 900;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      el.textContent = String(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, shouldReduce]);

  return <span ref={ref}>{shouldReduce ? target : 0}</span>;
}

export default function StatsCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  subtitle,
  delay = 0,
}: StatsCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={shouldReduceMotion ? {} : { y: -3, scale: 1.02 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4 cursor-default"
    >
      <div
        className={`flex-shrink-0 w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mt-0.5`}
        aria-hidden="true"
      >
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-slate-900 leading-none tabular-nums">
          {typeof value === "number" ? (
            <AnimatedCounter target={value} />
          ) : (
            value
          )}
        </p>
        <p className="text-xs font-semibold text-slate-600 mt-1 leading-snug">{label}</p>
        {subtitle && (
          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{subtitle}</p>
        )}
      </div>
    </motion.article>
  );
}
