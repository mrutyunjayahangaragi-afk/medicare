"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Heart,
  LayoutDashboard,
  User,
  Siren,
  MapPin,
  Phone,
  Bell,
  Settings,
  ClipboardList,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Bot,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: "Request Emergency",
    href: "/dashboard/emergency",
    icon: <Siren className="w-5 h-5" />,
  },
  {
    label: "My Requests",
    href: "/dashboard/requests",
    icon: <ClipboardList className="w-5 h-5" />,
  },
  {
    label: "Nearby Services",
    href: "/dashboard/nearby",
    icon: <MapPin className="w-5 h-5" />,
  },
  {
    label: "Emergency Contacts",
    href: "/dashboard/contacts",
    icon: <Phone className="w-5 h-5" />,
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: <Bell className="w-5 h-5" />,
  },
  {
    label: "AI Assistant",
    href: "/dashboard/assistant",
    icon: <Bot className="w-5 h-5" />,
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    icon: <User className="w-5 h-5" />,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="w-5 h-5" />,
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}

export default function Sidebar({
  collapsed = false,
  onToggle,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [loggingOut, setLoggingOut] = useState(false);
  const { toast } = useToast();

  /**
   * Determine whether a nav item is active.
   * Strip query params before comparing so that
   * /dashboard/nearby?type=hospital still highlights the item
   * whose href is /dashboard/nearby?type=hospital (exact match)
   * or a prefix match on the pathname portion.
   */
  function isItemActive(item: NavItem): boolean {
    const hrefPath = item.href.split("?")[0];
    const currentPath = pathname.split("?")[0];

    // Exact match (e.g. /dashboard)
    if (hrefPath === currentPath) return true;

    // For /dashboard itself, only match exactly — don't highlight for sub-routes
    if (hrefPath === "/dashboard") return false;

    // Prefix match for deeper routes
    return currentPath.startsWith(hrefPath + "/");
  }

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast("Failed to log out. Please try again.", "error");
      setLoggingOut(false);
      return;
    }
    router.replace("/login");
    router.refresh();
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.25, ease: "easeInOut" }
      }
      className="relative flex flex-col h-full bg-[#0F172A] text-white overflow-hidden flex-shrink-0"
      aria-label="Main navigation"
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10 flex-shrink-0">
        <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 bg-[#E53935] rounded-xl shadow-lg shadow-red-900/40">
          <Heart className="w-4 h-4 text-white fill-white" />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="text-base font-black tracking-tight whitespace-nowrap leading-none">
                Medi<span className="text-red-400">care</span>
              </p>
              <p className="text-[10px] text-slate-500 whitespace-nowrap mt-0.5 leading-none">
                We Care. We Help.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Nav ── */}
      <nav
        className="flex-1 px-2 py-4 overflow-y-auto overflow-x-hidden space-y-0.5"
        aria-label="Sidebar navigation"
      >
        {navItems.map((item) => {
          const active = isItemActive(item);
          return (
            <SidebarItem
              key={item.label}
              item={item}
              isActive={active}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          );
        })}
      </nav>

      {/* ── Logout ── */}
      <div className="px-2 py-4 border-t border-white/10 flex-shrink-0">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label="Log out of Medicare"
          className={[
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]",
            "text-red-400 hover:bg-red-500/10 transition-colors duration-150 cursor-pointer",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          <span className="flex-shrink-0">
            {loggingOut ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5" />
            )}
          </span>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="whitespace-nowrap overflow-hidden"
              >
                {loggingOut ? "Signing out…" : "Logout"}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* ── Collapse toggle (desktop only) ── */}
      <button
        onClick={onToggle}
        className="hidden lg:flex absolute -right-3 top-6 w-6 h-6 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-full items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer z-10"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </motion.aside>
  );
}

// ── SidebarItem sub-component ─────────────────────────────────────────────
function SidebarItem({
  item,
  isActive,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const inner = (
    <span
      className={[
        "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 min-h-[44px]",
        isActive
          ? "bg-[#E53935] text-white shadow-lg shadow-red-900/30"
          : "text-slate-400 hover:bg-white/[0.07] hover:text-white",
      ].join(" ")}
      onMouseEnter={() => collapsed && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="flex-shrink-0">{item.icon}</span>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="whitespace-nowrap overflow-hidden"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Tooltip when collapsed */}
      <AnimatePresence>
        {collapsed && showTooltip && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            role="tooltip"
            className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none z-50"
          >
            {item.label}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
    >
      {inner}
    </Link>
  );
}
