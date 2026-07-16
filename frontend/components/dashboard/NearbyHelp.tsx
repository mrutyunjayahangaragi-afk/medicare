"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Hospital, Pill, Ambulance, ArrowRight } from "lucide-react";

interface NearbyCard {
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  iconBg: string;
  iconColor: string;
}

const NEARBY_CARDS: NearbyCard[] = [
  {
    label: "Nearby Hospitals",
    description:
      "Find the nearest hospitals and emergency rooms available in your area.",
    icon: <Hospital className="w-6 h-6" aria-hidden="true" />,
    href: "/dashboard/nearby?type=hospital",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    label: "Nearby Pharmacies",
    description:
      "Locate pharmacies around you for medicines, first aid, and healthcare supplies.",
    icon: <Pill className="w-6 h-6" aria-hidden="true" />,
    href: "/dashboard/nearby?type=pharmacy",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    label: "Ambulance Services",
    description:
      "Find and contact ambulance services for immediate medical transport.",
    icon: <Ambulance className="w-6 h-6" aria-hidden="true" />,
    href: "/dashboard/nearby?type=ambulance",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
];

export default function NearbyHelp() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section aria-labelledby="nearby-help-heading">
      <h2
        id="nearby-help-heading"
        className="text-base font-black text-slate-900 mb-4"
      >
        Nearby Help
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {NEARBY_CARDS.map((card, i) => (
          <motion.div
            key={card.label}
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.06 * i, ease: "easeOut" }}
            whileHover={shouldReduceMotion ? {} : { y: -3 }}
            className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex flex-col gap-4 group transition-shadow hover:shadow-md"
          >
            {/* Icon */}
            <div
              className={`w-12 h-12 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center flex-shrink-0`}
            >
              {card.icon}
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1">
                {card.label}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {card.description}
              </p>
            </div>

            {/* Action */}
            <Link
              href={card.href}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors group-hover:gap-2 focus-visible:underline"
              aria-label={`Find ${card.label}`}
            >
              Find Nearby
              <ArrowRight
                className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
