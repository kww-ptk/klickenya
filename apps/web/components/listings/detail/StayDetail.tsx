"use client";

import { useState, useCallback, useRef } from "react";
import { Star, MapPin } from "lucide-react";
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
import { StayBookingSidebar } from "@/components/listings/widgets/StayBookingSidebar";
import { RentingToggle } from "../widgets/RentingToggle";
import type { ListingCardProps } from "@/components/listings/ListingCard";

/* ── Types ─────────────────────────────────────────── */

interface StayDetailProps {
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
  roomAvailability?: Record<string, boolean>;
  roomPriceOverrides?: Record<string, number>;
  entirePropertyAvailable?: boolean;
  recentBookings?: number;
  hasPms?: boolean;
}

/* ── Component ─────────────────────────────────────── */

function StayDetail({
  listing,
  photos,
  urlType,
  typeLabel,
  singularLabel,
  sanityType,
  cityName,
  citySlug,
  similarCards,
  roomAvailability,
  roomPriceOverrides,
  entirePropertyAvailable,
  recentBookings,
  hasPms,
}: StayDetailProps) {
  const [rentMode, setRentMode] = useState<"entire" | "room">("entire");
  const [liveRoomAvail, setLiveRoomAvail] = useState<Record<string, boolean> | undefined>(undefined);
  const [livePrices, setLivePrices] = useState<Record<string, number> | undefined>(undefined);
  const [liveEntireAvail, setLiveEntireAvail] = useState<boolean | undefined>(undefined);
  const [checkingDates, setCheckingDates] = useState(false);
  const fetchRef = useRef(0);

  // Room card → open booking modal with pre-selected room
  const [bookingRoomKey, setBookingRoomKey] = useState<string | null>(null);

  const listingSlug = listing.slug?.current ?? "";

  // Callback when sidebar availability check completes
  const handleAvailabilityChecked = useCallback(
    (roomAvail: Record<string, boolean>, roomPrices: Record<string, number>, entireAvail: boolean) => {
      setLiveRoomAvail(roomAvail);
      setLivePrices(roomPrices);
      setLiveEntireAvail(entireAvail);
    },
    []
  );

  // Live availability check when guest picks dates (from contact form)
  const handleDatesChange = useCallback(
    async (checkIn: string, checkOut: string) => {
      if (!listingSlug) return;
      const fetchId = ++fetchRef.current;
      setCheckingDates(true);

      try {
        const res = await fetch(
          `/api/properties/availability-by-slug?slug=${listingSlug}&check_in=${checkIn}&check_out=${checkOut}`
        );
        const data = await res.json();
        if (fetchRef.current !== fetchId) return; // stale

        if (data.rooms) {
          const avail: Record<string, boolean> = {};
          const prices: Record<string, number> = {};
          for (const [key, val] of Object.entries(data.rooms as Record<string, { available: boolean; price: number }>)) {
            avail[key] = val.available;
            prices[key] = val.price;
          }
          setLiveRoomAvail(avail);
          setLivePrices(prices);
          setLiveEntireAvail(data.entireProperty);
        }
      } catch {
        // silent — keep server-side values
      }
      if (fetchRef.current === fetchId) setCheckingDates(false);
    },
    [listingSlug]
  );

  // Use live values if available, otherwise server-side
  const activeRoomAvail = liveRoomAvail ?? roomAvailability;
  const activePrices = livePrices ?? roomPriceOverrides;
  const activeEntireAvail = liveEntireAvail ?? entirePropertyAvailable;

  const highlights = listing.highlights ?? [];
  const amenities: string[] = listing.amenities ?? [];
  const hostName = listing.hostRef?.name ?? listing.hostName ?? "Klickenya";
  const tags: string[] = listing.tags ?? [];

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
              <span className="inline-block rounded-full bg-amber/15 text-amber px-3 py-1 text-[12px] font-bold uppercase tracking-wide">
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
              {listing.maxGuests && (
                <span>Up to {listing.maxGuests} guests</span>
              )}
            </div>

            <HostBadge hostName={hostName} hostRef={listing.hostRef} isVerified={listing.isVerified} listingSlug={listing.slug?.current} />
            <hr className="border-border mb-7" />

            <HighlightsGrid highlights={highlights} />

            <RentingToggle
              rentingType={listing.rentingType ?? "entire_place"}
              pricePerNight={listing.price}
              rooms={listing.rooms}
              listingTitle={listing.title}
              onModeChange={(mode) => setRentMode(mode)}
              roomAvailability={activeRoomAvail}
              roomPriceOverrides={activePrices}
              entirePropertyAvailable={activeEntireAvail}
              listingSlug={hasPms ? listingSlug : undefined}
              onRoomBooking={hasPms ? (roomKey: string) => setBookingRoomKey(roomKey) : undefined}
              onEntireBooking={hasPms ? () => setBookingRoomKey("__entire__") : undefined}
            />
            {checkingDates && (
              <p className="text-[12px] text-text3 mt-2 animate-pulse">Checking availability...</p>
            )}

            {/* Description */}
            {listing.description && (
              <>
                <hr className="border-border mb-7 mt-8" />
                <div className="mb-7">
                  <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-4">
                    About this stay
                  </h2>
                  <PortableTextRenderer
                    value={listing.description}
                    className="max-w-none"
                  />
                </div>
                <hr className="border-border mb-7" />
              </>
            )}

            <AmenitiesList amenities={amenities} heading="What this place offers" />

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mb-7">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block rounded-full bg-surface px-3 py-1 text-[12.5px] text-text2"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — Booking sidebar */}
          {hasPms ? (
            <aside className="hidden lg:block w-[350px] shrink-0">
              <div className="sticky top-[76px] border border-border rounded-[24px] shadow-lg p-5 bg-white max-h-[calc(100vh-92px)] overflow-y-auto scrollbar-none">
                <StayBookingSidebar
                  listingSlug={listingSlug}
                  listingTitle={listing.title}
                  listingId={listing._id}
                  price={listing.price ?? 0}
                  priceUnit={listing.priceUnit ?? "night"}
                  maxGuests={listing.maxGuests}
                  rooms={listing.rooms}
                  avgRating={listing.avgRating}
                  reviewCount={listing.reviewCount}
                  isVerified={listing.isVerified}
                  recentBookings={recentBookings}
                  onAvailabilityChecked={handleAvailabilityChecked}
                  openForRoom={bookingRoomKey}
                  onOpenForRoomHandled={() => setBookingRoomKey(null)}
                  bookingMode="enquiry"
                  listingPhoto={photos[0]}
                />
              </div>
            </aside>
          ) : (
            <BookingSidebar
              listingId={listing._id}
              listingTitle={listing.title}
              listingType={sanityType}
              price={listing.price ?? 0}
              priceUnit={listing.priceUnit ?? "night"}
              maxGuests={listing.maxGuests}
            />
          )}
        </div>

        {!hasPms && (
          <MobileBookingBar
            type={sanityType}
            price={listing.price ?? 0}
            priceUnit={listing.priceUnit ?? "night"}
            listingId={listing._id}
            listingTitle={listing.title}
            maxGuests={listing.maxGuests}
            onDatesChange={handleDatesChange}
          />
        )}

        <SimilarListings listings={similarCards} typeLabel={typeLabel} />
      </article>
    </>
  );
}

export { StayDetail };
export type { StayDetailProps };
