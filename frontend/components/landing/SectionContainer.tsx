"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

interface ContainerProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  bgClass?: string;
}

export default function SectionContainer({ id, children, className = "", bgClass = "" }: ContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id={id}
      ref={ref}
      className={`py-16 md:py-20 lg:py-24 relative overflow-hidden ${bgClass}`}
    >
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 ${className}`}
      >
        {children}
      </motion.div>
    </section>
  );
}
