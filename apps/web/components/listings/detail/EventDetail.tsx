import { Star, MapPin, CalendarDays, Music } from "lucide-react";
import { PortableTextRenderer } from "@/components/blog/PortableTextRenderer";
import { PhotoGallery } from "@/components/listings/widgets/PhotoGallery";
import { Breadcrumb } from "@/components/listings/widgets/Breadcrumb";
import { HighlightsGrid } from "@/components/listings/widgets/HighlightsGrid";
import { AmenitiesList } from "@/components/listings/widgets/AmenitiesList";
import { HostBadge } from "@/components/listings/widgets/HostBadge";
import { SimilarListings } from "@/components/listings/widgets/SimilarListings";
import { BookingSidebar } from "@/components/listings/widgets/BookingSidebar";
import { MobileBookingBar } from "@/components/listings/widgets/MobileBookingBar";
import { EventCountdown } from "./event/EventCountdown";
import type { ListingCardProps } from "@/components/listings/ListingCard";

/* ── Types ─────────────────────────────────────────── */

interface EventDetailProps {
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

/** Detect recurring events from tags like "friday", "saturday", etc. */
const DAY_TAGS: Record<string, string> = {
  monday: "Every Monday",
  tuesday: "Every Tuesday",
  wednesday: "Every Wednesday",
  thursday: "Every Thursday",
  friday: "Every Friday",
  saturday: "Every Saturday",
  sunday: "Every Sunday",
};

function inferRecurrence(tags: string[]): string | null {
  for (const tag of tags) {
    if (DAY_TAGS[tag]) return DAY_TAGS[tag];
  }
  return null;
}

/* ── Component ─────────────────────────────────────── */

function EventDetail({
  listing,
  photos,
  urlType,
  typeLabel,
  singularLabel,
  sanityType,
  cityName,
  citySlug,
  similarCards,
}: EventDetailProps) {
  const highlights = listing.highlights ?? [];
  const amenities: string[] = listing.amenities ?? [];
  const hostName = listing.hostName || "Klickenya";
  const tags: string[] = listing.tags ?? [];
  const recurrence = inferRecurrence(tags);

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

        <PhotoGallery photos={photos} title={listing.title} />

        {/* ── Two-column layout ────────────── */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
          {/* Left column */}
          <div className="flex-1 min-w-0">
            {/* Type badge + date card */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-block rounded-full bg-purple-600/15 text-purple-700 px-3 py-1 text-[12px] font-bold uppercase tracking-wide">
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

            {/* ── Countdown / Recurrence card ──── */}
            <div className="rounded-[20px] border border-purple-200 bg-purple-50/50 p-5 mb-7">
              <div className="flex items-center gap-3 mb-2">
                <CalendarDays className="size-5 text-purple-600" />
                <h3 className="text-[15px] font-semibold text-text">
                  When
                </h3>
              </div>
              {recurrence ? (
                <div>
                  <p className="text-[18px] font-bold text-purple-700 mb-1">
                    {recurrence}
                  </p>
                  <p className="text-[13px] text-text2">
                    Recurring event — check the description for exact times
                  </p>
                </div>
              ) : (
                <EventCountdown />
              )}
            </div>

            <HostBadge hostName={hostName} isVerified={listing.isVerified} listingSlug={listing.slug?.current} />
            <hr className="border-border mb-7" />

            {/* ── Ticket types ─────────────────── */}
            {listing.price != null && (
              <>
                <div className="mb-7">
                  <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-4">
                    Tickets
                  </h2>
                  <div className="rounded-[20px] border border-border p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[15px] font-semibold text-text">
                          General Admission
                        </p>
                        <p className="text-[13px] text-text2">
                          Standard entry
                        </p>
                      </div>
                      <p className="text-[18px] font-bold text-dark">
                        KSh {(listing.price ?? 0).toLocaleString()}
                        <span className="text-[13px] font-normal text-text2">
                          {" "}/ {listing.priceUnit ?? "ticket"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                <hr className="border-border mb-7" />
              </>
            )}

            <HighlightsGrid highlights={highlights} />

            {/* ── Lineup / Schedule placeholder ── */}
            <div className="mb-7">
              <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-4">
                Lineup &amp; Schedule
              </h2>
              <div className="rounded-[20px] border border-dashed border-border bg-surface/30 p-8 text-center">
                <Music className="size-10 text-text3 mx-auto mb-3" />
                <p className="text-[15px] font-semibold text-text mb-1">
                  Schedule coming soon
                </p>
                <p className="text-[13px] text-text2 max-w-[320px] mx-auto">
                  The full lineup and schedule will be announced closer to the
                  event. Check back or contact the organiser.
                </p>
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <>
                <div className="mb-7">
                  <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-4">
                    About this event
                  </h2>
                  <PortableTextRenderer
                    value={listing.description}
                    className="max-w-none"
                  />
                </div>
                <hr className="border-border mb-7" />
              </>
            )}

            <AmenitiesList amenities={amenities} heading="What to expect" />
          </div>

          {/* Right column */}
          <BookingSidebar
            listingId={listing._id}
            listingTitle={listing.title}
            listingType={sanityType}
            price={listing.price ?? 0}
            priceUnit={listing.priceUnit ?? "ticket"}
          />
        </div>

        <SimilarListings listings={similarCards} typeLabel={typeLabel} />
      </article>

      <MobileBookingBar
        type={sanityType}
        price={listing.price ?? 0}
        priceUnit={listing.priceUnit ?? "ticket"}
        listingId={listing._id}
        listingTitle={listing.title}
      />
    </>
  );
}

export { EventDetail };
export type { EventDetailProps };
