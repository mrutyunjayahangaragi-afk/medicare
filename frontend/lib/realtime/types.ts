/**
 * lib/realtime/types.ts
 * Strict TypeScript event types for all Supabase Realtime payloads.
 *
 * Security rules:
 *   - No tokens, emails, phone numbers, or medical data in payloads.
 *   - UUIDs are used for IDs; never raw user info.
 *   - Broadcast payloads are validated with Zod before use.
 */

// ── Connection state ───────────────────────────────────────────────────

export type RealtimeConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

// ── Emergency request ──────────────────────────────────────────────────

export type EmergencyStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "arrived"
  | "completed"
  | "cancelled";

export interface EmergencyRequestRealtimePayload {
  id: string;
  user_id: string;
  assigned_responder_id: string | null;
  status: EmergencyStatus;
  accepted_at: string | null;
  in_progress_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
}

// ── Notifications ──────────────────────────────────────────────────────

export interface NotificationRealtimePayload {
  id: string;
  recipient_id: string;
  request_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ── Messages ───────────────────────────────────────────────────────────

export interface MessageRealtimePayload {
  id: string;
  request_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

// ── Responder location (Broadcast payload) ─────────────────────────────
// Transmitted on private Broadcast channel: request:{requestId}:location
// Does NOT include responder email, patient details, or access tokens.

export interface ResponderLocationBroadcast {
  requestId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  capturedAt: string; // ISO 8601
}

// ── Presence ───────────────────────────────────────────────────────────
// Used on: request:{requestId}:presence
// Indicates whether the other participant is currently viewing.
// Do NOT use this for operational availability status.

export interface RequestPresencePayload {
  userId: string;
  role: "user" | "responder";
  onlineAt: string; // ISO 8601
}

// ── Channel event names ────────────────────────────────────────────────

export const BROADCAST_EVENTS = {
  LOCATION_UPDATE: "location_update",
} as const;

export type BroadcastEventName =
  (typeof BROADCAST_EVENTS)[keyof typeof BROADCAST_EVENTS];

// ── Subscription status → connection state mapping ────────────────────

export type SupabaseSubscriptionStatus =
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | "CLOSED"
  | "CHANNEL_ERROR";
