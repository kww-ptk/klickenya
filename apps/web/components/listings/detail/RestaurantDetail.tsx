import { Star, MapPin, Clock, UtensilsCrossed } from "lucide-react";
import { PortableTextRenderer } from "@/components/blog/PortableTextRenderer";
import { PhotoGallery } from "@/components/listings/widgets/PhotoGallery";
import { Breadcrumb } from "@/components/listings/widgets/Breadcrumb";
import { HighlightsGrid } from "@/components/listings/widgets/HighlightsGrid";
import { AmenitiesList } from "@/components/listings/widgets/AmenitiesList";
import { HostBadge } from "@/components/listings/widgets/HostBadge";
import { TrackPageView } from "@/lib/analytics/TrackPageView";
import { SimilarListings } from "@/components/listings/widgets/SimilarListings";
import { BookingSidebar } from "@/components/listings/widgets/BookingSidebar";
import { MobileBookingBar } from "@/components/listings/widgets/MobileBookingBar";
import { OpenNowBadge } from "./restaurant/OpenNowBadge";
import type { ListingCardProps } from "@/components/listings/ListingCard";

/* ── Types ─────────────────────────────────────────── */

interface RestaurantDetailProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listing: any;
  photos: string[];
  urlType: string;
  typeLabel: string;
  singularLabel: string;
  sanityType: string;
  cityName: string;
  citySlug: string;
  similarCards: ListingCardProps[];
}

/* ── Helpers ───────────────────────────────────────── */

const PRICE_RANGE_MAP: Record<string, { label: string; symbol: string }> = {
  budget: { label: "Budget-friendly", symbol: "$" },
  "mid-range": { label: "Mid-range", symbol: "$$" },
  "fine-dining": { label: "Fine dining", symbol: "$$$" },
};

/* ── Component ─────────────────────────────────────── */

function RestaurantDetail({
  listing,
  photos,
  urlType,
  typeLabel,
  singularLabel,
  sanityType,
  cityName,
  citySlug,
  similarCards,
}: RestaurantDetailProps) {
  const highlights = listing.highlights ?? [];
  const amenities: string[] = listing.amenities ?? [];
  const hostName = listing.hostRef?.name ?? listing.hostName ?? "Klickenya";
  const cuisine: string[] = listing.cuisine ?? [];
  const priceInfo = PRICE_RANGE_MAP[listing.priceRange ?? ""] ?? null;

  return (
    <>
      <article className="max-w-[1280px] mx-auto px-5 md:px-10 py-8">
        <Breadcrumb
          type={urlType}
          typeLabel={typeLabel}
          city={cityName}
          citySlug={citySlug}
          listingTitle={listing.title}
        />

        <TrackPageView listingSlug={listing.slug?.current ?? ""} listingType={sanityType} city={cityName} hostUserId={listing.hostId ?? null} />
        <PhotoGallery photos={photos} title={listing.title} />

        {/* ── Two-column layout ────────────── */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
          {/* Left column */}
          <div className="flex-1 min-w-0">
            {/* Type badge + cuisine tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-block rounded-full bg-amber/15 text-amber px-3 py-1 text-[12px] font-bold uppercase tracking-wide">
                {singularLabel}
              </span>
              {cuisine.map((c) => (
                <span
                  key={c}
                  className="inline-block rounded-full bg-purple/10 text-purple px-3 py-1 text-[13px] font-semibold"
                >
                  {c}
                </span>
              ))}
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
              {priceInfo && (
                <span className="font-semibold">
                  {priceInfo.symbol} · {priceInfo.label}
                </span>
              )}
            </div>

            <HostBadge hostName={hostName} hostRef={listing.hostRef} isVerified={listing.isVerified} listingSlug={listing.slug?.current} />
            <hr className="border-border mb-7" />

            <HighlightsGrid highlights={highlights} />

            {/* ── Opening hours card ──────────── */}
            {listing.openingHours && (
              <>
                <div className="rounded-[20px] border border-border bg-surface/50 p-5 mb-7">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="size-5 text-text3" />
                      <h3 className="text-[15px] font-semibold text-text">
                        Opening Hours
                      </h3>
                    </div>
                    <OpenNowBadge openingHours={listing.openingHours} />
                  </div>
                  <p className="text-[14px] text-text2 whitespace-pre-line leading-[1.7]">
                    {listing.openingHours}
                  </p>
                </div>
              </>
            )}

            {/* ── Reservation notice ─────────── */}
            {listing.reservationRequired && (
              <div className="flex items-center gap-3 rounded-[16px] bg-amber/8 border border-amber/20 px-5 py-3.5 mb-7">
                <span className="text-[20px]">📅</span>
                <div>
                  <p className="text-[14px] font-semibold text-text">
                    Reservation required
                  </p>
                  <p className="text-[13px] text-text2">
                    Book a table in advance to guarantee your spot
                  </p>
                </div>
              </div>
            )}

            {/* Description */}
            {listing.description && (
              <>
                <div className="mb-7">
                  <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-4">
                    About this restaurant
                  </h2>
                  <PortableTextRenderer
                    value={listing.description}
                    className="max-w-none"
                  />
                </div>
                <hr className="border-border mb-7" />
              </>
            )}

            {/* ── Menu placeholder ────────────── */}
            <div className="mb-7">
              <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-4">
                Menu
              </h2>
              <div className="rounded-[20px] border border-dashed border-border bg-surface/30 p-8 text-center">
                <UtensilsCrossed className="size-10 text-text3 mx-auto mb-3" />
                <p className="text-[15px] font-semibold text-text mb-1">
                  Menu coming soon
                </p>
                <p className="text-[13px] text-text2 max-w-[320px] mx-auto">
                  We&apos;re working with the restaurant to bring you the full
                  menu. In the meantime, contact them directly for details.
                </p>
              </div>
            </div>

            <AmenitiesList
              amenities={amenities}
              heading="What this restaurant offers"
            />
          </div>

          {/* Right column */}
          <BookingSidebar
            listingId={listing._id}
            listingTitle={listing.title}
            listingType={sanityType}
            price={listing.price ?? 0}
            priceUnit={listing.priceUnit ?? "person"}
          />
        </div>

        <SimilarListings listings={similarCards} typeLabel={typeLabel} />
      </article>

      <MobileBookingBar
        type={sanityType}
        price={listing.price ?? 0}
        priceUnit={listing.priceUnit ?? "person"}
        listingId={listing._id}
        listingTitle={listing.title}
        cuisine={cuisine}
        priceRange={listing.priceRange}
      />
    </>
  );
}

export { RestaurantDetail };
export type { RestaurantDetailProps };
