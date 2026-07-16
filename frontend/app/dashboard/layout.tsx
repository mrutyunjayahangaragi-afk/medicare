"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileNav from "@/components/dashboard/MobileNav";
import { UserRealtimeProvider } from "@/components/realtime/UserRealtimeProvider";
import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Escape key closes the mobile drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [closeMobile]);

  // Prevent background scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  if (!userId) {
    return (
      <div className="flex h-screen bg-[#F8FAFC] items-center justify-center">
        <div className="animate-pulse text-slate-400 font-semibold">Loading live session...</div>
      </div>
    );
  }

  return (
    <UserRealtimeProvider userId={userId}>
      <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col h-full flex-shrink-0">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>

      {/* Mobile drawer backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={closeMobile}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="lg:hidden fixed inset-y-0 left-0 z-50 flex flex-col"
          >
            <Sidebar collapsed={false} onToggle={closeMobile} onNavigate={closeMobile} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Pass onMenuClick down through children via a wrapper that includes TopNavbar */}
        <MobileMenuButton onOpen={() => setMobileOpen(true)} />
        {children}
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
    </UserRealtimeProvider>
  );
}

/**
 * Invisible slot that injects the onMenuClick handler.
 * TopNavbar is rendered inside each page (server component), so we use
 * a CSS trick: the mobile menu button in TopNavbar fires onMenuClick via
 * a custom event, and this component listens for it.
 */
function MobileMenuButton({ onOpen }: { onOpen: () => void }) {
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === "open-sidebar") onOpen();
    };
    window.addEventListener("medicare:sidebar", handler);
    return () => window.removeEventListener("medicare:sidebar", handler);
  }, [onOpen]);
  return null;
}
