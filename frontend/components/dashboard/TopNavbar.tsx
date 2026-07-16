"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Siren, Menu, Search, User, Settings, LogOut, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import NotificationBell from "@/components/notifications/NotificationBell";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";

interface TopNavbarProps {
  user?: {
    email?: string;
    fullName?: string;
    avatarUrl?: string | null;
  };
  profile?: {
    email?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  onMenuClick?: () => void;
}

export default function TopNavbar({ user, profile, onMenuClick }: TopNavbarProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleSOS = () => {
    router.push("/dashboard/emergency");
  };

  const handleNotifications = () => {
    router.push("/dashboard/notifications");
  };

  const name = user?.fullName || profile?.full_name || "User";
  const email = user?.email || profile?.email || "";
  const avatarUrl = user?.avatarUrl || profile?.avatar_url || null;
  const firstName = name.split(" ")[0];
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-slate-100 shadow-sm flex-shrink-0 min-h-[64px]">
      {/* Left: Mobile menu trigger + Logo/Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick ?? (() => window.dispatchEvent(new CustomEvent("medicare:sidebar", { detail: "open-sidebar" })))}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer flex-shrink-0 focus-visible:outline-2 focus-visible:outline-blue-500"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black text-slate-900 leading-tight truncate">
          Dashboard
        </h1>
      </div>

      {/* Middle: Controlled Search (Desktop) */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-8 relative">
        <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search requests, contacts, hospitals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all focus-visible:outline-2 focus-visible:outline-blue-500"
          aria-label="Search"
        />
      </div>

      {/* Right: Actions (Notification, SOS, Avatar/Dropdown) */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* SOS button */}
        <button
          onClick={handleSOS}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl shadow-md shadow-red-200 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-red-600 min-h-[38px]"
          aria-label="Emergency SOS"
        >
          <Siren className="w-4 h-4" />
          <span className="hidden sm:inline">SOS</span>
        </button>

        {/* Notification bell */}
        <div className="relative">
          <NotificationBell onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)} />
          <NotificationDropdown
            isOpen={notificationDropdownOpen}
            onClose={() => setNotificationDropdownOpen(false)}
            userRole="user"
          />
        </div>

        <div className="h-6 w-px bg-slate-200" />

        {/* User profile with dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-500 text-left min-h-[38px]"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            aria-label="User profile menu"
          >
            <div className="w-8 h-8 rounded-xl overflow-hidden border-2 border-slate-100 flex-shrink-0 bg-slate-100 relative">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={name}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-xs font-black select-none">
                  {initials}
                </div>
              )}
            </div>
            <span className="hidden sm:inline text-xs font-bold text-slate-700 max-w-[100px] truncate">
              {firstName}
            </span>
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-lg py-2 z-50 origin-top-right focus:outline-none"
                role="menu"
                aria-orientation="vertical"
              >
                <div className="px-4 py-2 border-b border-slate-50">
                  <p className="text-xs font-bold text-slate-800 truncate">{name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{email}</p>
                </div>

                <Link
                  href="/dashboard/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  role="menuitem"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  Profile
                </Link>

                <Link
                  href="/dashboard/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  role="menuitem"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Settings
                </Link>

                <div className="h-px bg-slate-50 my-1" />

                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50/50 transition-colors cursor-pointer disabled:opacity-50"
                  role="menuitem"
                >
                  {loggingOut ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
