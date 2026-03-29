import Image from "next/image";
import Link from "next/link";
import { Star, MapPin, CalendarDays, Clock, Users, ExternalLink } from "lucide-react";
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

interface TicketType {
  _key: string;
  name: string;
  price: number;
  description?: string;
  available?: number;
  isSoldOut?: boolean;
}

interface Performer {
  _key: string;
  name: string;
  role?: string;
  image?: { asset?: { url?: string } };
  bio?: string;
}

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
  const hostName = listing.hostRef?.name ?? listing.hostName ?? "Klickenya";
  const ticketTypes: TicketType[] = listing.ticketTypes ?? [];
  const performers: Performer[] = listing.performers ?? [];
  const isFree = listing.isFree === true;
  const isRecurring = listing.isRecurring === true;
  const recurrenceRule: string | null = listing.recurrenceRule ?? null;
  const venue: string | null = listing.venue ?? null;
  const venueAddress: string | null = listing.venueAddress ?? null;
  const doorsOpen: string | null = listing.doorsOpen ?? null;
  const ageRestriction: string | null = listing.ageRestriction ?? null;
  const organizer: string | null = listing.organizer ?? null;
  const organizerSlug: string | null = listing.organizerSlug ?? null;
  const ticketLink: string | null = listing.ticketLink ?? null;
  const priceFrom: number | null = listing.priceFrom ?? listing.price ?? null;
  const mobilePrice = isFree ? 0 : (priceFrom ?? 0);

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
            {/* Type badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-block rounded-full bg-purple-600/15 text-purple-700 px-3 py-1 text-[12px] font-bold uppercase tracking-wide">
                {singularLabel}
              </span>
              {listing.subcategory && (
                <span className="inline-block rounded-full bg-surface px-3 py-1 text-[12px] font-semibold text-text2 capitalize">
                  {listing.subcategory.replace(/_/g, " ")}
                </span>
              )}
              {isFree && (
                <span className="inline-block rounded-full bg-emerald-500/15 text-emerald-700 px-3 py-1 text-[12px] font-bold uppercase tracking-wide">
                  Free
                </span>
              )}
              {ageRestriction && ageRestriction !== "all-ages" && (
                <span className="inline-block rounded-full bg-red-500/15 text-red-700 px-3 py-1 text-[12px] font-bold uppercase tracking-wide">
                  {ageRestriction}
                </span>
              )}
              {isRecurring && recurrenceRule && (
                <span className="inline-block rounded-full bg-amber-500/15 text-amber-700 px-3 py-1 text-[12px] font-bold tracking-wide">
                  {recurrenceRule}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-display text-[clamp(28px,3.5vw,42px)] font-extrabold tracking-[-0.03em] text-dark leading-[1.1] mb-4">
              {listing.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14.5px] text-text2 mb-6">
              {listing.avgRating != null && (
                <span className="flex items-center gap-1">
                  <Star className="size-4 fill-amber text-amber" />
                  <span className="font-semibold text-text">{listing.avgRating}</span>
                  {listing.reviewCount != null && (
                    <span className="text-text2">({listing.reviewCount})</span>
                  )}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="size-4 text-text3" />
                {venue ? `${venue}, ${cityName}` : cityName}
                {listing.county ? `, ${listing.county}` : ""}
              </span>
            </div>

            {/* ── Venue details ──────────────────── */}
            {(venue || venueAddress || doorsOpen) && (
              <div className="rounded-[20px] border border-border bg-surface/30 p-5 mb-7">
                {venue && (
                  <p className="text-[15px] font-semibold text-text mb-1">{venue}</p>
                )}
                {venueAddress && (
                  <p className="text-[13px] text-text2 mb-2">{venueAddress}</p>
                )}
                {doorsOpen && (
                  <div className="flex items-center gap-2 text-[13px] text-text2">
                    <Clock className="size-3.5" />
                    <span>Doors open at {doorsOpen}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Countdown / Recurrence card ──── */}
            <div className="rounded-[20px] border border-purple-200 bg-purple-50/50 p-5 mb-7">
              <div className="flex items-center gap-3 mb-2">
                <CalendarDays className="size-5 text-purple-600" />
                <h3 className="text-[15px] font-semibold text-text">When</h3>
              </div>
              {isRecurring && recurrenceRule ? (
                <div>
                  <p className="text-[18px] font-bold text-purple-700 mb-1">
                    {recurrenceRule}
                  </p>
                  <p className="text-[13px] text-text2">
                    Recurring event — check the description for exact times
                  </p>
                </div>
              ) : (
                <EventCountdown />
              )}
            </div>

            {/* ── Organizer ─────────────────────── */}
            {organizer && (
              <div className="flex items-center gap-3 mb-4">
                <Users className="size-4 text-text3 shrink-0" />
                <p className="text-[14px] text-text2">
                  Organised by{" "}
                  {organizerSlug ? (
                    <Link
                      href={`/hosts/${organizerSlug}`}
                      className="font-semibold text-text hover:text-amber-600 transition-colors"
                    >
                      {organizer}
                    </Link>
                  ) : (
                    <span className="font-semibold text-text">{organizer}</span>
                  )}
                </p>
              </div>
            )}

            <HostBadge hostName={hostName} hostRef={listing.hostRef} isVerified={listing.isVerified} listingSlug={listing.slug?.current} />
            <hr className="border-border mb-7" />

            {/* ── Ticket types ─────────────────── */}
            {!isFree && ticketTypes.length > 0 && (
              <>
                <div className="mb-7">
                  <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-4">
                    Tickets
                  </h2>
                  <div className="space-y-3">
                    {ticketTypes.map((ticket) => (
                      <div
                        key={ticket._key}
                        className={`rounded-[20px] border p-5 ${
                          ticket.isSoldOut
                            ? "border-border/50 bg-surface/30 opacity-60"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[15px] font-semibold text-text">
                                {ticket.name}
                              </p>
                              {ticket.isSoldOut && (
                                <span className="inline-block rounded-full bg-red-500/15 text-red-600 px-2 py-0.5 text-[10px] font-bold uppercase">
                                  Sold out
                                </span>
                              )}
                            </div>
                            {ticket.description && (
                              <p className="text-[13px] text-text2 mt-0.5">
                                {ticket.description}
                              </p>
                            )}
                            {ticket.available != null && !ticket.isSoldOut && (
                              <p className="text-[12px] text-text3 mt-1">
                                {ticket.available} remaining
                              </p>
                            )}
                          </div>
                          <p className="text-[18px] font-bold text-dark whitespace-nowrap">
                            KSh {ticket.price.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <hr className="border-border mb-7" />
              </>
            )}

            {/* Fallback: single price if no ticketTypes */}
            {!isFree && ticketTypes.length === 0 && listing.price != null && (
              <>
                <div className="mb-7">
                  <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-4">
                    Tickets
                  </h2>
                  <div className="rounded-[20px] border border-border p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[15px] font-semibold text-text">General Admission</p>
                        <p className="text-[13px] text-text2">Standard entry</p>
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

            {/* External ticket link */}
            {ticketLink && ticketTypes.length === 0 && (
              <div className="mb-7">
                <a
                  href={ticketLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-600 text-white text-[14px] font-semibold hover:bg-purple-700 transition-colors"
                >
                  Get tickets externally
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            )}

            <HighlightsGrid highlights={highlights} />

            {/* ── Performers / Lineup ──────────── */}
            {performers.length > 0 && (
              <>
                <div className="mb-7">
                  <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-4">
                    Lineup
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {performers.map((p) => (
                      <div
                        key={p._key}
                        className="flex items-start gap-4 rounded-[16px] border border-border p-4"
                      >
                        {p.image?.asset?.url ? (
                          <Image
                            src={p.image.asset.url + "?w=80&h=80&fit=crop&auto=format&q=80"}
                            alt={p.name}
                            width={48}
                            height={48}
                            className="size-12 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="size-12 rounded-full bg-gradient-to-br from-purple-500 to-amber-400 flex items-center justify-center text-white text-[14px] font-bold shrink-0">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-text">{p.name}</p>
                          {p.role && (
                            <p className="text-[12px] text-purple-600 font-medium">{p.role}</p>
                          )}
                          {p.bio && (
                            <p className="text-[13px] text-text2 mt-1 line-clamp-2">{p.bio}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <hr className="border-border mb-7" />
              </>
            )}

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
            price={mobilePrice}
            priceUnit={listing.priceUnit ?? "ticket"}
          />
        </div>

        <SimilarListings listings={similarCards} typeLabel={typeLabel} />
      </article>

      <MobileBookingBar
        type={sanityType}
        price={mobilePrice}
        priceUnit={listing.priceUnit ?? "ticket"}
        listingId={listing._id}
        listingTitle={listing.title}
      />
    </>
  );
}

export { EventDetail };
export type { EventDetailProps };
