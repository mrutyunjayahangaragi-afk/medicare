"use client";

import { useState, useRef } from "react";
import { motion, useInView, useReducedMotion, AnimatePresence } from "framer-motion";
import { Mail, Phone, MapPin, Send, ShieldAlert, Sparkles } from "lucide-react";

export default function Contact() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();

  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.35, ease: "easeOut" as const };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setToastMsg("Contact backend will be added later.");
    setTimeout(() => setToastMsg(null), 3500);
    setFormData({ name: "", email: "", phone: "", message: "" });
  };

  return (
    <section
      id="contact"
      ref={ref}
      className="py-20 lg:py-28 bg-slate-50 relative overflow-hidden border-t border-slate-100"
    >
      {/* Alert toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -60, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -60, x: "-50%" }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25, ease: "easeOut" }}
            className="fixed top-6 left-1/2 z-[200] bg-slate-900 border border-slate-800 text-white text-sm px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm w-[90vw] text-center"
          >
            <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 animate-pulse" />
            <span className="font-semibold text-slate-200">{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={transition}
          className="text-center mb-16 lg:mb-20"
        >
          <span className="inline-block text-xs font-bold text-red-600 uppercase tracking-widest bg-red-50 border border-red-100 px-4 py-1.5 rounded-full mb-4">
            Connect
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Get In <span className="red-gradient-text">Touch</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Have questions about integrations, corporate health plans, or responder sign-ups? Send us a message.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Info cards (Left) */}
          <motion.div
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={transition}
            className="lg:col-span-5 flex flex-col gap-6"
          >
            {[
              {
                icon: Mail,
                title: "Email Support",
                value: "mrutyunjayahangaragi70@gmail.com",
                sub: "Checked 24/7 by coordinators.",
              },
              {
                icon: Phone,
                title: "Corporate Hotline",
                value: "+91 9036745164",
                sub: "Available Mon-Fri, 9am-5pm IST.",
              },
              {
                icon: MapPin,
                title: "Office Headquarters",
                value: "Bengaluru, Bagalkot Karnataka",
                sub: "India",
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex items-start gap-4 transition-all duration-200 hover:shadow-md"
                >
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-0.5">{item.title}</h3>
                    <p className="text-sm text-slate-600 font-semibold select-all mb-0.5">{item.value}</p>
                    <p className="text-[11px] text-slate-400">{item.sub}</p>
                  </div>
                </div>
              );
            })}

            {/* AI Assistant quick help box */}
            <div className="bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-100/50 rounded-3xl p-6 flex gap-4">
              <Sparkles className="w-5.5 h-5.5 text-violet-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-extrabold text-violet-950 mb-1">Looking for emergency guidance?</h4>
                <p className="text-xs text-violet-900/80 leading-relaxed">
                  For immediate instructions regarding trauma, CPR, or choking, request help from the main screen to launch direct AI-triage assistants.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Form Card (Right) */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={transition}
            className="lg:col-span-7 bg-white border border-slate-100 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.03)]"
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-name" className="text-xs font-bold text-slate-700">
                    Name
                  </label>
                  <input
                    type="text"
                    id="contact-name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    suppressHydrationWarning
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-red-400 focus:bg-white transition-all text-slate-800 font-semibold"
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-email" className="text-xs font-bold text-slate-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="contact-email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    suppressHydrationWarning
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-red-400 focus:bg-white transition-all text-slate-800 font-semibold"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-phone" className="text-xs font-bold text-slate-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="contact-phone"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  suppressHydrationWarning
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-red-400 focus:bg-white transition-all text-slate-800 font-semibold"
                />
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-message" className="text-xs font-bold text-slate-700">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How can our emergency coordination team support you?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-red-400 focus:bg-white transition-all text-slate-800 resize-none font-semibold"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                suppressHydrationWarning
                className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-2xl shadow-md hover:shadow-lg hover:shadow-red-100 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Send Message
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
