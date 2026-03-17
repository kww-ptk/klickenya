import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { sanityFetch } from "@/lib/sanity/client";
import { LISTINGS_BY_TYPE_QUERY } from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { ListingGrid } from "@/components/listings/ListingGrid";
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

/* ── Static params ───────────────────────────────── */

export function generateStaticParams() {
  return VALID_TYPES.map((type) => ({ type }));
}

/* ── Metadata ────────────────────────────────────── */

interface PageProps {
  params: Promise<{ type: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type } = await params;

  if (!isValidType(type)) return {};

  const label = TYPE_LABELS[type];
  const title = `${label} in Kenya | Klickenya`;
  const description = `Browse the best ${label.toLowerCase()} across Kenya. Curated listings for unforgettable experiences.`;

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

export default async function TypePage({ params }: PageProps) {
  const { type } = await params;

  if (!isValidType(type)) notFound();

  const sanityType = TYPE_TO_SANITY[type];
  const label = TYPE_LABELS[type];

  const { data: listings } = await sanityFetch({
    query: LISTINGS_BY_TYPE_QUERY,
    params: { type: sanityType },
  });

  const cards: ListingCardProps[] = (listings ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (l: any) => mapToCardProps(l, type)
  );

  return (
    <section className="max-w-[1280px] mx-auto px-5 md:px-10 py-10">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="font-display text-[clamp(28px,3.5vw,42px)] font-extrabold tracking-[-0.03em] text-dark">
          {label} in Kenya
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
            No {label.toLowerCase()} found
          </p>
          <p className="text-[15px] text-text2 max-w-[380px]">
            We&apos;re adding new listings all the time. Check back soon or
            explore another category.
          </p>
        </div>
      )}
    </section>
  );
}
