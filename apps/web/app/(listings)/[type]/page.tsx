import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { sanityFetch } from "@/lib/sanity/client";
import {
  LISTINGS_FILTERED_QUERY,
  SUBCATEGORY_COUNTS_QUERY,
} from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { ListingGrid } from "@/components/listings/ListingGrid";
import SubcategoryBar from "@/components/listings/SubcategoryBar";
import TagFilter from "@/components/listings/TagFilter";
import type { ListingCardProps } from "@/components/listings/ListingCard";
import { SUBCATEGORY_LABELS } from "@/lib/constants/subcategories";

export const dynamic = "force-dynamic";

/* ── Type mapping ────────────────────────────────── */

const VALID_TYPES = [
  "stays",
  "experiences",
  "events",
  "rentals",
  "services",
  "restaurants",
] as const;
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

/* ── Static params ───────────────────────────────── */

export function generateStaticParams() {
  return VALID_TYPES.map((type) => ({ type }));
}

/* ── Metadata ────────────────────────────────────── */

interface PageProps {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ sub?: string; tags?: string; city?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { type } = await params;
  const sp = await searchParams;

  if (!isValidType(type)) return {};

  const subcategory = sp.sub || null;
  const city = sp.city || null;

  const subLabel = subcategory
    ? SUBCATEGORY_LABELS[subcategory] ?? TYPE_LABELS[type]
    : TYPE_LABELS[type];

  const location = city
    ? city.charAt(0).toUpperCase() + city.slice(1)
    : "Kenya";

  const title = `${subLabel} in ${location} | Klickenya`;
  const description = `Browse the best ${subLabel.toLowerCase()} in ${location}. Curated listings for unforgettable experiences.`;

  return {
    title,
    description,
    alternates: { canonical: `https://klickenya.com/${type}` },
    openGraph: { title, description, url: `https://klickenya.com/${type}` },
  };
}

/* ── Page ────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToCardProps(listing: any, type: UrlType): ListingCardProps {
  const citySlug = (listing.city ?? "").toLowerCase().replace(/\s+/g, "-");
  const slug = listing.slug?.current ?? listing.slug ?? "";
  const photoUrl = listing.coverPhoto
    ? urlForImage(listing.coverPhoto).width(800).url()
    : "";

  return {
    id: listing._id,
    title: listing.title ?? "Untitled",
    city: listing.city ?? "",
    price: listing.price ?? 0,
    priceUnit: listing.priceUnit ?? "night",
    type: TYPE_TO_SANITY[type] as ListingCardProps["type"],
    photos: photoUrl ? [photoUrl] : [],
    href: `/${type}/${citySlug}/${slug}`,
  };
}

export default async function TypePage({ params, searchParams }: PageProps) {
  const { type } = await params;
  const sp = await searchParams;

  if (!isValidType(type)) notFound();

  const sanityType = TYPE_TO_SANITY[type];
  const label = TYPE_LABELS[type];

  const subcategory = sp.sub || null;
  const tags = sp.tags?.split(",").filter(Boolean) || [];
  const city = sp.city || null;

  // Fetch listings with filters
  const { data: listings } = await sanityFetch({
    query: LISTINGS_FILTERED_QUERY,
    params: {
      type: sanityType,
      subcategory: subcategory ?? "",
      city: city ?? "",
      limit: 48,
    },
  });

  // Fetch subcategory counts
  const { data: countsData } = await sanityFetch({
    query: SUBCATEGORY_COUNTS_QUERY,
    params: { type: sanityType },
  });

  // Build counts map
  const subcategoryCounts: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (countsData ?? []).forEach((row: any) => {
    if (row.subcategory) {
      subcategoryCounts[row.subcategory] =
        (subcategoryCounts[row.subcategory] || 0) + 1;
    }
  });

  // Filter by tags client-side (GROQ array-contains with dynamic params is limited)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let filtered = listings ?? [];
  if (tags.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filtered = filtered.filter((l: any) =>
      tags.every((tag: string) => (l.tags ?? []).includes(tag))
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cards: ListingCardProps[] = filtered.map((l: any) =>
    mapToCardProps(l, type)
  );

  // Get all unique tags from current (subcategory-filtered) results
  const availableTags = [
    ...new Set<string>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (listings ?? []).flatMap((l: any) => (l.tags ?? []) as string[])
    ),
  ]
    .sort()
    .slice(0, 12);

  // Dynamic heading
  const subLabel = subcategory
    ? SUBCATEGORY_LABELS[subcategory] ?? label
    : label;
  const location = city
    ? city.charAt(0).toUpperCase() + city.slice(1)
    : "Kenya";

  return (
    <>
      <SubcategoryBar
        type={sanityType}
        activeSubcategory={subcategory}
        counts={subcategoryCounts}
      />
      <TagFilter availableTags={availableTags} activeTags={tags} />

      <section className="max-w-[1280px] mx-auto px-5 md:px-10 py-10">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="font-display text-[clamp(28px,3.5vw,42px)] font-extrabold tracking-[-0.03em] text-dark">
            {subLabel} in {location}
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
              No {subLabel.toLowerCase()} found
            </p>
            <p className="text-[15px] text-text2 max-w-[380px]">
              We&apos;re adding new listings all the time. Check back soon or
              explore another category.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
