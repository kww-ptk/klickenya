import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { sanityClient, sanityFetch } from "@/lib/sanity/client";
import {
  LISTINGS_BY_TYPE_CITY_QUERY,
  LISTING_SLUGS_QUERY,
} from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { ListingGrid } from "@/components/listings/ListingGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import type { ListingCardProps } from "@/components/listings/ListingCard";

export const dynamic = 'force-static';
export const revalidate = 3600;

/* ── Type mapping ────────────────────────────────── */

const VALID_TYPES = ["stays", "experiences", "events", "rentals", "services", "restaurants"] as const;
type UrlType = (typeof VALID_TYPES)[number];

const TYPE_TO_SANITY: Record<UrlType, string> = {
  stays: "stay",
  experiences: "experience",
  events: "event",
  rentals: "rental",
  services: "service",
  restaurants: "restaurant",
};

const TYPE_LABELS: Record<UrlType, string> = {
  stays: "Stays",
  experiences: "Experiences",
  events: "Events",
  rentals: "Rentals",
  services: "Services",
  restaurants: "Restaurants",
};

function isValidType(type: string): type is UrlType {
  return VALID_TYPES.includes(type as UrlType);
}

function capitalize(str: string): string {
  return str
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* ── Static params ───────────────────────────────── */

export async function generateStaticParams() {
  const slugs: { slug: string; type: string; city: string }[] =
    await sanityClient.fetch(LISTING_SLUGS_QUERY);

  const seen = new Set<string>();
  const params: { type: string; city: string }[] = [];

  for (const item of slugs ?? []) {
    if (!item.type || !item.city) continue;

    // Map Sanity type back to URL type
    const urlType = Object.entries(TYPE_TO_SANITY).find(
      ([, v]) => v === item.type
    )?.[0];
    if (!urlType) continue;

    const citySlug = item.city.toLowerCase().replace(/\s+/g, "-");
    const key = `${urlType}/${citySlug}`;

    if (!seen.has(key)) {
      seen.add(key);
      params.push({ type: urlType, city: citySlug });
    }
  }

  return params;
}

/* ── Metadata ────────────────────────────────────── */

interface PageProps {
  params: Promise<{ type: string; city: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type, city } = await params;

  if (!isValidType(type)) return {};

  const label = TYPE_LABELS[type];
  const cityName = capitalize(city);
  const title = `${label} in ${cityName} | Klickenya`;
  const description = `Discover the best ${label.toLowerCase()} in ${cityName}, Kenya. Book with confidence on Klickenya.`;

  return {
    title,
    description,
    alternates: { canonical: `https://klickenya.com/${type}/${city}` },
    openGraph: { title, description, url: `https://klickenya.com/${type}/${city}` },
  };
}

/* ── Page ────────────────────────────────────────── */

export default async function CityPage({ params }: PageProps) {
  const { type, city } = await params;

  if (!isValidType(type)) notFound();

  const sanityType = TYPE_TO_SANITY[type];
  const label = TYPE_LABELS[type];
  const cityName = capitalize(city);

  const { data: listings } = await sanityFetch({
    query: LISTINGS_BY_TYPE_CITY_QUERY,
    params: { type: sanityType, city: cityName },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cards: ListingCardProps[] = (listings ?? []).map((l: any) => {
    const slug = l.slug?.current ?? l.slug ?? "";
    const photoUrl = l.coverPhoto
      ? urlForImage(l.coverPhoto).width(800).url()
      : "";

    return {
      id: l._id,
      title: l.title ?? "Untitled",
      city: l.city ?? "",
      price: l.price ?? null,
      priceUnit: l.priceUnit ?? "night",
      priceRange: l.priceRange,
      rating: l.avgRating,
      reviewCount: l.reviewCount,
      type: sanityType as ListingCardProps["type"],
      subcategory: l.subcategory,
      openingHours: l.openingHours,
      photos: photoUrl ? [photoUrl] : [],
      href: `/${type}/${city}/${slug}`,
    };
  });

  /* ── Breadcrumb schema ─── */
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://klickenya.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: label,
        item: `https://klickenya.com/${type}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: cityName,
        item: `https://klickenya.com/${type}/${city}`,
      },
    ],
  };

  return (
    <section className="max-w-[1280px] mx-auto px-5 md:px-10 py-10">
      <JsonLd schema={breadcrumbSchema} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-1.5 text-[13.5px] text-text2">
          <li>
            <Link href="/" className="hover:text-text transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="text-text3">
            /
          </li>
          <li>
            <Link
              href={`/${type}`}
              className="hover:text-text transition-colors"
            >
              {label}
            </Link>
          </li>
          <li aria-hidden="true" className="text-text3">
            /
          </li>
          <li className="font-semibold text-text">{cityName}</li>
        </ol>
      </nav>

      {/* Heading */}
      <div className="mb-8">
        <h1 className="font-display text-[clamp(28px,3.5vw,42px)] font-extrabold tracking-[-0.03em] text-dark">
          {label} in {cityName}
        </h1>
        <p className="mt-2 text-[15px] text-text2">
          {cards.length > 0
            ? `${cards.length} listing${cards.length !== 1 ? "s" : ""} found`
            : "No listings found yet"}
        </p>
      </div>

      {/* Grid or empty state */}
      {cards.length > 0 ? (
        <ListingGrid listings={cards} columns={4} />
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-[48px] mb-4">🔍</span>
          <p className="text-[18px] font-semibold text-text mb-2">
            No {label.toLowerCase()} in {cityName}
          </p>
          <p className="text-[15px] text-text2 max-w-[380px]">
            We&apos;re adding new listings all the time. Check back soon or
            explore another city.
          </p>
        </div>
      )}
    </section>
  );
}
