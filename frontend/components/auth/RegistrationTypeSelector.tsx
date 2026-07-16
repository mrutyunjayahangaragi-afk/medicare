"use client";

import { User, Building2, Ambulance } from "lucide-react";
import { type RegistrationType } from "@/types/auth";
import PortalOptionCard from "./PortalOptionCard";

interface RegistrationTypeSelectorProps {
  value: RegistrationType;
  onChange: (type: RegistrationType) => void;
}

const registrationOptions = [
  {
    id: "user" as RegistrationType,
    label: "User",
    subtitle: "Access emergency services and manage your requests.",
    icon: User,
  },
  {
    id: "hospital" as RegistrationType,
    label: "Hospital",
    subtitle: "Manage incoming emergencies, beds, staff and ambulances.",
    icon: Building2,
  },
  {
    id: "responder" as RegistrationType,
    label: "Responder",
    subtitle: "Accept assignments and manage emergency response.",
    icon: Ambulance,
  },
];

export default function RegistrationTypeSelector({ value, onChange }: RegistrationTypeSelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-slate-700">
        Choose how you want to use Medicare <span className="text-red-500" aria-hidden="true">*</span>
      </legend>
      <div
        role="radiogroup"
        aria-label="Select your account type"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {registrationOptions.map((option) => (
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
