"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { PhoneCall, BrainCircuit, ShieldAlert, Navigation, CheckCircle2 } from "lucide-react";

const steps = [
  {
    id: 1,
    icon: PhoneCall,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    badgeBg: "bg-red-500",
    title: "Report Emergency",
    description: "Tap the SOS button or use voice activation. Telemetry syncs in under a second.",
  },
  {
    id: 2,
    icon: BrainCircuit,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    badgeBg: "bg-blue-500",
    title: "AI Analyzes",
    description: "AI maps local facilities, calculates severity, and guides first-aid steps.",
  },
  {
    id: 3,
    icon: ShieldAlert,
    iconBg: "bg-green-50",
    iconColor: "text-green-500",
    badgeBg: "bg-green-500",
    title: "Finds Help",
    description: "Nearby hospitals and responders receive automated alerts. Units are dispatched.",
  },
  {
    id: 4,
    icon: Navigation,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
    badgeBg: "bg-orange-500",
    title: "Live Tracking",
    description: "Follow EMS routes live on your device. Real-time telemetry coordinates ETA.",
  },
  {
    id: 5,
    icon: CheckCircle2,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-500",
    badgeBg: "bg-violet-500",
    title: "You're Safe",
    description: "Successful hand-off at medical centers. Incident history is encrypted and saved.",
  },
];

export default function HowItWorks() {
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
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0, transition },
  };

  return (
    <section id="how-it-works" ref={ref} className="py-16 lg:py-20 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12 lg:mb-14">
          <span className="section-badge">How It Works</span>
          <h2 className="section-title">
            Help in <span className="red-gradient-text">5 Simple Steps</span>
          </h2>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="hidden lg:flex items-start gap-2 relative"
        >
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.id}
                variants={itemVariants}
                className="flex-1 flex flex-col items-center relative text-center"
              >
                {idx < steps.length - 1 && <div className="step-connector" aria-hidden="true" />}

                <div className={`step-node ${step.iconBg}`}>
                  <Icon className={`w-8 h-8 ${step.iconColor}`} />
                  <div className={`step-node__badge ${step.badgeBg}`}>{step.id}</div>
                </div>

                <div className="px-2 mt-5">
                  <h3 className="text-sm font-extrabold text-slate-800 mb-1.5">{step.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="lg:hidden flex flex-col gap-0 relative"
        >
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div key={step.id} variants={itemVariants} className="flex gap-5 relative">
                {idx < steps.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-0 w-0 border-l-2 border-dashed border-slate-200" />
                )}

                <div className="flex flex-col items-center z-10 flex-shrink-0">
                  <div className={`step-node w-12 h-12 rounded-xl ${step.iconBg}`}>
                    <Icon className={`w-5 h-5 ${step.iconColor}`} />
                    <div className={`step-node__badge w-4 h-4 text-[8px] ${step.badgeBg}`}>
                      {step.id}
                    </div>
                  </div>
                </div>

                <div className="pb-8 pt-1 flex-1">
                  <h3 className="text-sm font-extrabold text-slate-800 mb-1">{step.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
