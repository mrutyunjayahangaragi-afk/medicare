"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, PlayCircle, Shield, Brain, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PrimaryButton from "./PrimaryButton";
import SecondaryButton from "./SecondaryButton";

export default function Hero() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();

  // Check auth state once on mount — no polling, no sensitive data stored
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  const handleRequestHelp = () => {
    if (isLoggedIn) {
      router.push("/dashboard/emergency");
    } else {
      router.push("/login?next=/dashboard/emergency");
    }
  };

  const scrollToHowItWorks = () => {
    const el = document.getElementById("how-it-works");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const transitionBase = shouldReduceMotion ? { duration: 0 } : { duration: 0.35, ease: "easeOut" as const };

  const contentVariants = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : -30 },
    visible: { opacity: 1, x: 0, transition: { ...transitionBase, staggerChildren: 0.08 } },
  };

  const graphicVariants = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : 30 },
    visible: { opacity: 1, x: 0, transition: transitionBase },
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center pt-28 pb-16 overflow-hidden bg-gradient-to-b from-white via-red-50/10 to-slate-50 border-b border-slate-100"
    >
      {/* Background decorations — pointer-events-none ensures they never block clicks */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-red-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Heading and Info */}
          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            className="col-span-12 lg:col-span-6 flex flex-col gap-6 lg:gap-8 text-left"
          >
            {/* Title */}
            <div className="flex flex-col gap-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08]">
                AI-Powered
                <br />
                <span className="red-gradient-text">Emergency</span>
                <br />
                Assistance
              </h1>
              <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-[480px] mt-2">
                Medicare connects you to immediate help, nearby hospitals, AI guidance, and real-time support when every second matters.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 relative z-10">
              <PrimaryButton
                onClick={handleRequestHelp}
                className="px-7 py-4"
                aria-label={isLoggedIn ? "Go to emergency dashboard" : "Log in to request help"}
              >
                <Bell className="w-4 h-4 fill-white animate-bounce" />
                Request Help
              </PrimaryButton>
              <SecondaryButton
                onClick={scrollToHowItWorks}
                className="px-7 py-4"
                aria-label="Scroll to How It Works section"
              >
                <PlayCircle className="w-4 h-4 text-slate-400" />
                Learn More
              </SecondaryButton>
            </div>

            {/* Mockup Badges */}
            <div className="flex flex-wrap gap-3 sm:gap-4 pt-2 border-t border-slate-100/80 max-w-[480px]">
              {[
                { label: "24/7 Emergency", icon: Shield, color: "text-blue-500 bg-blue-50" },
                { label: "AI Powered", icon: Brain, color: "text-violet-500 bg-violet-50" },
                { label: "Secure & Reliable", icon: ShieldCheck, color: "text-green-500 bg-green-50" },
              ].map((badge, idx) => {
                const Icon = badge.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-100 shadow-sm"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${badge.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-extrabold text-slate-600">{badge.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Right Column: High-fidelity visual mockup of Mockup Image */}
          <motion.div
            variants={graphicVariants}
            initial="hidden"
            animate="visible"
            className="col-span-12 lg:col-span-6 flex justify-center items-center relative lg:pl-4 overflow-visible"
          >
            {/* SVG Visual Graphic combining City, Drone, Ambulance, phone and Doctors */}
            <svg
              viewBox="0 0 540 400"
              className="w-full max-w-[500px] h-auto overflow-visible relative z-10"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* City skyline linear gradient */}
                <linearGradient id="cityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f1f5f9" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.8" />
                </linearGradient>
                {/* Ambulance gradient */}
                <linearGradient id="ambGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#f1f5f9" />
                </linearGradient>
                {/* Phone screen gradient */}
                <linearGradient id="phoneScreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
                {/* Radar pulse gradient */}
                <radialGradient id="radar" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                  <stop offset="70%" stopColor="#ef4444" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* BACKGROUND: Soft City Skyline outline */}
              <g fill="url(#cityGrad)" opacity="0.75" transform="translate(0, 80)">
                <rect x="20" y="100" width="30" height="120" rx="3" />
                <rect x="55" y="80" width="40" height="140" rx="3" />
                <rect x="100" y="130" width="25" height="90" rx="3" />
                <rect x="130" y="60" width="45" height="160" rx="3" />
                <rect x="180" y="110" width="35" height="110" rx="3" />
                <rect x="220" y="40" width="50" height="180" rx="4" />
                <rect x="275" y="90" width="40" height="130" rx="3" />
                <rect x="320" y="120" width="30" height="100" rx="3" />
                <rect x="355" y="50" width="45" height="170" rx="3" />
                <rect x="405" y="100" width="35" height="120" rx="3" />
                <rect x="445" y="130" width="25" height="90" rx="3" />
                <rect x="475" y="70" width="40" height="150" rx="3" />
              </g>

              {/* RADAR PULSE WAVES */}
              <g transform="translate(325, 230)">
                <circle cx="0" cy="0" r="50" fill="url(#radar)" className="pulse-ring-slow" />
                <circle cx="0" cy="0" r="85" fill="url(#radar)" className="pulse-ring-slow" style={{ animationDelay: "1.2s" }} />
              </g>

              {/* BACKGROUND CROSS DECORATION */}
              <g transform="translate(480, 100)" className="float-slow" style={{ animationDelay: "1.5s" }}>
                <circle cx="0" cy="0" r="16" fill="#e53935" />
                <path d="M-7 0 H7 M0 -7 V7" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
              </g>

              {/* VECTOR DRONE (TOP RIGHT) */}
              <g transform="translate(450, 45)" className="float-slow">
                {/* Props */}
                <line x1="-30" y1="-8" x2="30" y2="-8" stroke="#334155" strokeWidth="2.5" />
                <circle cx="-20" cy="-8" r="7" fill="none" stroke="#475569" strokeWidth="1.5" />
                <circle cx="20" cy="-8" r="7" fill="none" stroke="#475569" strokeWidth="1.5" />
                <path d="M-28 -8 h16 M12 -8 h16" stroke="#94a3b8" strokeWidth="1.5" />
                {/* Drone Body */}
                <ellipse cx="0" cy="0" rx="18" ry="8" fill="#1e293b" />
                <circle cx="-10" cy="0" r="3.5" fill="#38bdf8" />
                <circle cx="10" cy="0" r="3.5" fill="#38bdf8" />
                {/* Landing legs */}
                <path d="M-10 8 l-4 8 M10 8 l4 8" stroke="#334155" strokeWidth="2" />
                {/* Medical Cargo Box */}
                <rect x="-8" y="10" width="16" height="14" rx="2" fill="#e53935" />
                <path d="M-4 17 h8 M0 13 v8" stroke="#ffffff" strokeWidth="1.5" />
              </g>

              {/* VECTOR SMARTPHONE (MIDDLE RIGHT BACKGROUND) */}
              <g transform="translate(310, 105)">
                {/* Phone casing */}
                <rect x="0" y="0" width="105" height="200" rx="18" fill="#1e293b" stroke="#334155" strokeWidth="3" />
                {/* Screen */}
                <rect x="4" y="4" width="97" height="192" rx="14" fill="url(#phoneScreen)" />
                {/* Speaker/Camera notch */}
                <rect x="32" y="4" width="41" height="8" rx="4" fill="#1e293b" />
                
                {/* Simulated map route */}
                <path d="M15 170 Q 40 140 30 110 T 80 80" fill="none" stroke="#64748b" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
                <path d="M30 110 H85" fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round" opacity="0.2" />
                {/* Active red route */}
                <path d="M15 170 Q 40 140 30 110 T 54 92" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="6 4" />
                
                {/* Map Pins */}
                {/* Ambulance source */}
                <circle cx="15" cy="170" r="5" fill="#3b82f6" />
                {/* SOS Target Pin */}
                <g transform="translate(54, 92)">
                  <path d="M0 0 C-4 -6 -5 -12 0 -15 C5 -12 4 -6 0 0" fill="#e53935" />
                  <circle cx="0" cy="-9" r="2.5" fill="#ffffff" />
                </g>

                {/* Dashboard layout overlay */}
                <rect x="10" y="16" width="85" height="42" rx="6" fill="#0f172a" fillOpacity="0.8" stroke="#334155" strokeWidth="0.8" />
                <text x="52.5" y="32" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">SOS ACTIVE</text>
                <text x="52.5" y="44" fill="#94a3b8" fontSize="6.5" textAnchor="middle">Live Location Sharing...</text>

                {/* Status bottom overlay */}
                <rect x="10" y="148" width="85" height="38" rx="6" fill="#e53935" fillOpacity="0.1" stroke="#ef4444" strokeWidth="0.8" />
                <circle cx="20" cy="167" r="3" fill="#ef4444" className="animate-pulse" />
                <text x="28" y="170" fill="#f8fafc" fontSize="7" fontWeight="bold">ETA: 3m 42s</text>
              </g>

              {/* VECTOR AMBULANCE (MIDDLE LEFT) */}
              <g transform="translate(210, 275)" className="float-slow" style={{ animationDelay: "0.5s" }}>
                {/* Shadow */}
                <ellipse cx="90" cy="98" rx="80" ry="10" fill="#0f172a" fillOpacity="0.12" />
                
                {/* Wheels */}
                <circle cx="40" cy="85" r="16" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
                <circle cx="40" cy="85" r="6" fill="#e2e8f0" />
                <circle cx="135" cy="85" r="16" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
                <circle cx="135" cy="85" r="6" fill="#e2e8f0" />

                {/* Cabin Body */}
                <path d="M10 75 L15 15 H90 V75 Z" fill="url(#ambGrad)" stroke="#cbd5e1" strokeWidth="1" />
                {/* Main cargo box */}
                <rect x="90" y="5" width="80" height="75" rx="4" fill="url(#ambGrad)" stroke="#cbd5e1" strokeWidth="1" />
                {/* Bumper */}
                <rect x="2" y="70" width="12" height="10" rx="2" fill="#94a3b8" />
                <rect x="165" y="70" width="10" height="10" rx="2" fill="#94a3b8" />

                {/* Front Windshield */}
                <path d="M14 70 L25 22 H48 V70 Z" fill="#1e293b" />
                {/* Side Window */}
                <rect x="54" y="22" width="28" height="24" rx="2" fill="#1e293b" />
                
                {/* Red stripe decoration */}
                <rect x="15" y="52" width="152" height="10" fill="#e53935" />
                
                {/* Medic Cross Circle Logo */}
                <circle cx="125" cy="36" r="15" fill="#ffffff" stroke="#e53935" strokeWidth="1.5" />
                <path d="M125 27 v18 M116 36 h18" stroke="#e53935" strokeWidth="4.5" strokeLinecap="round" />

                {/* Text: AMBULANCE on cargo */}
                <text x="75" y="68" fill="#e53935" fontSize="7" fontWeight="bold" transform="skewX(-8)">AMBULANCE</text>

                {/* Siren lights */}
                <g transform="translate(85, 2)">
                  <rect x="-8" y="-5" width="16" height="5" rx="1.5" fill="#475569" />
                  {/* Left light flasher */}
                  <path d="M-6 -5 h6 v4 h-6 z" className="siren-red-flash" />
                  {/* Right light flasher */}
                  <path d="M0 -5 h6 v4 h-6 z" className="siren-blue-flash" />
                </g>

                {/* Headlights */}
                <ellipse cx="6" cy="62" rx="4" ry="3.5" fill="#fef08a" />
              </g>

              {/* VECTOR RESPONDERS / DOCTORS PANEL (MIDDLE RIGHT FRONT) */}
              <g transform="translate(365, 175)">
                {/* Shadow */}
                <ellipse cx="75" cy="195" rx="65" ry="8" fill="#0f172a" fillOpacity="0.1" />

                {/* 1. DOCTOR (CENTER) */}
                <g transform="translate(45, 0)">
                  {/* Body / Coat */}
                  <path d="M12 90 L2 190 H48 L38 90 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
                  {/* Inner blue scrubs */}
                  <path d="M18 90 L14 115 H36 L32 90 Z" fill="#2563eb" />
                  {/* White collar */}
                  <path d="M12 90 L18 115 L25 90 M38 90 L32 115 L25 90" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                  {/* Stethoscope */}
                  <path d="M17 92 c0 15 16 15 16 0" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M25 107 v15" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
                  <circle cx="25" cy="123" r="3.5" fill="#64748b" />
                  {/* Head */}
                  <circle cx="25" cy="65" r="16" fill="#fed7aa" />
                  {/* Black hair */}
                  <path d="M10 65 C10 50 40 50 40 65 C38 58 12 58 10 65" fill="#1e293b" />
                  {/* Arms crossed */}
                  <path d="M2 115 h46" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" />
                  <path d="M5 115 h40" stroke="#fed7aa" strokeWidth="5" strokeLinecap="round" />
                </g>

                {/* 2. NURSE (LEFT - Blue Scrubs) */}
                <g transform="translate(10, 20)">
                  {/* Body */}
                  <path d="M10 85 L2 170 H38 L30 85 Z" fill="#2563eb" />
                  {/* Collar */}
                  <path d="M16 85 L20 100 L24 85" fill="none" stroke="#eff6ff" strokeWidth="2" />
                  {/* Head */}
                  <circle cx="20" cy="62" r="14" fill="#fcd34d" />
                  {/* Hair */}
                  <path d="M7 60 C7 48 33 48 33 60" fill="#78350f" />
                  {/* Holding clipboard */}
                  <path d="M5 110 L14 125 H26 L35 110" fill="none" stroke="#2563eb" strokeWidth="8" strokeLinecap="round" />
                  {/* Clipboard */}
                  <rect x="12" y="112" width="16" height="22" rx="1.5" fill="#d97706" />
                  <rect x="14" y="117" width="12" height="15" fill="#f8fafc" />
                </g>

                {/* 3. EMS PARAMEDIC (RIGHT - Red Jumpsuit) */}
                <g transform="translate(85, 16)">
                  {/* Body */}
                  <path d="M12 85 L2 174 H48 L38 85 Z" fill="#e53935" />
                  {/* Reflective yellow lines */}
                  <rect x="6" y="110" width="38" height="5" fill="#fef08a" />
                  <rect x="4" y="140" width="42" height="5" fill="#fef08a" />
                  {/* Head */}
                  <circle cx="25" cy="62" r="15" fill="#fed7aa" />
                  {/* Hair */}
                  <path d="M11 60 C11 48 39 48 39 60" fill="#451a03" />
                  {/* Arms holding first aid bag */}
                  <path d="M4 110 l12 25 h20 l12 -25" fill="none" stroke="#e53935" strokeWidth="8" strokeLinecap="round" />
                  {/* Medical Bag */}
                  <rect x="18" y="130" width="22" height="18" rx="2.5" fill="#1e293b" />
                  <circle cx="29" cy="139" r="5" fill="#e53935" />
                  <path d="M29 136 v6 M26 139 h6" stroke="#ffffff" strokeWidth="1.5" />
                </g>
              </g>
            </svg>

            {/* Heartbeat rate wave graphic decorative underneath */}
            <div className="absolute bottom-[-15px] left-[5%] right-[5%] h-8 opacity-[0.06] pointer-events-none select-none">
              <svg className="w-full h-full" viewBox="0 0 400 50" fill="none" stroke="#e53935" strokeWidth="2.5" strokeLinecap="round">
                <path d="M 0 25 L 120 25 L 130 10 L 140 40 L 150 20 L 155 30 L 160 25 L 400 25" />
              </svg>
            </div>

            {/* Floating indicator telemetry pill (bottom left of image context) */}
            <div className={`absolute left-0 bottom-[10%] bg-white/95 backdrop-blur-sm border border-slate-100 shadow-xl rounded-2xl p-3 flex items-center gap-2 z-20 ${shouldReduceMotion ? "" : "float-slow"}`}>
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[11px] font-extrabold text-slate-700">Paramedic En Route</span>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
