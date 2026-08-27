import { type Metadata } from "next";
import { sanityClient, sanityFetch } from "@/lib/sanity/client";
import {
  NEIGHBOURHOODS_QUERY,
  PROPERTIES_BY_CATEGORY_QUERY,
  PROPERTY_COUNT_BY_CITY_QUERY,
  PROPERTY_SLUGS_QUERY,
} from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { CategoryPageShell } from "@/components/real-estate/CategoryPageShell";
import { mapNeighbourhood, mapPropertiesToCards } from "@/lib/real-estate/mappers";
import {
  CATEGORY_LABELS,
  PROPERTY_CATEGORIES,
  RESERVED_REAL_ESTATE_SEGMENTS,
  areaPath,
  categoryCityPath,
  categoryPath,
  isPropertyCategory,
  neighbourhoodPath,
  type PropertyCategory,
} from "@/lib/real-estate/constants";
import { PLACE_SLUGS, getPlace, isKnownPlace } from "@/lib/real-estate/places";
import { categoryHeading } from "@/lib/real-estate/content";
import { absoluteUrl, shouldNoIndex } from "@/lib/real-estate/schema";
import { PropertyDetail, fetchProperty } from "./PropertyDetail";
import { AreaHub } from "./AreaHub";

export const revalidate = 3600;

function mapNeighbourhoods(input: unknown) {
  return ((input ?? []) as Record<string, unknown>[]).map(mapNeighbourhood);
}

/* ── Static params ─────────────────────────────────── */

export async function generateStaticParams() {
  const slugs: { slug: string }[] = await sanityClient
    .fetch(PROPERTY_SLUGS_QUERY)
    .catch(() => []);

  // One dynamic segment resolves three different kinds of page, so the
  // namespaces have to be kept apart. A property slugged "watamu" or "land"
  // would otherwise be shadowed by the hub that owns the name and would render
  // that hub instead, silently.
  const reserved = new Set([...RESERVED_REAL_ESTATE_SEGMENTS, ...PLACE_SLUGS]);

  return [
    ...PROPERTY_CATEGORIES.map((c) => ({ slug: c })),
    ...PLACE_SLUGS.map((slug) => ({ slug })),
    ...(slugs ?? [])
      .filter((s) => s.slug && !reserved.has(s.slug.toLowerCase()))
      .map((s) => ({ slug: s.slug })),
  ];
}

