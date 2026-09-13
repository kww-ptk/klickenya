/**
 * Pull coordinates out of whatever a guest pastes into the delivery field.
 *
 * On this coast an address is a landmark and a set of directions, not a house
 * number — so the field stays free text and this is a bonus, never a
 * requirement. If we can find a pin, the kitchen gets a tappable map link
 * instead of "behind the blue gate past Sunset Lab".
 *
 * Handles what people actually paste from the Google Maps app and website:
 *
 *   -3.3456, 40.0123                          plain coordinates
 *   https://maps.google.com/?q=-3.34,40.01    share sheet, older format
 *   .../maps/@-3.3456,40.0123,17z             URL bar while looking at a map
 *   .../maps/place/Name/@-3.34,40.01,17z/...  a place page
 *   .../maps/search/?api=1&query=-3.34,40.01  search link
 *
 * NOT handled, deliberately: maps.app.goo.gl short links. Resolving one means
 * following a redirect to a third party from our server on guest-supplied
 * input. The link is still kept as the address text, so the owner can tap it —
 * they just do the resolving, as they would have anyway.
 */

export type Coordinates = { lat: number; lng: number };

/** Nairobi to Lamu sits well inside these; this only rejects nonsense. */
export function isPlausible(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    // 0,0 is the Atlantic. It is what a broken parse produces, never a delivery.
    !(lat === 0 && lng === 0)
  );
}

const PAIR = String.raw`(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)`;

export function parseCoordinates(input: string | null | undefined): Coordinates | null {
  if (!input) return null;
  const text = input.trim();
  if (!text) return null;

  const patterns = [
    // @lat,lng — the form inside a Maps URL path
    new RegExp(String.raw`@${PAIR}`),
    // ?q= / &query= / &ll= / &destination=
    new RegExp(String.raw`[?&](?:q|query|ll|destination|daddr)=${PAIR}`, "i"),
    // Bare "lat, lng" with nothing else around it
    new RegExp(String.raw`^${PAIR}$`),
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (isPlausible(lat, lng)) return { lat, lng };
    }
  }
  return null;
}

/** A link the kitchen can tap to get directions. */
export function mapsUrl(coords: Coordinates): string {
  return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
}
