import type { EmergencyStatus, EmergencyType, SeverityLevel } from "./database";

export type { EmergencyStatus, EmergencyType, SeverityLevel };

export interface EmergencyRequest {
  id: string;
  user_id: string;
  emergency_type: EmergencyType;
  severity: SeverityLevel;
  description: string;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  manual_address: string | null;
  contact_number: string;
  evidence_path: string | null;
  status: EmergencyStatus;
  assigned_responder_id: string | null;
  assigned_at: string | null;
  accepted_at: string | null;
  in_progress_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Geolocation state machine */
export type LocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "captured"; latitude: number; longitude: number; accuracy: number; address: string }
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "timeout" }
  | { status: "unsupported" };

/** Values held by the emergency request form */
export interface EmergencyFormValues {
  emergency_type: EmergencyType | null;
  severity: SeverityLevel | null;
  description: string;
  contact_number: string;
  location: LocationState;
  manual_address: string;
  evidence_path: string | null;
  confirmed: boolean;
}

export const EMERGENCY_TYPES: {
  id: EmergencyType;
  label: string;
  emoji: string;
}[] = [
  { id: "medical",       label: "Medical",       emoji: "❤️"  },
  { id: "accident",      label: "Accident",      emoji: "🚗"  },
  { id: "fire",          label: "Fire",          emoji: "🔥"  },
  { id: "crime",         label: "Crime",         emoji: "🚓"  },
  { id: "flood",         label: "Flood",         emoji: "🌊"  },
  { id: "electric",      label: "Electric",      emoji: "⚡"  },
  { id: "child_safety",  label: "Child Safety",  emoji: "🧒"  },
  { id: "elder_care",    label: "Elder Care",    emoji: "👴"  },
  { id: "animal_attack", label: "Animal Attack", emoji: "🐍"  },
  { id: "other",         label: "Other",         emoji: "❓"  },
];

export const SEVERITY_LEVELS: {
  id: SeverityLevel;
  label: string;
  dot: string;
  active: string;
  inactive: string;
}[] = [
  { id: "low",      label: "Low",      dot: "bg-green-500",  active: "border-green-500 bg-green-50  text-green-700",  inactive: "border-slate-200 text-slate-500" },
  { id: "medium",   label: "Medium",   dot: "bg-yellow-400", active: "border-yellow-400 bg-yellow-50 text-yellow-700", inactive: "border-slate-200 text-slate-500" },
  { id: "high",     label: "High",     dot: "bg-orange-500", active: "border-orange-500 bg-orange-50 text-orange-700", inactive: "border-slate-200 text-slate-500" },
  { id: "critical", label: "Critical", dot: "bg-red-500",    active: "border-red-500   bg-red-50    text-red-700",    inactive: "border-slate-200 text-slate-500" },
];

export const STATUS_CONFIG: Record<EmergencyStatus, { label: string; color: string; bg: string }> = {
  pending:            { label: "Pending",            color: "text-orange-700", bg: "bg-orange-100" },
  accepted:           { label: "Accepted",           color: "text-blue-700",   bg: "bg-blue-100"   },
  in_progress:        { label: "In Progress",        color: "text-indigo-700", bg: "bg-indigo-100" },
  arrived:            { label: "Arrived",            color: "text-purple-700", bg: "bg-purple-100" },
  volunteer_assigned: { label: "Volunteer Assigned", color: "text-purple-700", bg: "bg-purple-100" },
  hospital_assigned:  { label: "Hospital Assigned",  color: "text-teal-700",   bg: "bg-teal-100"   },
  completed:          { label: "Completed",          color: "text-green-700",  bg: "bg-green-100"  },
  cancelled:          { label: "Cancelled",          color: "text-red-700",    bg: "bg-red-100"    },
};
