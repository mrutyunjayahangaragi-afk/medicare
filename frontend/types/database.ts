/**
 * types/database.ts
 * Medicare — Supabase PostgreSQL type definitions.
 *
 * Manually maintained to match the current database schema.
 * After applying migrations, regenerate with:
 *   npx supabase gen types typescript --project-id qcwhylpizgilgfsjexxa --schema public > types/database.ts
 *
 * Step 13 changes:
 *   - notifications: added user_id and data aliases; added updated_at
 *   - request_messages: added updated_at
 *   - user_settings: added use_high_accuracy_location, remember_manual_address
 *   - emergency_requests: added arrived_at
 *   - Added OrganizationRow, OrganizationMemberRow, AuditLogRow,
 *     AccountDeletionRequestRow types
 */

export type UserRole =
  | "user"
  | "responder"
  | "volunteer"
  | "hospital_staff"
  | "hospital"
  | "admin";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EmergencyStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "arrived"
  | "volunteer_assigned"  // legacy
  | "hospital_assigned"   // legacy
  | "completed"
  | "cancelled";

export type EmergencyType =
  | "medical"
  | "accident"
  | "fire"
  | "crime"
  | "flood"
  | "electric"
  | "child_safety"
  | "elder_care"
  | "animal_attack"
  | "other";

export type SeverityLevel = "low" | "medium" | "high" | "critical";

export type BloodGroup =
  | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "Unknown";
export type Gender =
  | "male" | "female" | "other" | "prefer_not_to_say";

export type OrganizationType =
  | "hospital"
  | "ambulance_service"
  | "volunteer_group"
  | "clinic"
  | "government"
  | "other";

export type MemberRole  = "owner" | "manager" | "responder" | "staff" | "volunteer";
export type MemberStatus = "pending" | "approved" | "suspended" | "rejected";

// ─── Convenience named exports ──────────────────────────────────────────────

export interface EmergencyContact {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  alternate_phone: string | null;
  email: string | null;
  relationship: string | null;
  is_primary: boolean;
  notify_during_emergency: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  share_medical_details: boolean;
  share_phone_with_responder: boolean;
  allow_location_sharing: boolean;
  notify_emergency_contacts: boolean;
  use_high_accuracy_location: boolean;
  remember_manual_address: boolean;
  theme: string;
  updated_at: string;
}

