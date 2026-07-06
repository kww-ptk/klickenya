import { revalidatePath } from "next/cache";

/** Minimal Sanity client shape — just the fetch we need. */
type SanityFetcher = {
  fetch: <R = unknown>(query: string, params?: Record<string, unknown>) => Promise<R>;
};

/**
 * Revalidate every host profile page (`/hosts/[slug]`) that shows this listing's
 * card. `revalidateListing` covers the marketplace grids + detail page, but the
 * host page renders the same listing as a card and must be refreshed separately —
 * otherwise an edited title updates the detail page but not the host-page card.
 */
export async function revalidateHostPagesForListing(client: SanityFetcher, listingId: string) {
  const slugs = await client.fetch<(string | null)[]>(
    `*[_type == "host" && references($id)].slug.current`,
    { id: listingId },
  );
  revalidatePath("/hosts", "page");
  for (const s of slugs) if (s) revalidatePath(`/hosts/${s}`, "page");
}

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
