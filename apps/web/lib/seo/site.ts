/**
 * The one production origin. Every canonical, sitemap entry, JSON-LD @id and
 * og:url on the site is built from this.
 *
 * It is www, not the bare apex, because www is what Vercel actually serves:
 * https://klickenya.com/<anything> answers 307 and redirects here. Declaring
 * the apex meant every canonical on the site pointed at a URL that redirects,
 * so no page was genuinely self-canonical. If the primary domain is ever
 * flipped back to the apex in Vercel, change this line and nothing else.
 *
 * Deliberately NOT derived from NEXT_PUBLIC_SITE_URL: that is
 * http://localhost:3000 in development and the deployment URL on a Vercel
 * preview, so canonicals built from it would point at a preview domain — the
 * kind of mistake that quietly deindexes pages.
 */
export const SITE_URL = "https://www.klickenya.com";

/** Absolute production URL for an app-relative path. */
export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
