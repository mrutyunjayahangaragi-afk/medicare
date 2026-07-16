"use client";

import { User, Building2, Ambulance, ShieldCheck } from "lucide-react";
import { type LoginPortal } from "@/types/auth";
import PortalOptionCard from "./PortalOptionCard";

interface PortalSelectorProps {
  value: LoginPortal;
  onChange: (portal: LoginPortal) => void;
}

const portalOptions = [
  {
    id: "user" as LoginPortal,
    label: "User",
    subtitle: "Access emergency services and manage your requests.",
    icon: User,
  },
  {
    id: "hospital" as LoginPortal,
    label: "Hospital",
    subtitle: "Manage incoming emergencies, beds, staff and ambulances.",
    icon: Building2,
  },
  {
    id: "responder" as LoginPortal,
    label: "Responder",
    subtitle: "Accept assignments and manage emergency response.",
    icon: Ambulance,
  },
  {
    id: "admin" as LoginPortal,
    label: "Admin",
    subtitle: "Manage users, hospitals, responders and platform security.",
    icon: ShieldCheck,
  },
];

export default function PortalSelector({ value, onChange }: PortalSelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-slate-700">
        Choose your portal <span className="text-red-500" aria-hidden="true">*</span>
      </legend>
      <div
        role="radiogroup"
        aria-label="Select your portal"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {portalOptions.map((option) => (
          <PortalOptionCard
            key={option.id}
            id={option.id}
            label={option.label}
            subtitle={option.subtitle}
            icon={option.icon}
            selected={value === option.id}
            onSelect={() => onChange(option.id)}
          />
        ))}
      </div>
    </fieldset>
  );
}
