export type UserRole = "user" | "volunteer" | "hospital" | "hospital_staff" | "responder" | "admin";

export type AvailabilityStatus = "available" | "busy" | "offline";

export type ResponderType = "ambulance" | "paramedic" | "doctor" | "nurse" | "police" | "fire" | "volunteer" | "other";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  hospital_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  availability_status: AvailabilityStatus;
  responder_type: ResponderType | null;
  created_at: string;
  updated_at: string;
}

export type ProfileInsert = Omit<Profile, "created_at" | "updated_at">;

export type ProfileUpdate = Partial<
  Pick<Profile, "full_name" | "email" | "phone" | "role" | "hospital_name" | "is_verified" | "availability_status" | "responder_type">
>;

/** Pending registration data stored temporarily while awaiting OTP */
export interface PendingRegistration {
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  hospitalName: string | null;
}

// Multi-role authentication types
export type TrustedRole = "user" | "responder" | "volunteer" | "hospital_staff" | "admin";

export type LoginPortal = "user" | "hospital" | "responder" | "admin";

export type RegistrationType = "user" | "hospital" | "responder";

export type ApplicationStatus = "pending" | "approved" | "rejected" | "suspended";

export type ApplicationType = "hospital" | "responder";

export interface PortalApplication {
  id: string;
  user_id: string;
  application_type: ApplicationType;
  organization_name: string | null;
  phone: string | null;
  address: string | null;
  license_or_registration_number: string | null;
  supporting_document_path: string | null;
  status: ApplicationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleResolutionResult {
  trustedRole: TrustedRole | null;
  authorizedPortal: string | null;
  organizationId: string | null;
  applicationStatus: ApplicationStatus | null;
  applicationType: ApplicationType | null;
}
