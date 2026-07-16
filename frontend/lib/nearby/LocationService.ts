/**
 * LocationService — wraps browser Geolocation API.
 * Single responsibility: acquire the user's position once.
 */
import type { UserLocation, LocationStatus } from "@/types/nearby";

export type LocationResult =
  | { status: "success"; location: UserLocation }
  | { status: Exclude<LocationStatus, "idle" | "requesting" | "success"> };

export class LocationService {
  private static readonly GEO_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10_000,
    maximumAge: 0,
  };

  /** Returns the user's current position, or a typed failure reason. */
  static getCurrentPosition(): Promise<LocationResult> {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return Promise.resolve({ status: "unsupported" });
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            status: "success",
            location: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            },
          });
        },
        (err) => {
          switch (err.code) {
            case GeolocationPositionError.PERMISSION_DENIED:
              resolve({ status: "denied" });
              break;
            case GeolocationPositionError.POSITION_UNAVAILABLE:
              resolve({ status: "unavailable" });
              break;
            case GeolocationPositionError.TIMEOUT:
              resolve({ status: "timeout" });
              break;
            default:
              resolve({ status: "unavailable" });
          }
        },
        this.GEO_OPTIONS
      );
    });
  }
}
