/**
 * lib/realtime/location-throttle.ts
 * Throttles high-frequency browser Geolocation updates before Broadcast or Database persist.
 *
 * Rules:
 *   - Minimum interval: 8 seconds (time-based throttle).
 *   - Minimum movement: approximately 10 meters (distance-based throttle).
 *   - Send immediately when tracking starts.
 *   - Send immediately on important status changes.
 */

import { calculateDistance } from "../tracking";

export interface ThrottleConfig {
  minIntervalMs: number; // e.g. 8000
  minMovementMeters: number; // e.g. 10
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function createLocationThrottle(config: ThrottleConfig = { minIntervalMs: 8000, minMovementMeters: 10 }) {
  let lastSentTime = 0;
  let lastSentCoords: Coordinates | null = null;

  return {
    shouldSend(coords: Coordinates, force = false): boolean {
      const now = Date.now();

      if (force || !lastSentCoords) {
        lastSentTime = now;
        lastSentCoords = { latitude: coords.latitude, longitude: coords.longitude };
        return true;
      }

      const elapsed = now - lastSentTime;
      if (elapsed < config.minIntervalMs) {
        return false;
      }

      // Calculate distance in kilometers using existing calculateDistance helper
      const distanceKm = calculateDistance(
        lastSentCoords.latitude,
        lastSentCoords.longitude,
        coords.latitude,
        coords.longitude
      );
      const distanceMeters = distanceKm * 1000;

      if (distanceMeters < config.minMovementMeters) {
        return false;
      }

      lastSentTime = now;
      lastSentCoords = { latitude: coords.latitude, longitude: coords.longitude };
      return true;
    },

    reset(): void {
      lastSentTime = 0;
      lastSentCoords = null;
    }
  };
}
