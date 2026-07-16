"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Siren, ClipboardList, MapPin, User, Bot } from "lucide-react";

const mobileItems = [
  { label: "Home",     href: "/dashboard",           icon: LayoutDashboard },
  { label: "SOS",      href: "/dashboard/emergency",  icon: Siren           },
  { label: "AI Help",  href: "/dashboard/assistant",  icon: Bot             },
  { label: "Requests", href: "/dashboard/requests",   icon: ClipboardList   },
  { label: "Nearby",   href: "/dashboard/nearby",     icon: MapPin          },
  { label: "Profile",  href: "/dashboard/profile",    icon: User            },
] as const;

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 shadow-2xl"
      aria-label="Mobile navigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-6 h-16">
        {mobileItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const isSOS = item.label === "SOS";

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px]",
                isSOS
                  ? "text-red-600"
                  : isActive
                  ? "text-[#E53935]"
                  : "text-slate-400 hover:text-slate-600",
              ].join(" ")}
            >
              {/* SOS gets a special elevated pill */}
              {isSOS ? (
                <span className="flex flex-col items-center gap-1">
                  <span
                    className={[
                      "w-9 h-9 rounded-full flex items-center justify-center shadow-sm",
                      isActive
                        ? "bg-red-600 text-white"
                        : "bg-red-50 border border-red-200 text-red-600",
                    ].join(" ")}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <span className="text-[10px] font-bold text-red-600">{item.label}</span>
                </span>
              ) : (
                <>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
