/**
 * Host slug generation with guaranteed uniqueness across Sanity `host` documents.
 *
 * Why this exists: the public /hosts/[slug] page resolves a host with
 *   *[_type == "host" && slug.current == $slug][0]
 * When two host documents share a slug, that `[0]` picks one arbitrarily
 * (GROQ orders by _id ascending), so an empty duplicate can shadow the real
 * host and the profile page renders with no listings — while admin/dashboard,
 * which resolve via Supabase host_profiles.sanity_host_id, still show them.
 * Real production incident: two "jessica-mckenzie" host docs, empty one won.
 *
 * Every code path that creates a Sanity host document MUST allocate its slug
 * through uniqueHostSlug so the slug is collision-free at creation time.
 */

/** Minimal structural type — any Sanity client (next-sanity createClient) satisfies this. */
type SanityFetcher = {
  fetch: <R = unknown>(query: string, params?: Record<string, unknown>) => Promise<R>;
};

const EXISTING_HOST_SLUG_QUERY = `*[_type == "host" && slug.current == $slug][0]._id`;

/** Slugify a host display name into a URL-safe base. Falls back to "host" when empty. */
export function slugifyHostName(name: string | null | undefined): string {
  const base = (name ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "host";
}

/**
 * Returns a slug guaranteed not to collide with any existing Sanity `host` document.
 * Tries the base slug first, then base-2, base-3, … Falls back to a random suffix
 * only if 50 numbered variants are somehow all taken.
 */
export async function uniqueHostSlug(
  client: SanityFetcher,
  name: string | null | undefined,
): Promise<string> {
  const base = slugifyHostName(name);
  let slug = base;
  for (let n = 2; n <= 50; n++) {
    const existingId = await client.fetch<string | null>(EXISTING_HOST_SLUG_QUERY, { slug });
    if (!existingId) return slug;
    slug = `${base}-${n}`;
  }
  // Effectively unreachable — guarantee termination with a random suffix.
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}