/* ── Metadata ──────────────────────────────────────── */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  if (isPropertyCategory(slug)) {
    const heading = categoryHeading(slug);
    const title = heading;
    const description =
      slug === "for-rent"
        ? "Apartments, houses and furnished homes to rent across Kenya. Monthly rent, bedroom counts and verified agents on every listing."
        : slug === "land"
          ? "Plots and land for sale across Kenya. Compare asking prices, plot sizes in acres and location on every listing."
          : slug === "commercial"
            ? "Offices, shops, warehouses and mixed use commercial property across Kenya, with floor areas and prices on every listing."
            : "Houses, apartments and villas for sale across Kenya. Transparent asking prices, verified agents and free enquiries.";

    return {
      title,
      description,
      alternates: { canonical: absoluteUrl(categoryPath(slug)) },
      openGraph: {
        title,
        description,
        url: absoluteUrl(categoryPath(slug)),
        type: "website",
      },
    };
  }

  const town = getPlace(slug);
  if (town) {
    const canonical = absoluteUrl(areaPath(town.slug));

    // A hub with no stock is a page about a property market with no property
    // on it, which is thin however good the copy is. It stays live and useful
    // to anyone who lands on it, and it stays out of the index until there is
    // something to list. It flips back on its own once stock arrives.
    const { data: liveCount } = await sanityFetch({
      query: PROPERTY_COUNT_BY_CITY_QUERY,
      params: { city: town.name },
    }).catch(() => ({ data: 0 }));

    return {
      title: town.metaTitle,
      description: town.metaDescription,
      ...(Number(liveCount) > 0
        ? {}
        : { robots: { index: false, follow: true } }),
      alternates: { canonical },
      openGraph: {
        title: town.metaTitle,
        description: town.metaDescription,
        url: canonical,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: town.metaTitle,
        description: town.metaDescription,
      },
    };
  }

  const property = await fetchProperty(slug);
  if (!property) {
    // notFound() renders with a 200 in this app, so say noindex explicitly.
    return { title: "Property not found", robots: { index: false, follow: false } };
  }

  const category = property.listingCategory as PropertyCategory;
  const place = [property.neighbourhood, property.city].filter(Boolean).join(", ");
  // The root layout appends "| Klickenya", so it is not repeated here.
  const title = property.seoTitle ?? `${property.title} | ${place || "Kenya"}`;
  const description =
    property.seoDescription ??
    `${property.title}${place ? ` in ${place}` : ""}. ${
      CATEGORY_LABELS[category] ?? "For sale"
    } on Klickenya with verified agent contact and free enquiries.`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ogImages = ((property.photos ?? []) as any[])
    .filter((p) => p?.asset)
    .slice(0, 3)
    .map((p) => urlForImage(p).width(1200).height(630).url());

  return {
    title,
    description,
    // A sold or let listing keeps its URL and its links, but it should not
    // compete in results against properties somebody can actually buy.
    robots: shouldNoIndex(property.status)
      ? { index: false, follow: true }
      : undefined,
    alternates: { canonical: absoluteUrl(`/real-estate/${slug}`) },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/real-estate/${slug}`),
      images: ogImages,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages,
    },
  };
}

/* ── Category view ─────────────────────────────────── */

async function CategoryView({ category }: { category: PropertyCategory }) {
  const [propertiesResult, neighbourhoodsResult] = await Promise.all([
    sanityFetch({
      query: PROPERTIES_BY_CATEGORY_QUERY,
      params: { category },
    }).catch(() => ({ data: [] })),
    sanityFetch({ query: NEIGHBOURHOODS_QUERY }).catch(() => ({ data: [] })),
  ]);

  const cards = mapPropertiesToCards(propertiesResult.data);
  const neighbourhoods = mapNeighbourhoods(neighbourhoodsResult.data);
  const heading = categoryHeading(category);

  // City rails give the pre-rendered /[category]/[city] pages an entry point.
  // They were generated but nothing on the site linked to them.
  const cityCounts = new Map<string, number>();
  const areaCounts = new Map<string, number>();
  for (const card of cards) {
    if (card.city) cityCounts.set(card.city, (cityCounts.get(card.city) ?? 0) + 1);
    if (card.neighbourhood)
      areaCounts.set(card.neighbourhood, (areaCounts.get(card.neighbourhood) ?? 0) + 1);
  }

  const cityLinks = Array.from(cityCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([city, count]) => ({
      label: city,
      href: categoryCityPath(category, city),
      count,
    }));

  // Only link neighbourhoods that have a Sanity document behind them. Linking
  // every distinct `neighbourhood` string would point at pages that do not
  // exist, which is how the hub's neighbourhood cards ended up 404ing.
  const areaLinks = neighbourhoods
    .filter((n) => n.slug && areaCounts.has(n.name))
    .map((n) => ({
      label: n.name,
      href: neighbourhoodPath(n.slug),
      count: areaCounts.get(n.name),
    }))
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, 16);

  const otherCategories = PROPERTY_CATEGORIES.filter((c) => c !== category).map(
    (c) => ({ label: categoryHeading(c), href: categoryPath(c) })
  );

  return (
    <CategoryPageShell
      category={category}
      place="Kenya"
      heading={heading}
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Real Estate", path: "/real-estate" },
        { name: CATEGORY_LABELS[category] },
      ]}
      canonicalPath={categoryPath(category)}
      cards={cards}
      rails={[
        {
          title: `Browse ${CATEGORY_LABELS[category].toLowerCase()} by city`,
          links: cityLinks,
        },
        {
          title: "Popular neighbourhoods",
          links: areaLinks,
        },
        {
          title: "Other property categories",
          links: otherCategories,
        },
      ]}
    />
  );
}

/* ── Page ──────────────────────────────────────────── */

export default async function RealEstateSlugPage({ params }: PageProps) {
  const { slug } = await params;

  if (isPropertyCategory(slug)) return <CategoryView category={slug} />;

  // Town hubs win the name. See RESERVED_REAL_ESTATE_SEGMENTS.
  if (isKnownPlace(slug)) return <AreaHub slug={slug} />;

  return <PropertyDetail slug={slug} />;
}
