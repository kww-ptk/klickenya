/**
 * Is this URL safe to hand to next/image?
 *
 * next/image throws — and takes the whole page down with it — when given a
 * host that is not in `images.remotePatterns`. Menu item photos are free-text
 * URLs a host can paste, so an arbitrary third-party link is always possible.
 *
 * This happened in production: a menu item on /m/napul-restaurant pointed at a
 * food blogger's server, and the entire public QR menu rendered "Something went
 * wrong". A restaurant's menu page must never go down because one photo URL is
 * unusable.
 *
 * Treating a disallowed host as "no photo" also stops us hotlinking images that
 * are not ours to serve.
 *
 * Keep in step with `images.remotePatterns` in next.config.ts.
 */
const ALLOWED_HOSTS = [
  "cdn.sanity.io",
  "images.unsplash.com",
  "tribalsand.com",
  "www.tribalsand.com",
];

const ALLOWED_SUFFIXES = [".supabase.co"];

export function isAllowedImageHost(url: string | null | undefined): boolean {
  if (!url) return false;

  // Relative and data URLs are served by us and never hit the host allowlist.
  if (url.startsWith("/") || url.startsWith("data:")) return true;

  let host: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    host = parsed.hostname.toLowerCase();
  } catch {
    return false; // not a URL at all
  }

  if (ALLOWED_HOSTS.includes(host)) return true;
  return ALLOWED_SUFFIXES.some((suffix) => host.endsWith(suffix));
}
