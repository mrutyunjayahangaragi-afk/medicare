/**
 * lib/realtime/location-validator.ts
 * Zod-based validation for responder location Broadcast payloads.
 *
 * Validates before broadcasting or applying any received location.
 * Rejects impossible coordinate values, negative accuracy, and malformed timestamps.
 */

import { z } from "zod";

/** Zod schema for a valid responder location Broadcast payload. */
export const ResponderLocationSchema = z.object({
  requestId: z.string().uuid("requestId must be a valid UUID"),
  latitude: z
    .number()
    .min(-90, "latitude must be >= -90")
    .max(90, "latitude must be <= 90"),
  longitude: z
    .number()
    .min(-180, "longitude must be >= -180")
    .max(180, "longitude must be <= 180"),
  accuracy: z
    .number()
    .min(0, "accuracy must be non-negative")
    .nullable(),
  heading: z
    .number()
    .min(0, "heading must be >= 0")
    .max(360, "heading must be <= 360")
    .nullable(),
  speed: z
    .number()
    .min(0, "speed must be non-negative")
    .nullable(),
  capturedAt: z
    .string()
    .datetime({ message: "capturedAt must be a valid ISO 8601 datetime" }),
});

export type ValidatedLocation = z.infer<typeof ResponderLocationSchema>;

/**
 * Validate an unknown Broadcast payload as a ResponderLocationBroadcast.
 *
 * @param payload  The raw value received from the Broadcast channel.
 * @returns        A parsed ValidatedLocation on success.
 * @throws         ZodError when validation fails.
 */
export function validateLocationPayload(payload: unknown): ValidatedLocation {
  return ResponderLocationSchema.parse(payload);
}

/**
 * Safe version — returns null when validation fails instead of throwing.
 * Use this in event handlers where a malformed payload must be silently dropped.
 */
export function safeValidateLocationPayload(
  payload: unknown
): ValidatedLocation | null {
  const result = ResponderLocationSchema.safeParse(payload);
  if (!result.success) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[location-validator] Rejected payload:", result.error.format());
    }
    return null;
  }
  return result.data;
}

/**
 * Validate raw GeolocationCoordinates from the browser API.
 * Returns null when any required field is out of range.
 */
export function validateBrowserCoordinates(
  coords: GeolocationCoordinates
): { latitude: number; longitude: number; accuracy: number; heading: number | null; speed: number | null } | null {
  if (
    coords.latitude < -90 ||
    coords.latitude > 90 ||
    coords.longitude < -180 ||
    coords.longitude > 180 ||
    coords.accuracy < 0
  ) {
    return null;
  }

  const heading =
    coords.heading !== null && isFinite(coords.heading) && coords.heading >= 0 && coords.heading <= 360
      ? coords.heading
      : null;

  const speed =
    coords.speed !== null && isFinite(coords.speed) && coords.speed >= 0
      ? coords.speed
      : null;

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    heading,
    speed,
  };
}
