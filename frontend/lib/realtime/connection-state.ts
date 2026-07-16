/**
 * lib/realtime/connection-state.ts
 * Utilities for mapping Supabase subscription status strings to
 * application-level connection state and user-friendly labels.
 */

import type {
  RealtimeConnectionState,
  SupabaseSubscriptionStatus,
} from "./types";

/**
 * Map a Supabase subscription status string to our application state enum.
 */
export function subscriptionStatusToConnectionState(
  status: SupabaseSubscriptionStatus | string
): RealtimeConnectionState {
  switch (status) {
    case "SUBSCRIBED":
      return "connected";
    case "CHANNEL_ERROR":
      return "error";
    case "TIMED_OUT":
      return "reconnecting";
    case "CLOSED":
      return "disconnected";
    default:
      return "connecting";
  }
}

/**
 * Return a user-friendly label for the current connection state.
 * Never exposes technical socket details.
 */
export function connectionStatusLabel(state: RealtimeConnectionState): string {
  switch (state) {
    case "idle":
      return "Idle";
    case "connecting":
      return "Connecting…";
    case "connected":
      return "Live";
    case "reconnecting":
      return "Reconnecting…";
    case "disconnected":
      return "Offline";
    case "error":
      return "Connection error";
    default:
      return "Unknown";
  }
}

/**
 * Returns true when the state indicates the subscription is active
 * and delivering events.
 */
export function isConnected(state: RealtimeConnectionState): boolean {
  return state === "connected";
}

/**
 * Returns true when a reconnect is in progress and state-recovery
 * operations (e.g. data refetch) should be scheduled.
 */
export function isRecovering(state: RealtimeConnectionState): boolean {
  return state === "reconnecting" || state === "connecting";
}

/**
 * Bounded exponential back-off delay for application-level retry.
 *
 * @param attempt  0-based attempt number.
 * @param base     Base delay in milliseconds (default 1 000).
 * @param max      Maximum delay in milliseconds (default 30 000).
 */
export function backoffDelay(
  attempt: number,
  base = 1_000,
  max = 30_000
): number {
  const delay = base * Math.pow(2, attempt);
  return Math.min(delay, max);
}
