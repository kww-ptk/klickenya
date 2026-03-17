import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Star, MapPin, ChevronRight, Check } from "lucide-react";
import { sanityClient } from "@/lib/sanity/client";
import {
  LISTING_BY_SLUG_QUERY,
  LISTING_SLUGS_QUERY,
  SIMILAR_LISTINGS_QUERY,
} from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { ListingGrid } from "@/components/listings/ListingGrid";
import { ContactForm } from "@/components/listings/ContactForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { PortableTextRenderer } from "@/components/blog/PortableTextRenderer";
import { cn } from "@/lib/utils";
import type { ListingCardProps } from "@/components/listings/ListingCard";

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

const SINGULAR_LABELS: Record<string, string> = {
  stay: "Stay",
  experience: "Experience",
  event: "Event",
  rental: "Rental",
  service: "Service",
  restaurant: "Restaurant",
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

/* ── JSON-LD helpers ─────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildJsonLd(listing: any, urlType: UrlType, photoUrls: string[]) {
  const sanityType = TYPE_TO_SANITY[urlType];
  const base = {
    "@context": "https://schema.org",
    name: listing.title,
    description: listing.seoDescription ?? listing.title,
    image: photoUrls[0],
    address: {
      "@type": "PostalAddress",
      addressLocality: listing.city,
      addressRegion: listing.county,
      addressCountry: "KE",
    },
  };

  switch (sanityType) {
    case "stay":
      return {
        ...base,
        "@type": "LodgingBusiness",
        priceRange: `KSh ${listing.price}`,
      };
    case "experience":
      return {
        ...base,
        "@type": "TouristAttraction",
      };
    case "restaurant":
      return {
        ...base,
        "@type": "Restaurant",
        servesCuisine: listing.cuisine,
      };
    case "event":
      return {
        ...base,
        "@type": "Event",
        offers: {
          "@type": "Offer",
          price: listing.price,
          priceCurrency: "KES",
        },
      };
    default:
      return {
        ...base,
        "@type": "Product",
        offers: {
          "@type": "Offer",
          price: listing.price,
          priceCurrency: "KES",
        },
      };
  }
}

/* ── Static params ───────────────────────────────── */

export async function generateStaticParams() {
  const slugs: { slug: string; type: string; city: string }[] =
    await sanityClient.fetch(LISTING_SLUGS_QUERY);

  return (slugs ?? [])
    .filter((s) => s.slug && s.type && s.city)
    .map((s) => {
      const urlType =
        Object.entries(TYPE_TO_SANITY).find(([, v]) => v === s.type)?.[0] ?? "";
      return {
        type: urlType,
        city: s.city.toLowerCase().replace(/\s+/g, "-"),
        slug: s.slug,
      };
    })
    .filter((p) => p.type);
}

/* ── Metadata ────────────────────────────────────── */

interface PageProps {
  params: Promise<{ type: string; city: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type, city, slug } = await params;

  if (!isValidType(type)) return {};

  const listing = await sanityClient.fetch(LISTING_BY_SLUG_QUERY, { slug });

  if (!listing) return {};

  const title = listing.seoTitle ?? `${listing.title} | Klickenya`;
  const description =
    listing.seoDescription ??
    `${SINGULAR_LABELS[TYPE_TO_SANITY[type]] ?? "Listing"} in ${listing.city ?? capitalize(city)}, Kenya.`;

  const ogImages =
    listing.photos?.slice(0, 3).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => urlForImage(p).width(1200).height(630).url()
    ) ?? [];

  return {
    title,
    description,
    alternates: { canonical: `https://klickenya.com/${type}/${city}/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://klickenya.com/${type}/${city}/${slug}`,
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

/* ── Page ────────────────────────────────────────── */

export default async function ListingDetailPage({ params }: PageProps) {
  const { type, city, slug } = await params;

  if (!isValidType(type)) notFound();

  const sanityType = TYPE_TO_SANITY[type];
  const listing = await sanityClient.fetch(LISTING_BY_SLUG_QUERY, { slug });

  if (!listing) notFound();

  const cityName = listing.city ?? capitalize(city);
  const label = TYPE_LABELS[type];
  const singularLabel = SINGULAR_LABELS[sanityType] ?? "Listing";

  // Photos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const photos: string[] = (listing.photos ?? []).map((p: any) =>
    urlForImage(p).width(1000).url()
  );

  // Similar listings
  const similar = await sanityClient.fetch(SIMILAR_LISTINGS_QUERY, {
    type: sanityType,
    city: cityName,
    slug,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const similarCards: ListingCardProps[] = (similar ?? []).map((l: any) => {
    const lSlug = l.slug?.current ?? l.slug ?? "";
    const lCity = (l.city ?? "").toLowerCase().replace(/\s+/g, "-");
    const photoUrl = l.coverPhoto
      ? urlForImage(l.coverPhoto).width(800).url()
      : "";

    return {
      id: l._id,
      title: l.title ?? "Untitled",
      city: l.city ?? "",
      price: l.price ?? 0,
      priceUnit: l.priceUnit ?? "night",
      type: sanityType as ListingCardProps["type"],
      photos: photoUrl ? [photoUrl] : [],
      href: `/${type}/${lCity}/${lSlug}`,
    };
  });

  const highlights: { emoji: string; title: string; description: string }[] =
    listing.highlights ?? [];
  const amenities: string[] = listing.amenities ?? [];
  const jsonLd = buildJsonLd(listing, type, photos);

  const hostName = listing.hostName || "Klickenya";
  const hostInitials = hostName
    .split(/\s+/)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <JsonLd schema={jsonLd} />

      <article className="max-w-[1280px] mx-auto px-5 md:px-10 py-8">
        {/* ── Breadcrumb ────────────────────── */}
        <nav aria-label="Breadcrumb" className="mb-5">
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
                href={`/${type}`}
                className="hover:text-text transition-colors"
              >
                {label}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3 text-text3" />
            </li>
            <li>
              <Link
                href={`/${type}/${city}`}
                className="hover:text-text transition-colors"
              >
                {cityName}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3 text-text3" />
            </li>
            <li className="font-semibold text-text line-clamp-1">
              {listing.title}
            </li>
          </ol>
        </nav>

        {/* ── Photo gallery ────────────────── */}
        <div className="rounded-[32px] overflow-hidden mb-10">
          {photos.length >= 5 ? (
            <div className="grid grid-cols-4 grid-rows-2 gap-1.5 h-[420px] md:h-[480px]">
              {/* Main image */}
              <div className="col-span-2 row-span-2 relative">
                <Image
                  src={photos[0]}
                  alt={listing.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              </div>
              {photos.slice(1, 5).map((photo, i) => (
                <div key={i} className="relative">
                  <Image
                    src={photo}
                    alt={`${listing.title} photo ${i + 2}`}
                    fill
                    className="object-cover"
                    sizes="25vw"
                  />
                </div>
              ))}
            </div>
          ) : photos.length > 0 ? (
            <div className="relative aspect-[16/9] md:aspect-[2.2/1]">
              <Image
                src={photos[0]}
                alt={listing.title}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
            </div>
          ) : (
            <div className="aspect-[16/9] bg-surface2 flex items-center justify-center">
              <span className="text-[48px]">📷</span>
            </div>
          )}
        </div>

        {/* ── Two-column layout ────────────── */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
          {/* Left column */}
          <div className="flex-1 min-w-0">
            {/* Type badge + status */}
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block rounded-full bg-amber/15 text-amber px-3 py-1 text-[12px] font-bold uppercase tracking-wide">
                {singularLabel}
              </span>
              {listing.status && listing.status !== "published" && (
                <span className="inline-block rounded-full bg-surface px-3 py-1 text-[12px] font-semibold text-text2">
                  {listing.status}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-display text-[clamp(28px,3.5vw,42px)] font-extrabold tracking-[-0.03em] text-dark leading-[1.1] mb-4">
              {listing.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14.5px] text-text2 mb-6">
              <span className="flex items-center gap-1">
                <Star className="size-4 fill-amber text-amber" />
                <span className="font-semibold text-text">4.9</span>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-4 text-text3" />
                {cityName}
                {listing.county ? `, ${listing.county}` : ""}
              </span>
              <span>{singularLabel}</span>
            </div>

            {/* Host section */}
            <div className="flex items-center gap-4 mb-7">
              <div className="size-12 rounded-full bg-gradient-to-br from-amber to-purple flex items-center justify-center text-white text-[16px] font-bold shrink-0">
                {hostInitials}
              </div>
              <div>
                <p className="text-[15px] font-semibold text-text">
                  Hosted by {hostName}
                </p>
                <p className="text-[13px] text-text2">
                  Joined Klickenya
                </p>
              </div>
            </div>

            <hr className="border-border mb-7" />

            {/* Highlights grid */}
            {highlights.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-7">
                  {highlights.map((h) => (
                    <div key={h.title} className="flex gap-3.5">
                      <span className="text-[26px] shrink-0 mt-0.5">{h.emoji}</span>
                      <div>
                        <p className="text-[14.5px] font-semibold text-text">
                          {h.title}
                        </p>
                        <p className="text-[13px] text-text2 leading-[1.5]">
                          {h.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <hr className="border-border mb-7" />
              </>
            )}

            {/* Description */}
            {listing.description && (
              <>
                <div className="mb-7">
                  <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-4">
                    About this {singularLabel.toLowerCase()}
                  </h2>
                  <PortableTextRenderer
                    value={listing.description}
                    className="max-w-none"
                  />
                </div>
                <hr className="border-border mb-7" />
              </>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="mb-7">
                <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-5">
                  What this place offers
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5">
                  {amenities.map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-3 text-[14.5px] text-text2"
                    >
                      <Check className="size-4 text-amber shrink-0" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Restaurant details */}
            {sanityType === "restaurant" && (
              <div className="mb-7">
                <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-5">
                  Restaurant details
                </h2>

                {/* Cuisine tags */}
                {listing.cuisine && listing.cuisine.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {listing.cuisine.map((c: string) => (
                      <span
                        key={c}
                        className="inline-block rounded-full bg-purple/10 text-purple px-3 py-1 text-[13px] font-semibold"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {/* Price range badge */}
                {listing.priceRange && (
                  <div className="mb-4">
                    <span className="inline-block rounded-full bg-amber/15 text-amber px-3 py-1 text-[13px] font-bold uppercase tracking-wide">
                      {listing.priceRange}
                    </span>
                  </div>
                )}

                {/* Opening hours */}
                {listing.openingHours && (
                  <div className="mb-4">
                    <h3 className="text-[14.5px] font-semibold text-text mb-1">
                      Opening Hours
                    </h3>
                    <p className="text-[14px] text-text2 whitespace-pre-line">
                      {listing.openingHours}
                    </p>
                  </div>
                )}

                {/* Reservation notice */}
                {listing.reservationRequired && (
                  <div className="flex items-center gap-2 rounded-[16px] bg-surface px-4 py-3">
                    <span className="text-[18px]">📅</span>
                    <p className="text-[14px] font-semibold text-text">
                      Reservation required
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right column: booking card (desktop) */}
          <aside className="hidden lg:block w-[380px] shrink-0">
            <div className="sticky top-[88px] border border-border rounded-[32px] shadow-lg p-7 bg-white">
              <ContactForm
                listingId={listing._id}
                listingTitle={listing.title}
                listingType={sanityType}
                price={listing.price ?? 0}
                priceUnit={listing.priceUnit ?? "night"}
              />
            </div>
          </aside>
        </div>

        {/* ── Similar listings ─────────────── */}
        {similarCards.length > 0 && (
          <section className="mt-16 mb-8">
            <h2 className="font-display text-[clamp(22px,2.5vw,30px)] font-bold tracking-[-0.02em] text-dark mb-6">
              Similar {label.toLowerCase()} nearby
            </h2>
            <ListingGrid listings={similarCards} columns={3} />
          </section>
        )}
      </article>

      {/* ── Mobile bottom bar ──────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-[150] bg-white border-t border-border px-5 py-3.5 flex items-center justify-between lg:hidden">
        <div>
          <span className="font-display text-[20px] font-extrabold tracking-[-0.02em] text-dark">
            KSh {(listing.price ?? 0).toLocaleString()}
          </span>
          <span className="text-[14px] text-text2">
            {" "}
            / {listing.priceUnit ?? "night"}
          </span>
        </div>
        <a
          href="#mobile-contact"
          className={cn(
            "px-6 py-3 rounded-[18px] text-[14px] font-bold",
            "bg-gradient-to-r from-amber to-amber2 text-dark",
            "shadow-[0_4px_14px_rgba(232,160,32,0.35)]"
          )}
        >
          Reserve
        </a>
      </div>

      {/* ── Mobile booking form ────────────── */}
      <div id="mobile-contact" className="lg:hidden max-w-[560px] mx-auto px-5 pb-24">
        <div className="border border-border rounded-[32px] shadow-lg p-7 bg-white">
          <ContactForm
            listingId={listing._id}
            listingTitle={listing.title}
            listingType={sanityType}
            price={listing.price ?? 0}
            priceUnit={listing.priceUnit ?? "night"}
          />
        </div>
      </div>
    </>
  );
}
