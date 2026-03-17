import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { sanityClient, sanityFetch } from "@/lib/sanity/client";
import {
  PROPERTIES_BY_CATEGORY_CITY_QUERY,
  PROPERTY_SLUGS_QUERY,
} from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { PropertyCategoryNav } from "@/components/real-estate/PropertyCategoryNav";
import { PropertyCard } from "@/components/real-estate/PropertyCard";
import { PropertyGrid } from "@/components/real-estate/PropertyGrid";

export const dynamic = 'force-static';
export const revalidate = 3600;

/* ── Category mapping ──────────────────────────────── */

const VALID_CATEGORIES = ["for-sale", "for-rent", "land", "commercial"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  "for-sale": "For Sale",
  "for-rent": "For Rent",
  land: "Land",
  commercial: "Commercial",
};

function isValidCategory(value: string): value is Category {
  return VALID_CATEGORIES.includes(value as Category);
}

function capitalize(str: string): string {
  return str
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* ── Mapper ────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPropertyToCard(p: any) {
  return {
    id: p._id,
    title: p.title ?? "Untitled",
    slug: p.slug?.current ?? p.slug ?? "",
    listingCategory: p.listingCategory ?? "for-sale",
    propertyType: p.propertyType,
    status: p.status ?? "available",
    price: p.price ?? 0,
    priceType: p.priceType ?? "total",
    previousPrice: p.previousPrice,
    isFeatured: p.isFeatured,
    isNewDevelopment: p.isNewDevelopment,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    sizeSqm: p.sizeSqm,
    neighbourhood: p.neighbourhood ?? "",
    city: p.city ?? "",
    coverPhoto: p.coverPhoto ? urlForImage(p.coverPhoto).width(800).url() : "",
  };
}

/* ── Static params ─────────────────────────────────── */

export async function generateStaticParams() {
  const slugs: { slug: string; listingCategory: string; city: string }[] =
    await sanityClient.fetch(PROPERTY_SLUGS_QUERY).catch(() => []);

  const seen = new Set<string>();
  const params: { slug: string; city: string }[] = [];

  for (const item of slugs ?? []) {
    if (!item.listingCategory || !item.city) continue;
    if (!isValidCategory(item.listingCategory)) continue;

    const citySlug = item.city.toLowerCase().replace(/\s+/g, "-");
    const key = `${item.listingCategory}/${citySlug}`;

    if (!seen.has(key)) {
      seen.add(key);
      params.push({ slug: item.listingCategory, city: citySlug });
    }
  }

  return params;
}

/* ── Metadata ──────────────────────────────────────── */

interface PageProps {
  params: Promise<{ slug: string; city: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: category, city } = await params;

  if (!isValidCategory(category)) return {};

  const label = CATEGORY_LABELS[category];
  const cityName = capitalize(city);
  const title = `Properties ${label} in ${cityName} | Klickenya`;
  const description = `Browse properties ${label.toLowerCase()} in ${cityName}, Kenya. Verified listings with transparent pricing on Klickenya.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://klickenya.com/real-estate/${category}/${city}`,
    },
    openGraph: {
      title,
      description,
      url: `https://klickenya.com/real-estate/${category}/${city}`,
    },
  };
}

/* ── Page ──────────────────────────────────────────── */

export default async function CategoryCityPage({ params }: PageProps) {
  const { slug: category, city } = await params;

  if (!isValidCategory(category)) notFound();

  const label = CATEGORY_LABELS[category];
  const cityName = capitalize(city);

  const { data: properties } = await sanityFetch({
    query: PROPERTIES_BY_CATEGORY_CITY_QUERY,
    params: { category, city: cityName },
  }).catch(() => ({ data: [] }));

  const cards = ((properties ?? []) as unknown[]).map(mapPropertyToCard);

  return (
    <>
      <Nav />

      <div className="pt-[68px]">
        <PropertyCategoryNav activeCategory={category} />

        <section className="max-w-[1320px] mx-auto px-5 md:px-10 py-10">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-1.5 text-[13.5px] text-text2">
              <li>
                <Link href="/" className="hover:text-text transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3 text-text3" />
              </li>
              <li>
                <Link
                  href="/real-estate"
                  className="hover:text-text transition-colors"
                >
                  Real Estate
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3 text-text3" />
              </li>
              <li>
                <Link
                  href={`/real-estate/${category}`}
                  className="hover:text-text transition-colors"
                >
                  {label}
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3 text-text3" />
              </li>
              <li className="font-semibold text-text">{cityName}</li>
            </ol>
          </nav>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="font-display text-[clamp(28px,3.5vw,42px)] font-extrabold tracking-[-0.03em] text-dark">
              Properties {label} in {cityName}
            </h1>
            <p className="mt-2 text-[15px] text-text2">
              {cards.length > 0
                ? `${cards.length} propert${cards.length !== 1 ? "ies" : "y"} found`
                : "No properties found yet"}
            </p>
          </div>

          {/* Grid or empty state */}
          {cards.length > 0 ? (
            <PropertyGrid variant="standard">
              {cards.map((card) => (
                <PropertyCard key={card.id} {...card} />
              ))}
            </PropertyGrid>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="text-[48px] mb-4">🏠</span>
              <p className="text-[18px] font-semibold text-text mb-2">
                No properties {label.toLowerCase()} in {cityName}
              </p>
              <p className="text-[15px] text-text2 max-w-[380px]">
                We&apos;re adding new properties all the time. Check back soon
                or explore another city.
              </p>
            </div>
          )}
        </section>
      </div>

      <Footer />
    </>
  );
}
