/**
 * True when `host` is a Klickenya house host (marketplace), false when it is a
 * partner storefront domain. `host` should be the bare hostname (may include a
 * port). Used by middleware to decide whether to serve the marketplace or
 * rewrite to the /storefront route tree.
 */
export function isHouseHost(host: string | null | undefined): boolean {
  if (!host) return true; // no host → safest default is the marketplace
  const h = host.split(":")[0].toLowerCase(); // strip port
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (h.endsWith(".vercel.app")) return true; // preview deployments
  const siteHost = (process.env.NEXT_PUBLIC_SITE_URL || "https://klickenya.com")
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0]
    .toLowerCase();
  if (h === siteHost || h === `www.${siteHost}`) return true;
  if (h === "klickenya.com" || h === "www.klickenya.com") return true;
  return false; // anything else is a partner storefront host
}
