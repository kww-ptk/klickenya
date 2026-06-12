import { cache } from "react";
import { headers } from "next/headers";
import { sanityClient } from "@/lib/sanity/client";
import { PARTNER_BY_DOMAIN_QUERY, PARTNER_BY_SLUG_QUERY } from "@/lib/partner/queries";
import type { Partner } from "@/lib/partner/types";

/** Bare, lowercased hostname for the incoming request (port stripped). */
async function getRequestHost(): Promise<string | null> {
  const h = await headers();
  const host = h.get("host");
  if (!host) return null;
  return host.split(":")[0].toLowerCase();
}

/**
 * Resolve the partner for the incoming request host.
 * `null` = Klickenya house brand (no partner doc lists this host).
 * React-cached: one Sanity lookup per request regardless of how many callers.
 */
export const getPartnerByHost = cache(async (): Promise<Partner | null> => {
  const host = await getRequestHost();
  if (!host) return null;
  return (
    (await sanityClient.fetch<Partner | null>(PARTNER_BY_DOMAIN_QUERY, { host })) ?? null
  );
});

/**
 * Resolve a partner by its slug — used by the storefront app (Plan 4), which
 * knows its own partner slug from config rather than the host. `null` if none.
 */
export const getPartnerBySlug = cache(async (slug: string): Promise<Partner | null> => {
  if (!slug) return null;
  return (
    (await sanityClient.fetch<Partner | null>(PARTNER_BY_SLUG_QUERY, { slug })) ?? null
  );
});
