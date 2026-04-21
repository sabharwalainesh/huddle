// Distance helpers for the landing page "near me" filter.

const EARTH_RADIUS_MI = 3958.8;

/** Great-circle distance in miles between two points. */
export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distance from `me` to a business with optional coords. Returns null when unknown. */
export function distanceToBusinessMi(
  me: { lat: number; lng: number } | null,
  b: { lat: number | null; lng: number | null },
): number | null {
  if (!me || b.lat == null || b.lng == null) return null;
  return haversineMiles(me, { lat: b.lat, lng: b.lng });
}

/** Pretty short form: "0.4 mi", "2.3 mi", "12 mi". */
export function formatMiles(mi: number): string {
  if (mi < 1) return `${(Math.round(mi * 10) / 10).toFixed(1)} mi`;
  if (mi < 10) return `${(Math.round(mi * 10) / 10).toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}
