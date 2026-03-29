import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { sanityClient } from "@/lib/sanity/client";
import { HOST_BY_SLUG_QUERY } from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { ListingGrid } from "@/components/listings/ListingGrid";
import { ProfileHero } from "@/components/profiles/ProfileHero";
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

  const verifiedListings = (host.listings ?? []).filter((l: any) => l.isVerified);
  const cards = verifiedListings.map(mapListingToCard);

  const memberSince = host.createdAt
    ? new Date(host.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : undefined;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
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
          { label: "Listings", value: verifiedListings.length },
          { label: "Verified", value: verifiedListings.filter((l: any) => l.isVerified).length },
        ]}
      />

      {/* ── Content ── */}
      <div className="max-w-5xl mx-auto px-5 py-8">
        <h2 className="font-display text-[20px] font-bold text-[#16130C] tracking-[-0.02em] mb-5">
          Listings by {host.name}
        </h2>

        {cards.length > 0 ? (
          <ListingGrid listings={cards} />
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2DDD5] p-10 text-center shadow-sm mb-8">
            <p className="text-[15px] font-semibold text-[#16130C] mb-1">
              No verified listings yet
            </p>
            <p className="text-[13px] text-[#9C9485]">
              Listings will appear here once verified.
            </p>
          </div>
        )}

        {/* Reviews placeholder */}
        <div className="mt-10">
          <h2 className="font-display text-[20px] font-bold text-[#16130C] tracking-[-0.02em] mb-4">
            Reviews
          </h2>
          <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center shadow-sm">
            <p className="text-[14px] text-[#9C9485]">
              Reviews coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
