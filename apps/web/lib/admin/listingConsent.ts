import { adminClient } from "@/lib/supabase/admin";

/**
 * Map of listing Sanity _id → recorded photo_consent for every listing in `ids`
 * that has consent on file from EITHER flow:
 *   - claim flow:      claim_requests, status = 'verified' (public /claim or the
 *                      logged-in host-dashboard completion)
 *   - submission flow: listing_requests, consent_given = true, linked by
 *                      sanity_listing_id (set when an admin approves a /list submission)
 * Claim-flow consent takes precedence on the photo_consent value when a listing
 * has both; for claim_requests the most recent verified row wins.
 */
export async function getConsentByListingId(
  ids: string[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (ids.length === 0) return map;

  // Submission-flow consent (listing_requests, linked via sanity_listing_id).
  const { data: subRows } = await adminClient
    .from("listing_requests")
    .select("sanity_listing_id, photo_consent")
    .eq("consent_given", true)
    .in("sanity_listing_id", ids);
  for (const r of (subRows ?? []) as {
    sanity_listing_id: string | null;
    photo_consent: string | null;
  }[]) {
    if (r.sanity_listing_id) map.set(r.sanity_listing_id, r.photo_consent ?? null);
  }

  // Claim-flow consent (claim_requests) — overrides; most recent verified wins.
  const { data: claimRows } = await adminClient
    .from("claim_requests")
    .select("listing_sanity_id, photo_consent, created_at")
    .eq("status", "verified")
    .in("listing_sanity_id", ids)
    .order("created_at", { ascending: false });
  const seen = new Set<string>();
  for (const r of (claimRows ?? []) as {
    listing_sanity_id: string | null;
    photo_consent: string | null;
  }[]) {
    if (r.listing_sanity_id && !seen.has(r.listing_sanity_id)) {
      seen.add(r.listing_sanity_id);
      map.set(r.listing_sanity_id, r.photo_consent ?? null);
    }
  }

  return map;
}
