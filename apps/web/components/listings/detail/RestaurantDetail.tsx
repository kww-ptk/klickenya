import Image from "next/image";
import { Star, MapPin, Clock } from "lucide-react";
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
import type { RestaurantArea } from "@/components/reservations/ReservationSheet";
import { OpenNowBadge } from "./restaurant/OpenNowBadge";
import { MenuDisplay } from "./restaurant/MenuDisplay";
import type { MenuData } from "./restaurant/MenuDisplay";
import type { ListingCardProps } from "@/components/listings/ListingCard";

/* ── Types ─────────────────────────────────────────── */

export interface ReservationsConfig {
  enabled: boolean;
  menuId: string;
  menuName: string;
  leadTimeHours: number;
  maxPartySize: number;
  maxAdvanceDays: number;
  durationMinutes: number;
  areas: RestaurantArea[];
  restaurantPhone: string | null;
  timeWindows: Array<{ open_time: string; close_time: string; is_active: boolean }>;
}

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
  menuData?: MenuData | null;
  reservationsConfig?: ReservationsConfig | null;
}

/* ── Helpers ───────────────────────────────────────── */

function formatPrice(n: number): string {
  return `KSh ${n.toLocaleString("en-KE")}`;
}

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
  menuData,
  reservationsConfig,
}: RestaurantDetailProps) {
  const highlights = listing.highlights ?? [];
  const amenities: string[] = listing.amenities ?? [];
  const hostName = listing.hostRef?.name ?? listing.hostName ?? "Klickenya";
  const cuisine: string[] = listing.cuisine ?? [];
  const priceInfo = PRICE_RANGE_MAP[listing.priceRange ?? ""] ?? null;

  // Featured items — collect across all sections, max 5, available only
  const featuredItems = menuData
    ? menuData.menu_sections
        .flatMap((s) => s.menu_items)
        .filter((i) => i.is_featured && i.is_available)
        .sort((a, b) => a.display_order - b.display_order)
        .slice(0, 5)
    : [];

  // "Order from your table" badge — only show during likely operating hours
  // (07:00–23:00 Africa/Nairobi). If no opening hours are set, always show.
  const hourEAT = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Nairobi",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
    10
  );
  const isWithinOperatingHours = hourEAT >= 7 && hourEAT < 23;
  const showOrderBadge =
    !!menuData?.table_ordering &&
    (!listing.openingHours || isWithinOperatingHours);

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

            {/* ── Menu ────────────────────────── */}
            <div id="menu-section" className="mb-7 scroll-mt-20">
              <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-4">
                Menu
              </h2>

              {/* View full menu + table ordering badges */}
              {menuData && (
                <>
                  <style>{`
                    @keyframes menuPulse {
                      0%, 100% { opacity: 1; }
                      50%       { opacity: 0.4; }
                    }
                    .menu-pulse-dot {
                      animation: menuPulse 2s ease-in-out infinite;
                    }
                    @media (prefers-reduced-motion: reduce) {
                      .menu-pulse-dot { animation: none; }
                    }
                  `}</style>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <a
                      href={`/m/${menuData.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[13px] font-medium transition-colors hover:bg-amber/5"
                      style={{ borderColor: "#E8A020", color: "#E8A020", borderWidth: "1.5px" }}
                    >
                      <span
                        className="menu-pulse-dot shrink-0 rounded-full"
                        style={{ width: 6, height: 6, background: "#E8A020", display: "inline-block" }}
                      />
                      View full menu →
                    </a>

                    {showOrderBadge && (
                      <span
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[13px] font-medium"
                        style={{
                          background: "rgba(22,163,74,0.08)",
                          border: "1.5px solid rgba(22,163,74,0.35)",
                          color: "#16A34A",
                        }}
                      >
                        <span
                          className="menu-pulse-dot shrink-0 rounded-full"
                          style={{ width: 6, height: 6, background: "#16A34A", display: "inline-block" }}
                        />
                        Order from your table
                      </span>
                    )}
                  </div>

                  {/* Featured dishes */}
                  {featuredItems.length > 0 && (
                    <div className="mb-5">
                      <h3 className="font-display text-[16px] font-bold text-dark mb-3">
                        Featured dishes
                      </h3>
                      <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible">
                        {featuredItems.map((item) => (
                          <div
                            key={item.id}
                            className="shrink-0 w-[155px] md:w-auto rounded-xl border border-border overflow-hidden bg-white"
                          >
                            {/* Photo / letter placeholder */}
                            <div className="relative w-full aspect-[4/3] bg-amber/10">
                              {item.photo_url ? (
                                <Image
                                  src={item.photo_url}
                                  alt={item.name}
                                  fill
                                  className="object-cover"
                                  sizes="(min-width: 768px) 220px, 155px"
                                />
                              ) : (
                                <span className="absolute inset-0 flex items-center justify-center text-amber font-bold text-[24px]">
                                  {item.name[0]}
                                </span>
                              )}
                              <span className="absolute top-1.5 left-1.5 bg-amber text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                ★
                              </span>
                            </div>
                            <div className="p-2.5">
                              <p className="text-[13px] font-bold text-dark leading-snug">{item.name}</p>
                              <p className="text-[12px] font-semibold text-amber mt-0.5">
                                {formatPrice(item.price_kes)}
                              </p>
                              {item.description && (
                                <p className="text-[11px] text-text3 mt-0.5 line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <MenuDisplay menuData={menuData ?? null} />
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
            reservationsConfig={reservationsConfig ?? null}
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
        menuSlug={menuData?.slug}
        reservationsConfig={reservationsConfig ?? null}
      />
    </>
  );
}

export { RestaurantDetail };
export type { RestaurantDetailProps };
