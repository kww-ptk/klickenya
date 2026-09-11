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

/**
 * Legacy WordPress URLs → their Next.js equivalents.
 *
 * The site was a WordPress install before the Next.js rebuild and Google still
 * has a batch of the old permalinks indexed. Every one of them is dead: most
 * match no route and get served as a cached 200 of the not-found shell, and the
 * date-archive ones hard 404. Two of them still rank on page one, including
 * /2024/07/05/how-to-get-around-watamu which sits directly below the live
 * journal post for the same query and splits the signal with it.
 *
 * Only /blog/:path*, one date URL and one beach URL were ever mapped (in
 * vercel.json and below). These are the rest.
 *
 * Destinations verified 200 before adding: /destinations/{watamu,kilifi,diani},
 * /real-estate, /experiences/watamu/{garoda-beach,jacaranda-beach,mida-creek}.
 */
function legacyWordpressRedirects() {
  return [
    // Old WP taxonomy: /kenya/<city>/<section>/<slug>. The slugs match the
    // listing slugs we kept, so these land on the real listing page.
    {
      source: "/kenya/:city/beach/:slug",
      destination: "/experiences/:city/:slug",
      permanent: true,
    },
    {
      source: "/kenya/:city/things-to-do/:slug",
      destination: "/experiences/:city/:slug",
      permanent: true,
    },
    // Old WP region hubs → the destination pages that replaced them.
    {
      source: "/region/:city",
      destination: "/destinations/:city",
      permanent: true,
    },
    // Individual posts that are still indexed.
    {
      source: "/how-to-get-around-watamu",
      destination: "/journal/watamu-transport-guide",
      permanent: true,
    },
    {
      source: "/24-things-to-do-in-watamu",
      destination: "/journal/complete-guide-watamu-kenya-2026",
      permanent: true,
    },
    {
      source: "/watamu-real-estate-investment-guide",
      destination: "/real-estate",
      permanent: true,
    },
    // Date-archive permalinks. The known one is mapped to its replacement; the
    // rest cannot be mapped slug-for-slug, so they land on the journal index,
    // which beats a 404. Order matters: specific before the catch-all.
    {
      source: "/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/how-to-get-around-watamu",
      destination: "/journal/watamu-transport-guide",
      permanent: true,
    },
    {
      source: "/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug",
      destination: "/journal",
      permanent: true,
    },
  ];
}

const nextConfig: NextConfig = {
  async redirects() {
    return [
      ...legacyListingRedirects(),
      // The restaurant command center lived at /eat until 2026-09-11, when /eat
      // became the public food-discovery surface. Hosts have these on their
      // phones, so the old paths must keep working. Only the command-center
      // SUBPATHS redirect — bare /eat is the new public page and must not.
      ...["listings", "inbox", "settings", "stats"].map((seg) => ({
        source: `/eat/${seg}/:path*`,
        destination: `/manage/${seg}/:path*`,
        permanent: false,
      })),
      ...["listings", "inbox", "settings", "stats"].map((seg) => ({
        source: `/eat/${seg}`,
        destination: `/manage/${seg}`,
        permanent: false,
      })),
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
      // Must come last: contains a date-archive catch-all that would otherwise
      // shadow the specific date mappings above.
      ...legacyWordpressRedirects(),
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
