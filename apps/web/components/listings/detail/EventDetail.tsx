import Image from "next/image";
import Link from "next/link";
import { Star, MapPin, CalendarDays, Clock, Users, ExternalLink } from "lucide-react";
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
import { WhosJoining } from "@/components/events/WhosJoining";
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
  attendeeCount?: number;
  attendees?: { name: string }[];
}

/* ── Helpers ───────────────────────────────────────── */

/**
 * Format a stored event datetime for display.
 *
 * Events are created from a `datetime-local` input and stored via
 * `new Date(value).toISOString()` on a UTC runtime, so the wall-clock time the
 * host entered is preserved as UTC (no offset conversion happens). We read it
 * back as UTC so every viewer sees exactly the date/time the host typed,
 * regardless of their own browser timezone. Returns null for a missing or
 * unparseable value so the caller can fall back to "Date to be announced".
 */
function formatEventDateTime(
  iso: string | null | undefined,
): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
    time: d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }),
  };
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
  attendeeCount = 0,
  attendees = [],
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
  const schedule: { day: string; startTime: string; endTime?: string }[] = listing.schedule ?? [];
  const organizer: string | null = listing.organizer ?? null;
  const organizerSlug: string | null = listing.organizerSlug ?? listing.hostRef?.slug ?? null;
  const ticketLink: string | null = listing.ticketLink ?? null;
  const priceFrom: number | null = listing.priceFrom ?? listing.price ?? null;
  const mobilePrice = isFree ? 0 : (priceFrom ?? 0);
  const showBookingSidebar = !isFree && (ticketTypes.length > 0 || listing.price != null);

  // One-off (non-recurring) event date/time. Null when unset → "Date to be announced".
  const startFmt = formatEventDateTime(listing.eventDate);
  const endFmt = formatEventDateTime(listing.eventEndDate);
  const endSameDay = startFmt != null && endFmt != null && startFmt.date === endFmt.date;

  const DAY_LABELS: Record<string, string> = {
    monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
    thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
  };

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

        {/* ── Two-column layout — starts right after photo ── */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
          {/* Left column */}
          <div className="flex-1 min-w-0">

            {/* Badges */}
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

            {/* ── Where + When cards ──────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
              {/* Venue card */}
              <div className="rounded-[20px] border border-border bg-white p-5">
                <div className="flex items-center gap-3 mb-3">
                  <MapPin className="size-5 text-purple-600" />
                  <h3 className="text-[15px] font-semibold text-text">Where</h3>
                </div>
                {venue ? (
                  <>
                    <p className="text-[16px] font-bold text-text mb-1">{venue}</p>
                    {venueAddress && (
                      <p className="text-[13px] text-text2">{venueAddress}</p>
                    )}
                  </>
                ) : (
                  <p className="text-[14px] text-text2">{cityName}{listing.county ? `, ${listing.county}` : ""}</p>
                )}
                {doorsOpen && (
                  <div className="flex items-center gap-2 text-[13px] text-text2 mt-3 pt-3 border-t border-border">
                    <Clock className="size-3.5 shrink-0" />
                    <span>Doors open at {doorsOpen}</span>
                  </div>
                )}
              </div>

              {/* When card */}
              <div className="rounded-[20px] border border-purple-200 bg-purple-50/50 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <CalendarDays className="size-5 text-purple-600" />
                  <h3 className="text-[15px] font-semibold text-text">When</h3>
                </div>
                {isRecurring ? (
                  <div>
                    {recurrenceRule && (
                      <p className="text-[16px] font-bold text-purple-700 mb-2">
                        {recurrenceRule}
                      </p>
                    )}
                    {schedule.length > 0 ? (
                      <div className="space-y-1.5">
                        {schedule.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 text-[13px]">
                            <span className="font-semibold text-text w-24">{DAY_LABELS[s.day] ?? s.day}</span>
                            <span className="text-text2">{s.startTime}{s.endTime ? ` — ${s.endTime}` : ""}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] text-text2">
                        Recurring event — check the description for exact times
                      </p>
                    )}
                  </div>
                ) : startFmt ? (
                  <div>
                    <p className="text-[16px] font-bold text-purple-700 mb-1">
                      {startFmt.date}
                    </p>
                    <div className="flex items-center gap-2 text-[14px] text-text2">
                      <Clock className="size-3.5 shrink-0" />
                      <span>
                        {startFmt.time}
                        {endFmt
                          ? ` — ${endSameDay ? endFmt.time : `${endFmt.date}, ${endFmt.time}`}`
                          : ""}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[16px] font-semibold text-purple-700 mb-1">
                      Date to be announced
                    </p>
                    <p className="text-[13px] text-text2">
                      Check the description below or contact the organiser for exact dates
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Organizer */}
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

          {/* Right column — always visible */}
          <aside className="hidden lg:block w-[350px] shrink-0">
            <div className="sticky top-[76px] space-y-6">
              {/* Ticket CTA for paid events */}
              {showBookingSidebar && (
                <div className="border border-border rounded-[24px] shadow-lg p-6 bg-white">
                  <p className="text-[22px] font-bold text-dark mb-1">
                    From KSh {mobilePrice.toLocaleString()}
                  </p>
                  <p className="text-[13px] text-text2 mb-4">per {listing.priceUnit ?? "ticket"}</p>
                  {ticketLink ? (
                    <a
                      href={ticketLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-3 rounded-xl bg-purple-600 text-white font-semibold text-[14px] text-center hover:bg-purple-700 transition-colors"
                    >
                      Get tickets
                    </a>
                  ) : (
                    <Link
                      href="#tickets"
                      className="block w-full py-3 rounded-xl bg-purple-600 text-white font-semibold text-[14px] text-center hover:bg-purple-700 transition-colors"
                    >
                      View tickets
                    </Link>
                  )}
                </div>
              )}

              {/* Free event badge */}
              {isFree && (
                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-6 text-center">
                  <p className="text-[22px] font-bold text-emerald-700 mb-1">Free event</p>
                  <p className="text-[13px] text-emerald-600">No ticket required — just show up!</p>
                </div>
              )}

              {/* Related events in city */}
              <div className="rounded-[24px] border border-border bg-white p-5">
                <h3 className="text-[15px] font-bold text-text mb-4">
                  {similarCards.length > 0 ? `More events in ${cityName}` : "Discover events"}
                </h3>

                {similarCards.length > 0 ? (
                  <div className="space-y-4">
                    {similarCards.slice(0, 3).map((card) => (
                      <Link
                        key={card.id}
                        href={card.href}
                        className="flex gap-3 group"
                      >
                        {card.photos[0] ? (
                          <div className="shrink-0 w-16 h-12 rounded-xl overflow-hidden relative">
                            <Image
                              src={card.photos[0]}
                              alt={card.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        ) : (
                          <div className="shrink-0 w-16 h-12 rounded-xl bg-surface flex items-center justify-center text-[18px]">
                            🎟️
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-text line-clamp-2 group-hover:text-purple-600 transition-colors leading-snug">
                            {card.title}
                          </p>
                          <p className="text-[11px] text-text2 mt-0.5">
                            {card.city}
                            {card.price != null && card.price > 0 ? ` · KSh ${card.price.toLocaleString()}` : " · Free"}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-text2 mb-3">
                    Check out more events happening across Kenya — parties, workshops, festivals and more.
                  </p>
                )}

                <Link
                  href={similarCards.length > 0 ? `/events?city=${citySlug}` : "/events-in-kenya"}
                  className="block mt-4 pt-3 border-t border-border text-center text-[13px] font-semibold text-purple-600 hover:text-purple-700 transition-colors"
                >
                  {similarCards.length > 0 ? `See all events in ${cityName} →` : "Browse all events →"}
                </Link>
              </div>

              {/* Who's joining */}
              <WhosJoining
                eventSanityId={listing._id}
                eventTitle={listing.title}
                initialCount={attendeeCount}
                attendees={attendees}
              />
            </div>
          </aside>
        </div>

        <SimilarListings listings={similarCards} typeLabel={typeLabel} />
      </article>

      {/* Mobile booking bar — only for paid events */}
      {showBookingSidebar && (
        <MobileBookingBar
          type={sanityType}
          price={mobilePrice}
          priceUnit={listing.priceUnit ?? "ticket"}
          listingId={listing._id}
          listingTitle={listing.title}
        />
      )}
    </>
  );
}

export { EventDetail };
export type { EventDetailProps };
