import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { sanityClient } from "@/lib/sanity/client";
import { HOST_BY_SLUG_QUERY } from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { ListingGrid } from "@/components/listings/ListingGrid";
import { ProfileHero } from "@/components/profiles/ProfileHero";
import { EventCard } from "@/components/home/EventCard";
import { mapSanityEventToCard } from "@/lib/mappers/eventMapper";
import type { ListingCardProps } from "@/components/listings/ListingCard";

/* ---------- Types ---------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HostData = any;

/* ---------- Helpers ---------- */

const TYPE_SLUG_MAP: Record<string, string> = {
  stay: "stays",
  experience: "experiences",
  event: "events",
  rental: "rentals",
  service: "services",
  restaurant: "restaurants",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapListingToCard(listing: any): ListingCardProps {
  const slug = typeof listing.slug === "string" ? listing.slug : listing.slug?.current ?? "";
  const citySlug = (listing.city ?? "").toLowerCase().replace(/\s+/g, "-");
  const typeSlug = TYPE_SLUG_MAP[listing.type] ?? listing.type + "s";
  const photoUrl = listing.coverPhoto
    ? urlForImage(listing.coverPhoto).width(800).url()
    : "";

  return {
    id: listing._id,
    title: listing.title ?? "Untitled",
    city: listing.city ?? "",
    price: listing.price ?? null,
    priceUnit: listing.priceUnit ?? "night",
    priceRange: listing.priceRange,
    rating: listing.avgRating,
    reviewCount: listing.reviewCount,
    type: listing.type as ListingCardProps["type"],
    subcategory: listing.subcategory,
    openingHours: listing.openingHours,
    isVerified: listing.isVerified ?? false,
    hostName: listing.hostRef?.name ?? listing.hostName,
    hostPhotoUrl: listing.hostRef?.photo?.asset?.url,
    hostSlug: listing.hostRef?.slug,
    photos: photoUrl ? [photoUrl] : [],
    href: `/${typeSlug}/${citySlug}/${slug}`,
  };
}

/* ---------- Metadata ---------- */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const host: HostData | null = await sanityClient.fetch(HOST_BY_SLUG_QUERY, { slug });

  if (!host) return { title: "Host not found" };

  return {
    title: `${host.name} — Klickenya Host`,
    description: host.bio ?? `${host.name} is a verified host on Klickenya, Kenya's all-in-one booking platform.`,
  };
}

/* ---------- Page ---------- */

export default async function HostProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const host: HostData | null = await sanityClient.fetch(HOST_BY_SLUG_QUERY, { slug });

  if (!host) notFound();

  // Split listings from events
  const verifiedListings = (host.listings ?? []).filter(
    (l: any) => l.isVerified && l.type !== "event"
  );
  const cards = verifiedListings.map(mapListingToCard);

  // Events from the dedicated events projection
  const hostEvents = (host.events ?? []) as any[];
  const eventCards = hostEvents.map(mapSanityEventToCard);

  const memberSince = host.createdAt
    ? new Date(host.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : undefined;

  const totalCount = verifiedListings.length + hostEvents.length;

  return (
    <div className="min-h-screen bg-canvas">
      <ProfileHero
        name={host.name}
        photo={host.photo}
        bio={host.bio}
        website={host.website}
        instagram={host.instagram}
        facebook={host.facebook}
        badgeLabel={host.planTier ?? "basic"}
        badgeColor="amber"
        verified={host.verified}
        memberSince={memberSince}
        stats={[
          { label: "Listings", value: totalCount },
          { label: "Events", value: hostEvents.length },
        ]}
      />

      {/* ── Content ── */}
      <div className="max-w-5xl mx-auto px-5 py-8">

        {/* ── Events section ── */}
        {eventCards.length > 0 && (
          <section className="mb-12">
            <div className="mb-5">
              <h2 className="font-display text-[20px] font-bold text-dark tracking-[-0.02em]">
                Events by {host.name}
              </h2>
              <p className="text-[14px] text-text3 mt-1">
                Upcoming events, parties and experiences organised by {host.name}
              </p>
            </div>

            <div className="flex gap-5 overflow-x-auto scrollbar-none pb-4 -mx-5 px-5 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 [&>a]:w-auto">
              {eventCards.map((event, i) => (
                <EventCard key={i} {...event} />
              ))}
            </div>
          </section>
        )}

        {/* ── Listings section ── */}
        <section className="mb-12">
          <h2 className="font-display text-[20px] font-bold text-dark tracking-[-0.02em] mb-5">
            Listings by {host.name}
          </h2>

          {cards.length > 0 ? (
            <ListingGrid listings={cards} />
          ) : (
            <div className="bg-white rounded-2xl border border-border p-10 text-center shadow-sm">
              <p className="text-[15px] font-semibold text-dark mb-1">
                No verified listings yet
              </p>
              <p className="text-[13px] text-text3">
                Listings will appear here once verified.
              </p>
            </div>
          )}
        </section>

        {/* Reviews placeholder */}
        <section>
          <h2 className="font-display text-[20px] font-bold text-dark tracking-[-0.02em] mb-4">
            Reviews
          </h2>
          <div className="bg-white rounded-2xl border border-border p-8 text-center shadow-sm">
            <p className="text-[14px] text-text3">
              Reviews coming soon
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
