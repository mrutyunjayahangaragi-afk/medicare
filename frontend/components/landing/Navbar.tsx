"use client";

import { useState, useEffect } from "react";
import { Heart, Menu, X, User, UserPlus } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";

const navLinks = [
  { label: "Home", href: "#home", active: true },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "About Us", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeHash, setActiveHash] = useState("#home");
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      
      // Calculate scroll progress
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }

      // Check current active section hash based on scroll position
      const scrollPos = window.scrollY + 200;
      for (const link of navLinks) {
        const el = document.querySelector(link.href);
        if (el instanceof HTMLElement) {
          if (scrollPos >= el.offsetTop && scrollPos < el.offsetTop + el.offsetHeight) {
            setActiveHash(link.href);
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    setActiveHash(href);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Scroll Progress Indicator */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-slate-100 z-50">
        <div
          className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-75"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <motion.header
        initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "bg-white/90 backdrop-blur-md shadow-[0_2px_30px_rgba(0,0,0,0.03)] border-b border-slate-100 py-3"
            : "bg-white/80 backdrop-blur-sm border-b border-transparent py-5"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("#home");
              }}
              className="flex items-center gap-2.5 group cursor-pointer"
              aria-label="Medicare home"
            >
              <div className="relative flex items-center justify-center w-10 h-10 bg-red-500 rounded-xl shadow-lg shadow-red-200 group-hover:bg-red-600 transition-all duration-200 hover:scale-105 active:scale-95">
                <Heart className="w-5.5 h-5.5 text-white fill-white" />
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="text-lg font-black text-slate-900 tracking-tight">
                  Medi<span className="text-red-500">care</span>
                </span>
                <span className="text-[9px] font-bold text-slate-400 mt-0.5">We Care. We Help.</span>
              </div>
            </a>

            {/* Desktop Navigation Links */}
            <ul className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = activeHash === link.href;
                return (
                  <li key={link.href} className="relative">
                    <button
                      onClick={() => handleNavClick(link.href)}
                      suppressHydrationWarning
                      className={`relative px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                        isActive ? "text-red-500" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      {link.label}
                    </button>
                    {isActive && (
                      <motion.span
                        layoutId="activeUnderline"
                        className="absolute bottom-0 left-4 right-4 h-0.5 bg-red-500 rounded-full"
                        transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Desktop CTA buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/login"
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-700 border border-slate-200 rounded-xl hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <User className="w-4 h-4 text-slate-500" />
                Login
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 shadow-md shadow-red-200 hover:shadow-lg hover:shadow-red-300 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <UserPlus className="w-4 h-4" />
                Sign Up
              </Link>
            </div>

            {/* Mobile Hamburger menu */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              suppressHydrationWarning
              className="lg:hidden p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              <AnimatePresence mode="wait">
                {mobileOpen ? (
                  <motion.div
                    key="close"
                    initial={shouldReduceMotion ? {} : { rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={shouldReduceMotion ? {} : { rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={shouldReduceMotion ? {} : { rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={shouldReduceMotion ? {} : { rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </nav>

        {/* Mobile menu drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="lg:hidden overflow-hidden bg-white border-t border-slate-100 shadow-xl"
            >
              <div className="px-4 py-5 flex flex-col gap-1">
                {navLinks.map((link) => {
                  const isActive = activeHash === link.href;
                  return (
                    <button
                      key={link.href}
                      onClick={() => handleNavClick(link.href)}
                      suppressHydrationWarning
                      className={`text-left px-4 py-3 text-sm font-bold rounded-xl transition-all duration-150 cursor-pointer ${
                        isActive ? "text-red-500 bg-red-50/50" : "text-slate-700 hover:text-red-500 hover:bg-slate-50"
                      }`}
                    >
                      {link.label}
                    </button>
                  );
                })}
                <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="w-full px-4 py-3 text-sm font-bold text-slate-700 border border-slate-200 rounded-xl hover:border-slate-300 hover:text-slate-900 transition-all duration-150 flex items-center justify-center gap-2"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="w-full px-4 py-3 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-all duration-150 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Sign Up
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}
