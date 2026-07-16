"use client";

import { LucideIcon } from "lucide-react";

interface PortalOptionCardProps {
  id: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  selected: boolean;
  onSelect: () => void;
}

export default function PortalOptionCard({
  id,
  label,
  subtitle,
  icon: Icon,
  selected,
  onSelect,
}: PortalOptionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={[
        "relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-150 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50",
        selected
          ? "border-red-500 bg-red-50 ring-2 ring-red-100"
          : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300",
      ].join(" ")}
    >
      <div
        className={[
          "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center",
          selected ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600",
        ].join(" ")}
      >
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      
      <div className="flex-1 text-left">
        <h3 className="font-semibold text-slate-900">{label}</h3>
        <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
      </div>

      {selected && (
        <div className="absolute top-4 right-4 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </button>
  );
}
