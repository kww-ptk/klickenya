import { Star, MapPin, BadgeCheck, MapPinned, Banknote } from "lucide-react";
import { PortableTextRenderer } from "@/components/blog/PortableTextRenderer";
import { PhotoGallery } from "@/components/listings/widgets/PhotoGallery";
import { Breadcrumb } from "@/components/listings/widgets/Breadcrumb";
import { HighlightsGrid } from "@/components/listings/widgets/HighlightsGrid";
import { AmenitiesList } from "@/components/listings/widgets/AmenitiesList";
import { TrackPageView } from "@/lib/analytics/TrackPageView";
import { SimilarListings } from "@/components/listings/widgets/SimilarListings";
import { BookingSidebar } from "@/components/listings/widgets/BookingSidebar";
import { MobileBookingBar } from "@/components/listings/widgets/MobileBookingBar";
import type { ListingCardProps } from "@/components/listings/ListingCard";

/* ── Types ─────────────────────────────────────────── */

interface ServiceDetailProps {
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

/* ── Component ─────────────────────────────────────── */

function ServiceDetail({
  listing,
  photos,
  urlType,
  typeLabel,
  singularLabel,
  sanityType,
  cityName,
  citySlug,
  similarCards,
}: ServiceDetailProps) {
  const highlights = listing.highlights ?? [];
  const amenities: string[] = listing.amenities ?? [];
  const hostName = listing.hostName || "Klickenya";

  const hostInitials = hostName
    .split(/\s+/)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
            {/* Type badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block rounded-full bg-emerald-600/15 text-emerald-700 px-3 py-1 text-[12px] font-bold uppercase tracking-wide">
                {singularLabel}
              </span>
              {listing.subcategory && (
                <span className="inline-block rounded-full bg-surface px-3 py-1 text-[12px] font-semibold text-text2 capitalize">
                  {listing.subcategory.replace(/_/g, " ")}
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
            </div>

            {/* ── Provider info card ──────────── */}
            <div className="flex items-center gap-4 rounded-[20px] border border-border bg-surface/50 p-5 mb-7">
              <div className="size-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[18px] font-bold shrink-0">
                {hostInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[16px] font-semibold text-text">
                    {hostName}
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    <BadgeCheck className="size-3" />
                    Verified
                  </span>
                </div>
                <p className="text-[13px] text-text2">
                  Service provider on Klickenya
                </p>
                {listing.address && (
                  <p className="text-[12.5px] text-text2 mt-1 truncate">
                    📍 {listing.address}
                  </p>
                )}
              </div>
            </div>

            <hr className="border-border mb-7" />

            <HighlightsGrid highlights={highlights} />

            {/* ── Pricing card ────────────────── */}
            {listing.price != null && (
              <>
                <div className="rounded-[20px] border border-border p-5 mb-7">
                  <div className="flex items-center gap-2 mb-4">
                    <Banknote className="size-5 text-emerald-600" />
                    <h3 className="text-[15px] font-semibold text-text">
                      Pricing
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-extrabold text-dark tracking-[-0.02em]">
                      KSh {(listing.price).toLocaleString()}
                    </span>
                    <span className="text-[14px] text-text2">
                      / {listing.priceUnit ?? "session"}
                    </span>
                  </div>
                  <p className="text-[13px] text-text2 mt-2">
                    Starting from. Final price may vary depending on scope and
                    requirements. Contact the provider for a detailed quote.
                  </p>
                </div>
                <hr className="border-border mb-7" />
              </>
            )}

            {/* ── Service area ─────────────────── */}
            <div className="rounded-[20px] border border-border bg-surface/50 p-5 mb-7">
              <div className="flex items-center gap-2 mb-3">
                <MapPinned className="size-5 text-emerald-600" />
                <h3 className="text-[15px] font-semibold text-text">
                  Service area
                </h3>
              </div>
              <p className="text-[14px] text-text2 leading-[1.6]">
                Serves{" "}
                <span className="font-semibold text-text">{cityName}</span>
                {listing.county ? (
                  <>
                    {" "}and surrounding areas in{" "}
                    <span className="font-semibold text-text">
                      {listing.county} County
                    </span>
                  </>
                ) : (
                  " and surrounding areas"
                )}
                . Contact the provider to confirm availability for your
                location.
              </p>
            </div>

            {/* Description */}
            {listing.description && (
              <>
                <div className="mb-7">
                  <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-4">
                    About this service
                  </h2>
                  <PortableTextRenderer
                    value={listing.description}
                    className="max-w-none"
                  />
                </div>
                <hr className="border-border mb-7" />
              </>
            )}

            <AmenitiesList
              amenities={amenities}
              heading="What's included"
            />
          </div>

          {/* Right column */}
          <BookingSidebar
            listingId={listing._id}
            listingTitle={listing.title}
            listingType={sanityType}
            price={listing.price ?? 0}
            priceUnit={listing.priceUnit ?? "session"}
          />
        </div>

        <MobileBookingBar
          type={sanityType}
          price={listing.price ?? 0}
          priceUnit={listing.priceUnit ?? "session"}
          listingId={listing._id}
          listingTitle={listing.title}
        />

        <SimilarListings listings={similarCards} typeLabel={typeLabel} />
      </article>
    </>
  );
}

export { ServiceDetail };
export type { ServiceDetailProps };
