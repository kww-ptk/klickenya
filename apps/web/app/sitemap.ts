import type { MetadataRoute } from 'next'
import { groq } from 'next-sanity'
import { sanityClient } from '@/lib/sanity/client'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://klickenya.com'

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
  const listingRoutes: MetadataRoute.Sitemap = listings
    .filter((l) => l.slug && l.type && l.city)
    .map((l) => ({
      url: `${BASE_URL}/${l.type}/${encodeURIComponent(l.city.toLowerCase().replace(/\s+/g, '-'))}/${l.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

  // ── City-level pages derived from listings ─────────
  const citySet = new Set<string>()
  listings.forEach((l) => {
    if (l.type && l.city) {
      citySet.add(
        `${l.type}/${l.city.toLowerCase().replace(/\s+/g, '-')}`
      )
    }
  })

  const cityRoutes: MetadataRoute.Sitemap = Array.from(citySet).map(
    (key) => ({
      url: `${BASE_URL}/${key}`,
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
