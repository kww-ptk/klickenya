/**
 * House-host detection.
 *
 * Klickenya serves three kinds of host from one Next app:
 *
 *   klickenya.com          marketplace      (house)
 *   eat.klickenya.com      food app         (house, see isEatHost)
 *   <partner>.com          white-label      (NOT house → /storefront rewrite)
 *
 * The partner check is "anything we don't recognise", so every Klickenya-owned
 * subdomain has to be declared here or middleware rewrites it into
 * /storefront and it serves an empty white-label shell. That is exactly what
 * eat.klickenya.com did before this list existed.
 *
 * Deliberately an allowlist rather than a *.klickenya.com wildcard: a partner
 * could one day be given a klickenya.com subdomain, and a wildcard would
 * silently route it to the marketplace instead of their storefront.
 */
const HOUSE_SUBDOMAINS = ["www", "eat", "app"] as const;

/** Bare, lowercased hostname with any port stripped. */
function bareHost(host: string | null | undefined): string {
  return (host ?? "").split(":")[0].toLowerCase();
}

/** The apex this deployment considers its own, e.g. "klickenya.com". */
function siteHost(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://klickenya.com")
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0]
    .toLowerCase();
}

/**
 * True when `host` is a Klickenya house host (marketplace or a house
 * subdomain), false when it is a partner storefront domain. `host` should be
 * the bare hostname (may include a port).
 */
export function isHouseHost(host: string | null | undefined): boolean {
  if (!host) return true; // no host → safest default is the marketplace
  const h = bareHost(host);
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (h.endsWith(".vercel.app")) return true; // preview deployments

  for (const apex of new Set([siteHost(), "klickenya.com"])) {
    if (h === apex) return true;
    if (HOUSE_SUBDOMAINS.some((sub) => h === `${sub}.${apex}`)) return true;
  }
  return false; // anything else is a partner storefront host
}

/**
 * True when the request arrived on the food app's own host.
 *
 * Localhost has no subdomain, so middleware also honours a `?eathost=1` query
 * flag in development — see middleware.ts. Without it there is no way to
 * exercise this branch before deploying.
 */
export function isEatHost(host: string | null | undefined): boolean {
  const h = bareHost(host);
  if (!h) return false;
  return [...new Set([siteHost(), "klickenya.com"])].some(
    (apex) => h === `eat.${apex}`,
  );
}

/**
 * The food app's public origin, e.g. "https://eat.klickenya.com" — or null
 * when the subdomain is not live yet.
 *
 * This is deliberately a switch rather than a constant. Code that sends
 * traffic TO the subdomain (the /eatklick redirect, the canonical tag) must
 * stay dormant until DNS and the Vercel domain actually exist, or merging
 * this creates a link to a host that does not resolve. Detection of traffic
 * arriving FROM the subdomain (isEatHost) needs no such gate — it is driven
 * by the request's own hostname and is harmless while unused.
 *
 * Set NEXT_PUBLIC_EAT_ORIGIN to switch the subdomain on.
 */
export function eatOrigin(): string | null {
  const raw = (process.env.NEXT_PUBLIC_EAT_ORIGIN || "").trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, ""); // no trailing slash
}
