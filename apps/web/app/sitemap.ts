import type { MetadataRoute } from 'next'
import { groq } from 'next-sanity'
import { sanityClient } from '@/lib/sanity/client'
import { listingPublicPath, TYPE_TO_URL_SEGMENT } from '@/lib/listings/url'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://klickenya.com'

/**
 * Regenerate hourly. Without this the sitemap is built once at deploy time, so
 * listings published from Sanity after a deploy never appear until the next
 * one. `revalidate` keeps it in step with the content.
 */
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Fetch all dynamic slugs in parallel ────────────
  const [listings, posts, destinations, properties, agents] =
    await Promise.all([
      sanityClient
        .fetch<{ slug: string; type: string; city: string }[]>(
          groq`*[_type == "listing" && status == "published" && (!defined(partner) || publishToMarketplace == true)]{
            "slug": slug.current, type, city
          }`
        )
        .catch(() => []),
      sanityClient
        .fetch<{ slug: string }[]>(
          groq`*[_type == "blogPost" && status == "published"]{ "slug": slug.current }`
        )
        .catch(() => []),
      sanityClient
        .fetch<{ slug: string }[]>(
          groq`*[_type == "destination"]{ "slug": slug.current }`
        )
        .catch(() => []),
      sanityClient
        .fetch<{ slug: string }[]>(
          groq`*[_type == "property" && status == "available"]{ "slug": slug.current }`
        )
        .catch(() => []),
      sanityClient
        .fetch<{ slug: string }[]>(
          groq`*[_type == "agent"]{ "slug": slug.current }`
        )
        .catch(() => []),
    ])

  // ── Static routes ──────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    ...[
      '/stays',
      '/experiences',
      '/events',
      '/rentals',
      '/services',
      '/restaurants',
      '/real-estate',
      '/journal',
      '/destinations',
    ].map((path) => ({
      url: `${BASE_URL}${path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...['/about', '/contact', '/how-it-works', '/privacy', '/terms'].map(
      (path) => ({
        url: `${BASE_URL}${path}`,
        lastModified: new Date(),
        changeFrequency: 'yearly' as const,
        priority: 0.5,
      })
    ),
  ]

  // ── Dynamic listing routes (/[type]/[city]/[slug]) ─
  // The public route uses the PLURAL url segment ("experiences"), not the
  // Sanity `type` value ("experience"). Building these by hand previously
  // emitted /experience/... for every listing — URLs that still match the
  // [type]/[city]/[slug] route, fail isValidType() and, because that route is
  // force-static, get served as a cached 200 of the not-found shell. Google saw
  // 87 duplicate soft-404s canonicalising to the homepage and never saw a real
  // listing URL. Go through listingPublicPath() so this cannot drift again — it
  // is the same construction generateStaticParams() uses.
  const knownType = (t: string) =>
    Object.prototype.hasOwnProperty.call(TYPE_TO_URL_SEGMENT, t)

  const listingRoutes: MetadataRoute.Sitemap = listings
    .filter((l) => l.slug && l.type && l.city && knownType(l.type))
    .map((l) => ({
      url: `${BASE_URL}${listingPublicPath(l.type, l.city, l.slug)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

  // ── City-level pages derived from listings ─────────
  const citySet = new Set<string>()
  listings.forEach((l) => {
    if (l.type && l.city && knownType(l.type)) {
      // Same construction as the detail URLs, minus the slug, so the two can
      // never disagree about the type segment or the city slug.
      citySet.add(listingPublicPath(l.type, l.city, '').replace(/\/$/, ''))
    }
  })

  const cityRoutes: MetadataRoute.Sitemap = Array.from(citySet).map(
    (path) => ({
      url: `${BASE_URL}${path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })
  )

  // ── Blog post routes (/journal/[slug]) ─────────────
  const blogRoutes: MetadataRoute.Sitemap = posts
    .filter((p) => p.slug)
    .map((p) => ({
      url: `${BASE_URL}/journal/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

  // ── Destination routes (/destinations/[slug]) ──────
  const destinationRoutes: MetadataRoute.Sitemap = destinations
    .filter((d) => d.slug)
    .map((d) => ({
      url: `${BASE_URL}/destinations/${d.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

  // ── Real estate property routes (/real-estate/[slug])
  const propertyRoutes: MetadataRoute.Sitemap = properties
    .filter((p) => p.slug)
    .map((p) => ({
      url: `${BASE_URL}/real-estate/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

  // ── Agent routes (/real-estate/agent/[slug]) ───────
  const agentRoutes: MetadataRoute.Sitemap = agents
    .filter((a) => a.slug)
    .map((a) => ({
      url: `${BASE_URL}/real-estate/agent/${a.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

  return [
    ...staticRoutes,
    ...listingRoutes,
    ...cityRoutes,
    ...blogRoutes,
    ...destinationRoutes,
    ...propertyRoutes,
    ...agentRoutes,
  ]
}
