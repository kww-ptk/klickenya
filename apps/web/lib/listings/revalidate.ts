import { revalidatePath } from "next/cache";

/**
 * Bust the static caches for the public marketplace pages that display a listing.
 *
 * The detail route `(listings)/[type]/[city]/[slug]` is `force-static` with
 * `revalidate = 3600`, so without on-demand revalidation an edit wouldn't show
 * on the live page for up to an hour. We revalidate the ROUTE TEMPLATES (not
 * concrete URLs) so callers don't need to reconstruct the exact type-label +
 * city-slug — this refreshes every matching page on its next request. Covers the
 * detail page, the type/city grids, and the homepage.
 *
 * Route groups like `(listings)` are invisible in the URL, so the paths below
 * are the real URL templates.
 */
export function revalidateListingPaths() {
  revalidatePath("/[type]/[city]/[slug]", "page");
  revalidatePath("/[type]/[city]", "page");
  revalidatePath("/[type]", "page");
  revalidatePath("/", "page");
}
