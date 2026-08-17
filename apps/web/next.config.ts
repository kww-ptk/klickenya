import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Legacy singular listing URLs → the real plural route.
 *
 * The sitemap used to emit the Sanity `type` value ("experience") instead of
 * the public url segment ("experiences"), so Google indexed ~87 URLs of the
 * shape /experience/watamu/short-beach. Those still match [type]/[city]/[slug],
 * fail isValidType() and — because that route is force-static — get served as a
 * cached 200 of the not-found shell rather than a 404. Redirecting them 301 to
 * the real page recovers whatever equity they picked up and removes the
 * soft-404. The sitemap itself is fixed in app/sitemap.ts; this is cleanup for
 * what is already in the index.
 *
 * Mirrors TYPE_TO_URL_SEGMENT in lib/listings/url.ts. next.config.ts cannot use
 * the "@/" alias, hence the local copy.
 */
const SINGULAR_TO_PLURAL_LISTING_SEGMENT: Record<string, string> = {
  stay: "stays",
  experience: "experiences",
  event: "events",
  rental: "rentals",
  service: "services",
  restaurant: "restaurants",
};

function legacyListingRedirects() {
  return Object.entries(SINGULAR_TO_PLURAL_LISTING_SEGMENT).flatMap(
    ([singular, plural]) => [
      // Detail pages. Safe for every type: no real route serves 3 segments
      // under a singular prefix.
      {
        source: `/${singular}/:city/:slug`,
        destination: `/${plural}/:city/:slug`,
        permanent: true,
      },
      // City pages. Skipped for "event" because app/event/ is a real route and
      // we do not want to shadow anything that grows underneath it.
      ...(singular === "event"
        ? []
        : [
            {
              source: `/${singular}/:city`,
              destination: `/${plural}/:city`,
              permanent: true,
            },
          ]),
    ],
  );
}

const nextConfig: NextConfig = {
  async redirects() {
    return [
      ...legacyListingRedirects(),
      {
        source: "/kenya/watamu/beach/garoda-beach",
        destination: "/experiences/watamu/garoda-beach",
        permanent: true,
      },
      {
        source: "/2024/11/06/money-exchange-atm-watamu",
        destination: "/journal/money-exchange-atm-watamu-guide",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "tribalsand.com",
      },
      {
        protocol: "https",
        hostname: "www.tribalsand.com",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  disableLogger: true,
  automaticVercelMonitors: false,
});
