/**
 * DistanceCalculator — Haversine-based distance utility.
 * Single responsibility: compute and format distances.
 */
export class DistanceCalculator {
  private static readonly EARTH_RADIUS_KM = 6371;

  /** Convert degrees to radians. */
  private static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Compute the great-circle distance between two points.
   * Returns kilometres.
   */
  static compute(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_KM * c;
  }

  /**
   * Human-readable distance label.
   * < 1 km → "350 m"
   * ≥ 1 km → "1.2 km"
   */
  static format(km: number): string {
    if (km < 1) {
      const metres = Math.round(km * 1000);
      return `${metres} m`;
    }
    return `${km.toFixed(1)} km`;
  }
}
