"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Siren, MapPin, Bot, Building2, ArrowRight } from "lucide-react";

const features = [
  {
    id: "instant-sos",
    icon: Siren,
    iconClass: "feature-card__icon--red",
    title: "Instant SOS",
    description:
      "One-tap emergency dispatch sends immediate alerts with your medical profile and exact location to responders.",
  },
  {
    id: "live-tracking",
    icon: MapPin,
    iconClass: "feature-card__icon--blue",
    title: "Live Tracking",
    description:
      "Share real-time location with family, ambulance crews, and hospital triage centers throughout the response.",
  },
  {
    id: "ai-assistant",
    icon: Bot,
    iconClass: "feature-card__icon--violet",
    title: "AI Assistant",
    description:
      "Real-time triage and safety guidance. AI conducts situational analysis and advises on first-aid until EMS arrives.",
  },
  {
    id: "nearby-help",
    icon: Building2,
    iconClass: "feature-card__icon--green",
    title: "Nearby Help",
    description:
      "Instantly sync with nearby emergency facilities, partner medical centers, and volunteer responders.",
  },
];

export default function Features() {
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

  const cardVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0, transition },
  };

  return (
    <section id="features" ref={ref} className="py-16 lg:py-20 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12 lg:mb-14">
          <span className="section-badge">Core Capabilities</span>
          <h2 className="section-title">
            World-Class Emergency <span className="red-gradient-text">Features</span>
          </h2>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div key={feature.id} variants={cardVariants} className="feature-card">
                <div className={`feature-card__icon ${feature.iconClass}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="feature-card__title">{feature.title}</h3>
                <p className="feature-card__desc">{feature.description}</p>
                <div className="feature-card__arrow">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
