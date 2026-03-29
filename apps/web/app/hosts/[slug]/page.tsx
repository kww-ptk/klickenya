import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { sanityClient } from "@/lib/sanity/client";
import { HOST_BY_SLUG_QUERY } from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { ListingGrid } from "@/components/listings/ListingGrid";
import type { ListingCardProps } from "@/components/listings/ListingCard";

/* ---------- Types ---------- */

interface HostData {
  _id: string;
  name: string;
  slug: { current: string };
  photo?: { asset?: { url?: string; _id?: string }; alt?: string; hotspot?: unknown; crop?: unknown };
  bio?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  planTier?: string;
  verified?: boolean;
  createdAt?: string;
  listings?: Array<{
    _id: string;
    title: string;
    slug: { current: string } | string;
    type: string;
    city?: string;
    coverPhoto?: unknown;
    isVerified?: boolean;
    verificationStatus?: string;
    hostName?: string;
    price?: number;
    priceUnit?: string;
    priceRange?: string;
    openingHours?: string;
    subcategory?: string;
    avgRating?: number;
    reviewCount?: number;
  }>;
}

/* ---------- Helpers ---------- */

const TYPE_SLUG_MAP: Record<string, string> = {
  stay: "stays",
  experience: "experiences",
  event: "events",
  rental: "rentals",
  service: "services",
  restaurant: "restaurants",
};

function mapListingToCard(listing: NonNullable<HostData["listings"]>[number]): ListingCardProps {
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
    hostName: listing.hostName,
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

  const photoUrl = host.photo?.asset?.url;
  const initials = host.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const verifiedListings = (host.listings ?? []).filter((l) => l.isVerified);
  const cards = verifiedListings.map(mapListingToCard);

  const memberSince = host.createdAt
    ? new Date(host.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : null;

  const planLabel = host.planTier ?? "basic";

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* ── Dark hero ── */}
      <div className="relative bg-[#16130C] overflow-hidden">
        {/* Background SVG pattern */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://cdn.sanity.io/images/b9zd8u9f/production/59715b77a1b75a3d1f7bfd75ee2fbec9d5273f62-1600x900.svg?w=1800"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#16130C]/70 via-[#16130C]/50 to-[#16130C]/90 pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-5 pt-8 pb-10 text-center">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white/70 transition-colors mb-6"
          >
            ← Back to Klickenya
          </Link>

          {/* Photo */}
          <div className="relative w-24 h-24 mx-auto mb-4">
            {photoUrl ? (
              <Image
                src={`${photoUrl}?w=192&h=192&fit=crop&auto=format`}
                alt={host.name}
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover border-4 border-white/10"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#E8A020] to-[#6B2D8B] flex items-center justify-center text-white text-[28px] font-bold border-4 border-white/10">
                {initials}
              </div>
            )}
            {host.verified && (
              <span className="absolute -bottom-1 -right-1 size-7 rounded-full bg-[#16A34A] border-3 border-[#16130C] flex items-center justify-center">
                <Check className="size-4 text-white" strokeWidth={3} />
              </span>
            )}
          </div>

          {/* Name + badges */}
          <h1 className="font-display text-[26px] font-bold tracking-[-0.03em] text-white mb-1">
            {host.name}
          </h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            {host.verified && (
              <span className="text-[12px] font-bold text-[#16A34A]">Verified Host</span>
            )}
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#E8A020]/15 text-[#E8A020]">
              {planLabel}
            </span>
          </div>

          {/* Bio */}
          {host.bio && (
            <p className="text-[14px] text-white/50 max-w-md mx-auto mb-5 leading-relaxed">
              {host.bio}
            </p>
          )}

          {/* Links */}
          {(host.website || host.instagram || host.facebook) && (
            <div className="flex items-center justify-center gap-4 mb-4">
              {host.website && (
                <a
                  href={host.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-[#E8A020] hover:text-[#F5C842] transition-colors"
                >
                  Website
                </a>
              )}
              {host.instagram && (
                <a
                  href={host.instagram.startsWith("http") ? host.instagram : `https://instagram.com/${host.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-[#E8A020] hover:text-[#F5C842] transition-colors"
                >
                  Instagram
                </a>
              )}
              {host.facebook && (
                <a
                  href={host.facebook.startsWith("http") ? host.facebook : `https://facebook.com/${host.facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-[#E8A020] hover:text-[#F5C842] transition-colors"
                >
                  Facebook
                </a>
              )}
            </div>
          )}

          {/* Member since */}
          {memberSince && (
            <p className="text-[12px] text-white/25">
              Member since {memberSince}
            </p>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-5xl mx-auto px-5 py-8">
        {/* Listings */}
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
