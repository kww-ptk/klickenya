import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { sanityClient, sanityFetch } from "@/lib/sanity/client";
import {
  PROPERTIES_BY_CITY_QUERY,
  PROPERTY_SLUGS_QUERY,
} from "@/lib/sanity/queries";
import { CategoryPageShell } from "@/components/real-estate/CategoryPageShell";
import { mapPropertiesToCards } from "@/lib/real-estate/mappers";
import {
  CATEGORY_LABELS,
  PROPERTY_CATEGORIES,
  categoryCityPath,
  categoryPath,
  citySlug,
  isPropertyCategory,
} from "@/lib/real-estate/constants";
import { capitalizeWords } from "@/lib/real-estate/format";
import { categoryHeading } from "@/lib/real-estate/content";
import { absoluteUrl } from "@/lib/real-estate/schema";

export const dynamic = "force-static";
export const revalidate = 3600;

/* ── Static params ─────────────────────────────────── */

export async function generateStaticParams() {
  const slugs: { listingCategory: string; city: string }[] = await sanityClient
    .fetch(PROPERTY_SLUGS_QUERY)
    .catch(() => []);

  const seen = new Set<string>();
  const params: { slug: string; city: string }[] = [];

  for (const item of slugs ?? []) {
    if (!item.listingCategory || !item.city) continue;
    if (!isPropertyCategory(item.listingCategory)) continue;

    const city = citySlug(item.city);
    const key = `${item.listingCategory}/${city}`;
    if (seen.has(key)) continue;
    seen.add(key);
    params.push({ slug: item.listingCategory, city });
  }

  return params;
}

/* ── Metadata ──────────────────────────────────────── */

interface PageProps {
  params: Promise<{ slug: string; city: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: category, city } = await params;
  if (!isPropertyCategory(category)) return {};

  const cityName = capitalizeWords(city);
  const heading = categoryHeading(category, cityName);
  const title = heading;
  const description = `${heading} on Klickenya. Compare live asking prices, sizes and features, and enquire with the listing agent for free.`;
  const canonical = absoluteUrl(categoryCityPath(category, city));

  // dynamicParams lets any /[category]/[city] pair render on demand, and this
  // app currently serves notFound() with a 200 status (an unmatched route does
  // the same), so a bare notFound() would leave an indexable soft 404 behind.
  // Deciding here means the page carries noindex whichever shell is rendered.
  // Next dedupes this fetch with the one in the page component.
  const { data: cityProperties } = await sanityFetch({
    query: PROPERTIES_BY_CITY_QUERY,
    params: { city: cityName },
  }).catch(() => ({ data: [] }));

  const hasListings = mapPropertiesToCards(cityProperties).some(
    (c) => c.listingCategory === category
  );

  return {
    title,
    description,
    ...(hasListings ? {} : { robots: { index: false, follow: true } }),
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

/* ── Page ──────────────────────────────────────────── */

export default async function CategoryCityPage({ params }: PageProps) {
  const { slug: category, city } = await params;
  if (!isPropertyCategory(category)) notFound();

  const cityName = capitalizeWords(city);

  // One fetch for the whole city so the cross-category rail can be built from
  // real counts. Linking a category that has nothing in this city would create
  // an empty page for Google to treat as a soft 404.
  const { data: cityProperties } = await sanityFetch({
    query: PROPERTIES_BY_CITY_QUERY,
    params: { city: cityName },
  }).catch(() => ({ data: [] }));

  const allCityCards = mapPropertiesToCards(cityProperties);
  const cards = allCityCards.filter((c) => c.listingCategory === category);

  // dynamicParams is on, so an invented /real-estate/for-rent/atlantis would
  // otherwise render as a cached empty 200. Nothing to list means nothing to
  // index.
  if (cards.length === 0) notFound();

  const otherCategories = PROPERTY_CATEGORIES.filter(
    (c) => c !== category && allCityCards.some((card) => card.listingCategory === c)
  ).map((c) => ({
    label: categoryHeading(c, cityName),
    href: categoryCityPath(c, city),
  }));

  return (
    <CategoryPageShell
      category={category}
      place={cityName}
      heading={categoryHeading(category, cityName)}
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Real Estate", path: "/real-estate" },
        { name: CATEGORY_LABELS[category], path: categoryPath(category) },
        { name: cityName },
      ]}
      canonicalPath={categoryCityPath(category, city)}
      cards={cards}
      showCityFilter={false}
      rails={[
        {
          title: `Other property in ${cityName}`,
          links: otherCategories,
        },
        {
          title: "Browse all of Kenya",
          links: PROPERTY_CATEGORIES.map((c) => ({
            label: categoryHeading(c),
            href: categoryPath(c),
          })),
        },
      ]}
    />
  );
}
