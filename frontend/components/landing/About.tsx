"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Heart, Brain } from "lucide-react";

export default function About() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();

  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.35, ease: "easeOut" as const };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0, transition },
  };

  const imageVariants = {
    hidden: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 },
    visible: { opacity: 1, scale: 1, transition },
  };

  return (
    <section
      id="about"
      ref={ref}
      className="py-20 lg:py-28 bg-slate-50 relative overflow-hidden border-t border-slate-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
        >
          {/* Left Column: Mission text & metrics */}
          <div className="flex flex-col gap-6 lg:gap-8">
            <motion.div variants={itemVariants}>
              <span className="inline-block text-xs font-bold text-red-600 uppercase tracking-widest bg-red-50 border border-red-100 px-4 py-1.5 rounded-full mb-4">
                Our Mission
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
                We&apos;re Here To <span className="red-gradient-text">Save Lives</span>
              </h2>
              <p className="text-slate-600 text-base leading-relaxed mb-4">
                Medicare is an AI-powered HealthTech and emergency-response platform designed to streamline dispatch protocols and deliver critical care during the moments that matter most.
              </p>
              <p className="text-slate-500 text-sm leading-relaxed">
                By bridging geolocated telemetries, paramedics, hospital systems, and automated first-aid dispatch, we reduce emergency response delays, guaranteeing that help arrives faster.
              </p>
            </motion.div>

            {/* Structured Points */}
            <div className="grid sm:grid-cols-2 gap-6">
              <motion.div
                variants={itemVariants}
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex gap-4"
              >
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 flex-shrink-0">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">Care Centric</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">Prioritizing user safety, health records sync, and patient comfort above all else.</p>
                </div>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex gap-4"
              >
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center text-violet-500 flex-shrink-0">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">AI Coordinated</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">Utilizing advanced models to route dispatch and predict nearest medical solutions.</p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Right Column: Premium Illustration */}
          <motion.div
            variants={imageVariants}
            className="flex justify-center items-center lg:pl-6"
          >
            {/* Visual Box */}
            <div className="relative w-full max-w-md aspect-square bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.03)] flex items-center justify-center overflow-hidden">
              {/* Inner animated decorative circle */}
              <div className="absolute w-[280px] h-[280px] bg-red-50 rounded-full blur-[60px] opacity-70 pointer-events-none" />

              {/* Graphic SVG */}
              <svg
                viewBox="0 0 200 200"
                className="w-64 h-64 relative z-10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Background loop lines */}
                <path
                  d="M20 100 Q 100 15 180 100 T 20 100"
                  stroke="#cbd5e1"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                />
                <circle cx="100" cy="100" r="45" stroke="#fee2e2" strokeWidth="1.5" />
                <circle cx="100" cy="100" r="75" stroke="#f1f5f9" strokeWidth="1.2" />

                {/* Central heart cross shield */}
                <g className={`transform-gpu origin-center ${shouldReduceMotion ? "" : "float-slow"}`}>
                  <rect x="75" y="75" width="50" height="50" rx="14" fill="#e53935" className="shadow-md" />
                  {/* Cross icon representation */}
                  <path d="M100 87 V113 M87 100 H113" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
                </g>

                {/* Satellite 1: Medical Shield */}
                <g className={`transform-gpu origin-center ${shouldReduceMotion ? "" : "float-slower"}`}>
                  <circle cx="45" cy="65" r="16" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1.2" />
                  <text x="39" y="69" className="text-xs select-none">🛡️</text>
                </g>

                {/* Satellite 2: Hospital Icon */}
                <g className={`transform-gpu origin-center ${shouldReduceMotion ? "" : "float-slow [animation-delay:1.5s]"}`}>
                  <circle cx="155" cy="65" r="16" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1.2" />
                  <text x="149" y="69" className="text-xs select-none">🏥</text>
                </g>

                {/* Satellite 3: Doctor representation */}
                <g className={`transform-gpu origin-center ${shouldReduceMotion ? "" : "float-slower"}`}>
                  <circle cx="45" cy="135" r="16" fill="#fff5f5" stroke="#fecaca" strokeWidth="1.2" />
                  <text x="39" y="139" className="text-xs select-none">👩‍⚕️</text>
                </g>

                {/* Satellite 4: AI Network Node */}
                <g className={`transform-gpu origin-center ${shouldReduceMotion ? "" : "float-slow [animation-delay:2s]"}`}>
                  <circle cx="155" cy="135" r="16" fill="#faf5ff" stroke="#e9d5ff" strokeWidth="1.2" />
                  <text x="149" y="139" className="text-xs select-none">🧠</text>
                </g>
              </svg>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
