/**
 * Real-estate domain constants.
 *
 * These lived as copy-pasted literals in four page files. Categories in
 * particular were duplicated in [slug]/page.tsx, [slug]/[city]/page.tsx and
 * the admin table, which is how PropertyCard ended up keying its badge off
 * `status` while every other file keyed off `listingCategory`.
 */

export const PROPERTY_CATEGORIES = [
  "for-sale",
  "for-rent",
  "land",
  "commercial",
] as const;

export type PropertyCategory = (typeof PROPERTY_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<PropertyCategory, string> = {
  "for-sale": "For Sale",
  "for-rent": "For Rent",
  land: "Land",
  commercial: "Commercial",
};

/** Short label used on cards where "For Sale" is too wide. */
export const CATEGORY_SHORT_LABELS: Record<PropertyCategory, string> = {
  "for-sale": "For Sale",
  "for-rent": "For Rent",
  land: "Land",
  commercial: "Commercial",
};

/** Badge colours, keyed by listing category (NOT by status). */
export const CATEGORY_BADGE_STYLES: Record<PropertyCategory, string> = {
  "for-sale": "bg-purple2/90 text-white",
  "for-rent": "bg-green/90 text-white",
  land: "bg-amber/92 text-dark",
  commercial: "bg-blue-500/90 text-white",
};

export function isPropertyCategory(value: string): value is PropertyCategory {
  return (PROPERTY_CATEGORIES as readonly string[]).includes(value);
}

/* ── Availability status ───────────────────────────── */

export const PROPERTY_STATUSES = [
  "available",
  "under-offer",
  "sold",
  "let",
  "draft",
] as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const STATUS_LABELS: Record<PropertyStatus, string> = {
  available: "Available",
  "under-offer": "Under Offer",
  sold: "Sold",
  let: "Let",
  draft: "Draft",
};

/** Statuses that mean the property is no longer on the market. */
export const CLOSED_STATUSES: readonly string[] = ["sold", "let"];

export function isClosedStatus(status?: string | null): boolean {
  return CLOSED_STATUSES.includes(status ?? "");
}

/* ── Property types ────────────────────────────────── */

export const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "villa", label: "Villa" },
  { value: "studio", label: "Studio" },
  { value: "townhouse", label: "Townhouse" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
] as const;

export const PROPERTY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  PROPERTY_TYPES.map((t) => [t.value, t.label])
);

/**
 * Mirrors PROPERTY_FEATURES in apps/studio/schemas/property.ts. Kept in sync by
 * hand — the studio package is not importable from the web app.
 */
export const PROPERTY_FEATURES = [
  "Pool",
  "Gym",
  "Guard/Security",
  "Generator",
  "Borehole",
  "Parking",
  "Lift/Elevator",
  "CCTV",
  "Servant Quarters",
  "Garden",
  "Rooftop",
  "Sea View",
  "City View",
  "Gated Community",
] as const;

/* ── URLs ──────────────────────────────────────────── */

/**
 * Canonical URLs and JSON-LD identifiers are always the production origin.
 *
 * NEXT_PUBLIC_SITE_URL is http://localhost:3000 in development and would be the
 * deployment URL on a Vercel preview. Deriving canonicals from it would ship
 * self-referencing canonicals pointing at a preview domain, which is the kind
 * of mistake that quietly deindexes pages. The pages this replaces hardcoded
 * klickenya.com for exactly this reason.
 */
export const SITE_URL = "https://klickenya.com";

export const REAL_ESTATE_BASE = "/real-estate";

export function categoryPath(category: PropertyCategory): string {
  return `${REAL_ESTATE_BASE}/${category}`;
}

export function categoryCityPath(
  category: PropertyCategory,
  city: string
): string {
  return `${REAL_ESTATE_BASE}/${category}/${citySlug(city)}`;
}

export function propertyPath(slug: string): string {
  return `${REAL_ESTATE_BASE}/${slug}`;
}

export function neighbourhoodPath(slug: string): string {
  return `${REAL_ESTATE_BASE}/neighbourhood/${slug}`;
}

export function agentPath(slug: string): string {
  return `${REAL_ESTATE_BASE}/agent/${slug}`;
}

/** Lowercase, hyphenated city segment — the form generateStaticParams emits. */
export function citySlug(city: string): string {
  return city.toLowerCase().trim().replace(/\s+/g, "-");
}
