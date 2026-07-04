import { revalidatePath } from "next/cache";

/** Sanity `type` value → the plural URL segment used by the public routes.
 *  Mirrors TYPE_TO_SANITY in (listings)/[type]/[city]/[slug]/page.tsx. */
const SANITY_TYPE_TO_URL: Record<string, string> = {
  stay: "stays",
  experience: "experiences",
  event: "events",
  rental: "rentals",
  service: "services",
  restaurant: "restaurants",
};

/**
 * Revalidate the public marketplace pages for a listing after a write.
 *
 * The detail route `(listings)/[type]/[city]/[slug]` is `force-static` with
 * `generateStaticParams`. Next.js does NOT invalidate statically-generated pages
 * when you revalidate the dynamic TEMPLATE (`/[type]/[city]/[slug]`), so we
 * revalidate the CONCRETE literal URL instead — built exactly like
 * generateStaticParams does (`city.toLowerCase()`, spaces → hyphens).
 *
 * This mirrors the working blog pattern in the Sanity webhook, which revalidates
 * concrete paths like `/journal/<slug>`.
 *
 * Pass no args (or a non-listing type) to just refresh the grids/home.
 */
export function revalidateListing(type?: string, city?: string, slug?: string) {
  revalidatePath("/", "page");

  if (!type || !city || !slug) return;
  const urlType = SANITY_TYPE_TO_URL[type];
  if (!urlType) return;

  const citySlug = city.toLowerCase().replace(/\s+/g, "-");
  revalidatePath(`/${urlType}`, "page");
  revalidatePath(`/${urlType}/${citySlug}`, "page");
  revalidatePath(`/${urlType}/${citySlug}/${slug}`, "page");
}
