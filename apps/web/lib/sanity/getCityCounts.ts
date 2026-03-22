import { sanityClient } from "@/lib/sanity/client";
import { groq } from "next-sanity";
import { unstable_cache } from "next/cache";

export interface CityCount {
  city: string;
  count: number;
  image?: string;
}

const CITY_LISTINGS_QUERY = groq`
  *[_type == "listing" && status == "published" && defined(city) && city != ""]{ city }
`;

const DESTINATION_IMAGES_QUERY = groq`
  *[_type == "destination" && defined(heroImage)]{
    name,
    "image": heroImage.asset->url + "?w=96&h=96&fit=crop&auto=format&q=75"
  }
`;

async function fetchCityCounts(): Promise<CityCount[]> {
  const [listings, destinations] = await Promise.all([
    sanityClient.fetch<{ city: string }[]>(CITY_LISTINGS_QUERY),
    sanityClient.fetch<{ name: string; image: string }[]>(DESTINATION_IMAGES_QUERY),
  ]);

  // Build image lookup by destination name (case-insensitive)
  const imageMap = new Map<string, string>();
  for (const d of destinations) {
    if (d.name && d.image) {
      imageMap.set(d.name.toLowerCase(), d.image);
    }
  }

  const counts = new Map<string, number>();
  for (const l of listings) {
    const city = l.city.trim();
    if (!city) continue;
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([city, count]) => ({
      city,
      count,
      image: imageMap.get(city.toLowerCase()),
    }))
    .sort((a, b) => b.count - a.count);
}

export const getCityCounts = unstable_cache(fetchCityCounts, ["city-counts"], {
  revalidate: 3600,
});
