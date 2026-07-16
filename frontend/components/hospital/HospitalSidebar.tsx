"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Activity,
  Users,
  Truck,
  BedDouble,
  Building2,
  History,
  Settings,
  Plus,
} from "lucide-react";

interface HospitalSidebarProps {
  userName: string;
  hasProfile: boolean;
}

export default function HospitalSidebar({
  userName,
  hasProfile,
}: HospitalSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/hospital",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/hospital/requests",
      label: "Requests",
      icon: Activity,
    },
    {
      href: "/hospital/staff",
      label: "Staff",
      icon: Users,
    },
    {
      href: "/hospital/ambulances",
      label: "Ambulances",
      icon: Truck,
    },
    {
      href: "/hospital/beds",
      label: "Beds",
      icon: BedDouble,
    },
    {
      href: "/hospital/profile",
      label: "Hospital Profile",
      icon: Building2,
      highlight: !hasProfile,
    },
    {
      href: "/hospital/history",
      label: "History",
      icon: History,
    },
    {
      href: "/hospital/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold">Medicare</h1>
        <p className="text-slate-400 text-sm mt-1">Hospital Portal</p>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-slate-800">
        <p className="text-sm text-slate-400">Welcome,</p>
        <p className="font-medium truncate">{userName}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {item.highlight && <Plus className="w-4 h-4 text-blue-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <span>Switch to User View</span>
        </Link>
      </div>
    </div>
  );
}
