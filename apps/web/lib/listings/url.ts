/**
 * Public marketplace URL for a listing.
 *
 * The public route is `(listings)/[type]/[city]/[slug]` where `[type]` is the
 * PLURAL segment (stays, experiences, …). Admin "View on site" links were using
 * `/listings/{type}/{slug}` (singular type, no city, wrong prefix) which 404s.
 * Mirrors mapListingToCard in app/hosts/[slug]/page.tsx and revalidate.ts.
 */
const TYPE_TO_URL_SEGMENT: Record<string, string> = {
  stay: "stays",
  experience: "experiences",
  event: "events",
  rental: "rentals",
  service: "services",
  restaurant: "restaurants",
};

export function listingPublicPath(
  type: string,
  city: string | null | undefined,
  slug: string,
): string {
  const seg = TYPE_TO_URL_SEGMENT[type] ?? `${type}s`;
  const citySlug = (city ?? "").toLowerCase().trim().replace(/\s+/g, "-");
  return `/${seg}/${citySlug}/${slug}`;
}
