"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Siren, Shield, Users, Award } from "lucide-react";

interface CounterProps {
  target: number;
  suffix: string;
  duration?: number;
}

function AnimatedCounter({ target, suffix, duration = 1200 }: CounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      // Use setTimeout(0) to avoid synchronous setState inside effect body
      const id = setTimeout(() => setCount(target), 0);
      return () => clearTimeout(id);
    }

    if (!isInView) return;

    let start = 0;
    const end = target;
    const incrementTime = Math.min(Math.floor(duration / end), 40);
    const step = Math.ceil(end / (duration / incrementTime));

    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [isInView, target, duration, shouldReduceMotion]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

const stats = [
  {
    id: "requests",
    icon: Siren,
    target: 10000,
    suffix: "+",
    label: "Emergency Requests",
  },
  {
    id: "hospitals",
    icon: Shield,
    target: 500,
    suffix: "+",
    label: "Partner Hospitals",
  },
  {
    id: "volunteers",
    icon: Users,
    target: 1200,
    suffix: "+",
    label: "Active Volunteers",
  },
  {
    id: "success",
    icon: Award,
    target: 95,
    suffix: "%",
    label: "Successful Response",
  },
];

export default function Statistics() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();

  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.35, ease: "easeOut" as const };

  const containerVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { ...transition, staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: { opacity: 1, y: 0, transition },
  };

  return (
    <section id="statistics" ref={ref} className="py-10 lg:py-14 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="stats-panel grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.id} variants={itemVariants} className="stats-item">
                <div className="stats-item__icon">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="stats-item__value">
                  <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                </span>
                <h3 className="stats-item__label">{stat.label}</h3>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
