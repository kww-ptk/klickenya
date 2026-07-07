import { adminClient } from "@/lib/supabase/admin";

/**
 * Shared auth check for the `/api/partner/*` routes — server-to-server only,
 * used by partner sites' own backends (e.g. Claris African Experience) to
 * reach into Klickenya. Never called from a browser.
 */
export function partnerKeys(): Record<string, string> {
  try {
    return JSON.parse(process.env.PARTNER_API_KEYS ?? "{}");
  } catch {
    return {};
  }
}

/** True if the request's Bearer token matches the given partner's key. */
export function verifyPartnerKey(authHeader: string | null, partner: string): boolean {
  const expectedKey = partnerKeys()[partner];
  return Boolean(expectedKey) && authHeader === `Bearer ${expectedKey}`;
}

/** The Supabase user_id of the host tagged with this partner_id, or null. */
export async function resolvePartnerOwner(partner: string): Promise<string | null> {
  const { data } = await adminClient
    .from("host_profiles")
    .select("user_id")
    .eq("partner_id", partner)
    .maybeSingle();
  return data?.user_id ?? null;
}
