import { MetadataRoute } from "next";
import { sanityClient } from "@/lib/sanity/client";
import {
  LISTING_SLUGS_QUERY,
  PROPERTY_SLUGS_QUERY,
  BLOG_POST_SLUGS_QUERY,
} from "@/lib/sanity/queries";

const BASE_URL = "https://klickenya.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /* Fetch all slugs in parallel */
  const [listingSlugs, propertySlugs, blogSlugs] = await Promise.all([
    sanityClient.fetch(LISTING_SLUGS_QUERY).catch(() => []),
    sanityClient.fetch(PROPERTY_SLUGS_QUERY).catch(() => []),
    sanityClient.fetch(BLOG_POST_SLUGS_QUERY).catch(() => []),
  ]);

  /* Static pages */
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily" as const, priority: 1 },
    { url: `${BASE_URL}/stays`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${BASE_URL}/experiences`, changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${BASE_URL}/events`, changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${BASE_URL}/rentals`, changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${BASE_URL}/services`, changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${BASE_URL}/restaurants`, changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${BASE_URL}/real-estate`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${BASE_URL}/real-estate/for-sale`, changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${BASE_URL}/real-estate/for-rent`, changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${BASE_URL}/real-estate/land`, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${BASE_URL}/real-estate/commercial`, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${BASE_URL}/destinations`, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${BASE_URL}/journal`, changeFrequency: "daily" as const, priority: 0.7 },
  ];

  /* Listing pages — map Sanity type to URL segment */
  const TYPE_MAP: Record<string, string> = {
    stay: "stays",
    experience: "experiences",
    event: "events",
    rental: "rentals",
    service: "services",
    restaurant: "restaurants",
  };

  const listingPages: MetadataRoute.Sitemap = (listingSlugs ?? [])
    .filter((s: any) => s.slug && s.type && s.city)
    .map((s: any) => ({
      url: `${BASE_URL}/${TYPE_MAP[s.type] ?? s.type}/${s.city.toLowerCase().replace(/\s+/g, "-")}/${s.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  /* Property pages */
  const propertyPages: MetadataRoute.Sitemap = (propertySlugs ?? [])
    .filter((s: any) => s.slug)
    .map((s: any) => ({
      url: `${BASE_URL}/real-estate/${s.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  /* Blog pages */
  const blogPages: MetadataRoute.Sitemap = (blogSlugs ?? [])
    .filter((s: any) => s.slug)
    .map((s: any) => ({
      url: `${BASE_URL}/journal/${s.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

  return [...staticPages, ...listingPages, ...propertyPages, ...blogPages];
}
