/**
 * Distance between two points, and how to say it to a walker.
 *
 * Pure arithmetic, kept out of the React hook so it can be tested. It runs on
 * the resident's phone: the server never receives a resident's position and has
 * no use for these.
 */

export interface Point {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in metres (haversine). */
export function distanceMetres(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude));
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Distance as a walker reads it. This is a town you cross in twenty minutes, so
 * metres are the useful unit, and false precision is worse than none: a phone
 * fix is not accurate to the metre, so the number is rounded to the nearest ten
 * and never claims to be closer than that.
 */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.max(10, Math.round(metres / 10) * 10)} m`;
  if (metres < 10_000) return `${(metres / 1000).toFixed(1)} km`;
  return `${Math.round(metres / 1000)} km`;
}

/**
 * Sorts by distance, nearest first. Anything without a pin keeps its order and
 * goes to the end: an outlet that has not set its coordinates should not vanish
 * from the list a resident uses to find it.
 */
export function sortByDistance<T extends { latitude: number | null; longitude: number | null }>(
  outlets: T[],
  from: Point,
): { outlet: T; metres: number | null }[] {
  return outlets
    .map((outlet) => ({
      outlet,
      metres:
        outlet.latitude != null && outlet.longitude != null
          ? distanceMetres(from, { latitude: outlet.latitude, longitude: outlet.longitude })
          : null,
    }))
    .sort((a, b) => {
      if (a.metres == null && b.metres == null) return 0;
      if (a.metres == null) return 1;
      if (b.metres == null) return -1;
      return a.metres - b.metres;
    });
}
