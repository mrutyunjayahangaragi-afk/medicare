"use client";

import { User, HandHeart, Building2 } from "lucide-react";

export type UserRole = "user" | "volunteer" | "hospital";

interface RoleSelectorProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
}

const roles: { id: UserRole; label: string; icon: React.ReactNode }[] = [
  { id: "user",      label: "User",      icon: <User      className="w-4 h-4" /> },
  { id: "volunteer", label: "Volunteer", icon: <HandHeart className="w-4 h-4" /> },
  { id: "hospital",  label: "Hospital",  icon: <Building2 className="w-4 h-4" /> },
];

export default function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-slate-700">
        Register As <span className="text-red-500" aria-hidden="true">*</span>
      </span>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Select your role">
        {roles.map((role) => {
          const active = value === role.id;
          return (
            <button
              key={role.id}
              type="button"
              role="button"
              aria-pressed={active}
              onClick={() => onChange(role.id)}
              className={[
                "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold",
                "transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50",
                active
                  ? "bg-red-500 border-red-500 text-white shadow-md shadow-red-200"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
            >
              {role.icon}
              <span>{role.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