export interface OrganizationRow {
  id: string;
  name: string;
  organization_type: OrganizationType;
  phone: string | null;
  email: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMemberRow {
  id: string;
  organization_id: string;
  user_id: string;
  member_role: MemberRole;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Json | null;
  new_data: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AccountDeletionRequestRow {
  id: string;
  user_id: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "completed";
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
}

// ─── Full typed Database interface ──────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          role: UserRole;
          hospital_name: string | null;
          avatar_url: string | null;
          is_verified: boolean;
          availability_status: string;
          responder_type: string | null;
          organization_id: string | null;
          date_of_birth: string | null;
          gender: Gender | null;
          address: string | null;
          blood_group: BloodGroup | null;
          allergies: string | null;
          medical_conditions: string | null;
          current_medications: string | null;
          medical_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          role?: UserRole;
          hospital_name?: string | null;
          avatar_url?: string | null;
          is_verified?: boolean;
          availability_status?: string;
          responder_type?: string | null;
          organization_id?: string | null;
          date_of_birth?: string | null;
          gender?: Gender | null;
          address?: string | null;
          blood_group?: BloodGroup | null;
          allergies?: string | null;
          medical_conditions?: string | null;
          current_medications?: string | null;
          medical_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          role?: UserRole;
          hospital_name?: string | null;
          avatar_url?: string | null;
          is_verified?: boolean;
          availability_status?: string;
          responder_type?: string | null;
          organization_id?: string | null;
          date_of_birth?: string | null;
          gender?: Gender | null;
          address?: string | null;
          blood_group?: BloodGroup | null;
          allergies?: string | null;
          medical_conditions?: string | null;
          current_medications?: string | null;
          medical_notes?: string | null;
          updated_at?: string;
        };
      };

      emergency_requests: {
        Row: {
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
          /** legacy column — kept for existing dashboard queries */
          address?: string | null;
          assigned_responder_id: string | null;
          assigned_at: string | null;
          accepted_at: string | null;
          in_progress_at: string | null;
          arrived_at: string | null;
          completed_at: string | null;
          cancelled_at: string | null;
          status: EmergencyStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          emergency_type: EmergencyType;
          severity: SeverityLevel;
          description: string;
          latitude?: number | null;
          longitude?: number | null;
          location_accuracy?: number | null;
          manual_address?: string | null;
          contact_number: string;
          evidence_path?: string | null;
          address?: string | null;
          assigned_responder_id?: string | null;
          status?: EmergencyStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          emergency_type?: EmergencyType;
          severity?: SeverityLevel;
          description?: string;
          latitude?: number | null;
          longitude?: number | null;
          location_accuracy?: number | null;
          manual_address?: string | null;
          contact_number?: string;
          evidence_path?: string | null;
          address?: string | null;
          assigned_responder_id?: string | null;
          arrived_at?: string | null;
          status?: EmergencyStatus;
          updated_at?: string;
        };
      };

      emergency_contacts: {
        Row: EmergencyContact;
        Insert: Omit<EmergencyContact, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<EmergencyContact, "id" | "user_id">>;
      };

      notifications: {
        Row: {
          id: string;
          /** Canonical column name */
          recipient_id: string;
          /** Alias for recipient_id — kept for frontend compatibility */
          user_id: string;
          title: string;
          message: string;
          type: string;
          is_read: boolean;
          read_at: string | null;
          request_id: string | null;
          actor_id: string | null;
          /** Canonical jsonb column */
          metadata: Json;
          /** Alias for metadata — kept for frontend compatibility */
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          user_id?: string;
          title: string;
          message: string;
          type?: string;
          is_read?: boolean;
          read_at?: string | null;
          request_id?: string | null;
          actor_id?: string | null;
          metadata?: Json;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          is_read?: boolean;
          read_at?: string | null;
          request_id?: string | null;
          actor_id?: string | null;
          metadata?: Json;
          data?: Json;
          updated_at?: string;
        };
      };

      request_messages: {
        Row: {
          id: string;
          request_id: string;
          sender_id: string;
          recipient_id: string;
          message: string;
          message_type: string;
          attachment_path: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
          edited_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          sender_id: string;
          recipient_id: string;
          message: string;
          message_type?: string;
          attachment_path?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
          edited_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          sender_id?: string;
          recipient_id?: string;
          message?: string;
          message_type?: string;
          attachment_path?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          edited_at?: string | null;
          updated_at?: string;
        };
      };

      responder_locations: {
        Row: {
          id: string;
          responder_id: string;
          request_id: string;
          latitude: number;
          longitude: number;
          heading: number | null;
          speed: number | null;
          accuracy: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          responder_id: string;
          request_id: string;
          latitude: number;
          longitude: number;
          heading?: number | null;
          speed?: number | null;
          accuracy?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          responder_id?: string;
          request_id?: string;
          latitude?: number;
          longitude?: number;
          heading?: number | null;
          speed?: number | null;
          accuracy?: number | null;
          updated_at?: string;
        };
      };

      user_settings: {
        Row: UserSettings;
        Insert: Partial<UserSettings> & { user_id: string };
        Update: Partial<Omit<UserSettings, "user_id">>;
      };

      notification_preferences: {
        Row: {
          user_id: string;
          emergency_updates: boolean;
          responder_arrival: boolean;
          new_messages: boolean;
          request_completion: boolean;
          browser_notifications: boolean;
          sound_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          emergency_updates?: boolean;
          responder_arrival?: boolean;
          new_messages?: boolean;
          request_completion?: boolean;
          browser_notifications?: boolean;
          sound_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          emergency_updates?: boolean;
          responder_arrival?: boolean;
          new_messages?: boolean;
          request_completion?: boolean;
          browser_notifications?: boolean;
          sound_enabled?: boolean;
          updated_at?: string;
        };
      };

      organizations: {
        Row: OrganizationRow;
        Insert: Omit<OrganizationRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<OrganizationRow, "id">>;
      };

      organization_members: {
        Row: OrganizationMemberRow;
        Insert: Omit<OrganizationMemberRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<OrganizationMemberRow, "id" | "organization_id" | "user_id">>;
      };

      audit_logs: {
        Row: AuditLogRow;
        Insert: Omit<AuditLogRow, "id" | "created_at"> & { created_at?: string };
        Update: never; // Audit logs are immutable
      };

      account_deletion_requests: {
        Row: AccountDeletionRequestRow;
        Insert: Omit<AccountDeletionRequestRow, "id" | "requested_at"> & {
          id?: string;
          requested_at?: string;
        };
        Update: Partial<Pick<AccountDeletionRequestRow, "status" | "processed_at" | "processed_by">>;
      };
    };

    Enums: {
      user_role: UserRole;
      emergency_type_enum: EmergencyType;
      severity_level_enum: SeverityLevel;
      emergency_status_enum: EmergencyStatus;
    };
  };
}

export interface SeverityPredictionRequest {
  emergency_type: EmergencyType;
  description: string;
  age_group?: "child" | "adult" | "senior" | "unknown";
  conscious?: boolean | null;
  breathing_difficulty?: boolean | null;
  severe_breathing_difficulty?: boolean | null;
  bleeding_level?: "none" | "minor" | "moderate" | "severe" | null;
  chest_pain?: boolean | null;
  seizure?: boolean | null;
  stroke_signs?: boolean | null;
  burn_level?: "none" | "minor" | "moderate" | "severe" | null;
  allergic_reaction?: boolean | null;
  pregnancy_emergency?: boolean | null;
  major_accident?: boolean | null;
  violence_risk?: boolean | null;
}

export interface SeverityPredictionResponse {
  predicted_severity: SeverityLevel;
  raw_model_severity: SeverityLevel;
  confidence: number | null;
  model_version: string;
  important_factors: string[];
  safety_override_applied: boolean;
  safety_override_reason: string | null;
  low_confidence: boolean;
  disclaimer: string;
}

