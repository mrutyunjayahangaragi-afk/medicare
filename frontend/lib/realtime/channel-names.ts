/**
 * lib/realtime/channel-names.ts
 * Pure functions that generate consistent, safe channel topic strings.
 *
 * Security rules:
 *   - Only UUIDs appear in channel names.
 *   - No emails, phone numbers, names, coordinates, or medical data.
 *   - All functions validate that the input is a non-empty string.
 *   - Channel names are stable across frontend, DB triggers, and docs.
 *
 * Convention: {prefix}:{uuid}[:{suffix}]
 */

/** Assert a string is non-empty; throws in development. */
function assertNonEmpty(value: string, label: string): void {
  if (!value || typeof value !== "string" || value.trim() === "") {
    throw new Error(`[channel-names] ${label} must be a non-empty string`);
  }
}

/**
 * request:{requestId}
 * Base channel for a specific emergency request.
 */
export function requestChannelName(requestId: string): string {
  assertNonEmpty(requestId, "requestId");
  return `request:${requestId}`;
}

/**
 * request:{requestId}:status
 * Postgres Changes subscription for request status/assignment updates.
 * Used internally by useRequestRealtime hook.
 */
export function requestStatusChannelName(requestId: string): string {
  assertNonEmpty(requestId, "requestId");
  return `request:${requestId}:status`;
}

/**
 * request:{requestId}:location
 * Private Broadcast channel for high-frequency responder GPS updates.
 * Authorized by realtime.messages RLS policy (owner OR assigned responder).
 */
export function requestLocationChannelName(requestId: string): string {
  assertNonEmpty(requestId, "requestId");
  return `request:${requestId}:location`;
}

/**
 * request:{requestId}:messages
 * Postgres Changes subscription for conversation messages.
 */
export function requestMessagesChannelName(requestId: string): string {
  assertNonEmpty(requestId, "requestId");
  return `request:${requestId}:messages`;
}

/**
 * request:{requestId}:presence
 * Private Presence channel indicating whether both participants are viewing.
 * Authorized by realtime.messages RLS policy (owner OR assigned responder).
 */
export function requestPresenceChannelName(requestId: string): string {
  assertNonEmpty(requestId, "requestId");
  return `request:${requestId}:presence`;
}

/**
 * user:{userId}:notifications
 * Postgres Changes subscription for user-specific notification events.
 * Filtered by recipient_id=eq.{userId} at the subscription level.
 */
export function userNotificationsChannelName(userId: string): string {
  assertNonEmpty(userId, "userId");
  return `user:${userId}:notifications`;
}

/**
 * responder:{responderId}:assignments
 * Private Broadcast channel for responder assignment events.
 * Authorized by realtime.messages RLS policy (responderId = auth.uid()).
 */
export function responderAssignmentsChannelName(responderId: string): string {
  assertNonEmpty(responderId, "responderId");
  return `responder:${responderId}:assignments`;
}

/**
 * responder:{responderId}:presence
 * Private Presence for responder online status.
 */
export function responderPresenceChannelName(responderId: string): string {
  assertNonEmpty(responderId, "responderId");
  return `responder:${responderId}:presence`;
}
