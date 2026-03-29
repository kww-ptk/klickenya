import { Star, MapPin, Clock, Mountain, Users, CheckCircle2, XCircle } from "lucide-react";
import { PortableTextRenderer } from "@/components/blog/PortableTextRenderer";
import { PhotoGallery } from "@/components/listings/widgets/PhotoGallery";
import { Breadcrumb } from "@/components/listings/widgets/Breadcrumb";
import { HighlightsGrid } from "@/components/listings/widgets/HighlightsGrid";
import { AmenitiesList } from "@/components/listings/widgets/AmenitiesList";
import { HostBadge } from "@/components/listings/widgets/HostBadge";
import { SimilarListings } from "@/components/listings/widgets/SimilarListings";
import { BookingSidebar } from "@/components/listings/widgets/BookingSidebar";
import { MobileBookingBar } from "@/components/listings/widgets/MobileBookingBar";
import type { ListingCardProps } from "@/components/listings/ListingCard";

/* ── Types ─────────────────────────────────────────── */

interface ExperienceDetailProps {
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

/* ── Tag-based inference helpers ───────────────────── */

const DIFFICULTY_TAGS: Record<string, string> = {
  diving: "Advanced",
  climbing: "Advanced",
  "zip-line": "Moderate",
  hiking: "Moderate",
  surfing: "Moderate",
  kayaking: "Moderate",
  cycling: "Moderate",
  snorkelling: "Easy",
  walking: "Easy",
  birding: "Easy",
  "boat-safari": "Easy",
  "fly-in": "Easy",
};

const INCLUDED_ITEMS = [
  { tag: "breakfast-included", label: "Breakfast included" },
  { tag: "all-inclusive", label: "All-inclusive" },
  { tag: "full-board", label: "Full board" },
  { tag: "co-working", label: "Co-working space" },
];

const NOT_INCLUDED_DEFAULTS = [
  "Transport to/from meeting point",
  "Personal travel insurance",
  "Tips and gratuities",
];

function inferDifficulty(tags: string[]): string | null {
  for (const tag of tags) {
    if (DIFFICULTY_TAGS[tag]) return DIFFICULTY_TAGS[tag];
  }
  return null;
}

function inferDuration(tags: string[]): string | null {
  if (tags.includes("multi-day")) return "Multi-day";
  if (tags.includes("night-drive")) return "3–4 hours";
  if (tags.includes("game-drive") || tags.includes("fly-in")) return "Full day";
  if (tags.includes("hiking") || tags.includes("cycling")) return "Half day";
  if (tags.includes("walking") || tags.includes("birding")) return "2–3 hours";
  return null;
}

/* ── Component ─────────────────────────────────────── */

function ExperienceDetail({
  listing,
  photos,
  urlType,
  typeLabel,
  singularLabel,
  sanityType,
  cityName,
  citySlug,
  similarCards,
}: ExperienceDetailProps) {
  const highlights = listing.highlights ?? [];
  const amenities: string[] = listing.amenities ?? [];
  const hostName = listing.hostRef?.name ?? listing.hostName ?? "Klickenya";
  const tags: string[] = listing.tags ?? [];

  const difficulty = inferDifficulty(tags);
  const duration = inferDuration(tags);
  const includedItems = INCLUDED_ITEMS.filter((i) => tags.includes(i.tag));

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
            {/* Type badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block rounded-full bg-teal-600/15 text-teal-700 px-3 py-1 text-[12px] font-bold uppercase tracking-wide">
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

            <HostBadge hostName={hostName} hostRef={listing.hostRef} isVerified={listing.isVerified} listingSlug={listing.slug?.current} />
            <hr className="border-border mb-7" />

            {/* ── Duration / Difficulty / Group size ── */}
            {(duration || difficulty || listing.maxGuests) && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-7">
                  {duration && (
                    <div className="flex items-center gap-3 rounded-[16px] border border-border p-4">
                      <Clock className="size-5 text-teal-600 shrink-0" />
                      <div>
                        <p className="text-[12px] text-text2 uppercase tracking-wide font-semibold">
                          Duration
                        </p>
                        <p className="text-[14.5px] font-semibold text-text">
                          {duration}
                        </p>
                      </div>
                    </div>
                  )}
                  {difficulty && (
                    <div className="flex items-center gap-3 rounded-[16px] border border-border p-4">
                      <Mountain className="size-5 text-teal-600 shrink-0" />
                      <div>
                        <p className="text-[12px] text-text2 uppercase tracking-wide font-semibold">
                          Difficulty
                        </p>
                        <p className="text-[14.5px] font-semibold text-text">
                          {difficulty}
                        </p>
                      </div>
                    </div>
                  )}
                  {listing.maxGuests && (
                    <div className="flex items-center gap-3 rounded-[16px] border border-border p-4">
                      <Users className="size-5 text-teal-600 shrink-0" />
                      <div>
                        <p className="text-[12px] text-text2 uppercase tracking-wide font-semibold">
                          Group size
                        </p>
                        <p className="text-[14.5px] font-semibold text-text">
                          Up to {listing.maxGuests}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <hr className="border-border mb-7" />
              </>
            )}

            <HighlightsGrid highlights={highlights} />

            {/* ── What's included / Not included ── */}
            {includedItems.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-7">
                  {/* Included */}
                  <div>
                    <h3 className="text-[15px] font-semibold text-text mb-3">
                      What&apos;s included
                    </h3>
                    <ul className="space-y-2.5">
                      {includedItems.map((item) => (
                        <li
                          key={item.tag}
                          className="flex items-center gap-2.5 text-[14px] text-text2"
                        >
                          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                          {item.label}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Not included */}
                  <div>
                    <h3 className="text-[15px] font-semibold text-text mb-3">
                      Not included
                    </h3>
                    <ul className="space-y-2.5">
                      {NOT_INCLUDED_DEFAULTS.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-2.5 text-[14px] text-text2"
                        >
                          <XCircle className="size-4 text-red-400 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
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
                    About this experience
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
      />
    </>
  );
}

export { ExperienceDetail };
export type { ExperienceDetailProps };
