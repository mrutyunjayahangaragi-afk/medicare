"use client";

import { Heart, Mail, Phone, MapPin, ArrowUp, ShieldCheck } from "lucide-react";

export default function Footer() {
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNavClick = (href: string) => {
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Logo & Description */}
          <div className="flex flex-col gap-5">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("#home");
              }}
              className="flex items-center gap-2 group cursor-pointer self-start"
            >
              <div className="flex items-center justify-center w-9 h-9 bg-red-500 rounded-xl shadow-md transition-colors group-hover:bg-red-600">
                <Heart className="w-5.5 h-5.5 text-white fill-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                ❤️ <span className="font-extrabold">Medi<span className="text-red-500">care</span></span>
              </span>
            </a>
            <p className="text-sm text-slate-400 leading-relaxed max-w-[280px]">
              Medicare coordinates paramedical dispatch, geolocated telemetries, and emergency responses to save lives when seconds matter.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3">
              {/* Twitter SVG */}
              <a
                href="#twitter"
                onClick={(e) => e.preventDefault()}
                className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Twitter link"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              {/* LinkedIn SVG */}
              <a
                href="#linkedin"
                onClick={(e) => e.preventDefault()}
                className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="https://www.linkedin.com/in/mrutyunjaya-hangaragi/"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              {/* Facebook SVG */}
              <a
                href="#facebook"
                onClick={(e) => e.preventDefault()}
                className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="https://www.facebook.com/share/1RXksgu4ds/"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
              Quick Links
            </h3>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: "Home", href: "#home" },
                { label: "Features", href: "#features" },
                { label: "How It Works", href: "#how-it-works" },
                { label: "About Us", href: "#about" },
                { label: "Contact Us", href: "#contact" },
              ].map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => handleNavClick(link.href)}
                    suppressHydrationWarning
                    className="text-sm text-slate-400 hover:text-white transition-colors cursor-pointer text-left font-semibold"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Policy & SLA */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
              Policies & Compliance
            </h3>
            <ul className="flex flex-col gap-2.5">
              {["Privacy Policy", "Terms of Service", "HIPAA Compliance", "SLA Targets"].map(
                (item) => (
                  <li key={item}>
                    <span className="text-sm text-slate-400 hover:text-white cursor-pointer transition-colors font-semibold">
                      {item}
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Emergency Contacts / Phone */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-red-500" />
              Emergency Contacts
            </h3>
            <ul className="flex flex-col gap-3">
              <li className="flex items-center gap-2.5 text-sm font-semibold text-slate-300">
                <Phone className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>+91 9036745164 (Mrutyunjaya)</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm font-semibold text-slate-300">
                <Mail className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>emergency-mrutyunjayahangaragi70@gmail.com</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm font-semibold text-slate-300">
                <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>Bengaluru,Bagalkot Karnataka</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-900 my-10" />

        {/* Copyright & Scroll to Top */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-xs text-slate-500 font-semibold">
            © {new Date().getFullYear()} Medicare Inc. All rights reserved.
          </p>
          <button
            onClick={handleScrollToTop}
            suppressHydrationWarning
            className="flex items-center justify-center w-10 h-10 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-xl shadow-md transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
          </button>
        </div>
      </div>
    </footer>
  );
}
