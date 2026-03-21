import { notFound } from "next/navigation";
import { sanityFetch } from "@/lib/sanity/client";
import { defineQuery } from "next-sanity";
import Image from "next/image";
import Link from "next/link";
import { ClaimForm } from "@/components/claim/ClaimForm";

/* ---------- Sanity query ---------- */

const CLAIM_LISTING_QUERY = defineQuery(`
  *[_type == "listing" && slug.current == $slug][0] {
    _id,
    title,
    type,
    city,
    "slug": slug.current,
    "mainImage": mainImage.asset->url,
    verificationStatus
  }
`);

/* ---------- Metadata ---------- */

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const { data: listing } = await sanityFetch({
    query: CLAIM_LISTING_QUERY,
    params: { slug },
  });

  return {
    title: listing ? `Claim ${listing.title} — Klickenya` : "Claim Listing — Klickenya",
    robots: { index: false, follow: false },
  };
}

/* ---------- Page ---------- */

export default async function ClaimPage({ params }: PageProps) {
  const { slug } = await params;
  const { data: listing } = await sanityFetch({
    query: CLAIM_LISTING_QUERY,
    params: { slug },
  });

  if (!listing) notFound();

  const listingUrl = `/${listing.type === "experience" ? "experiences" : listing.type + "s"}/${(listing.city ?? "").toLowerCase().replace(/ /g, "-")}/${listing.slug}`;

  /* Already claimed */
  if (listing.verificationStatus === "claimed" || listing.verificationStatus === "verified") {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        {/* Header */}
        <div className="bg-[#16130C] px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/klickenya-mark.svg" alt="Klickenya" className="h-8 w-8" />
            <span className="text-white font-bold text-lg">
              Klic<span className="text-[#E8A020]">Kenya</span>
            </span>
          </Link>
        </div>

        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          {/* Listing mini card */}
          {listing.mainImage && (
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-6">
              <Image src={listing.mainImage} alt={listing.title} fill className="object-cover" sizes="80px" />
            </div>
          )}
          <h1 className="font-heading text-2xl font-bold text-[#16130C] mb-3">{listing.title}</h1>
          <div className="inline-flex items-center gap-2 bg-[#16A34A]/10 text-[#16A34A] font-semibold text-sm px-4 py-2 rounded-full mb-4">
            <span className="size-2 rounded-full bg-[#16A34A]" />
            This listing has already been claimed.
          </div>
          <p className="text-sm text-[#5E5848] mb-8">
            The owner has verified their identity and claimed this listing.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={listingUrl}
              className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-sm rounded-full px-6 py-3"
            >
              View listing →
            </Link>
            <Link
              href="/contact"
              className="text-sm text-[#9C9485] hover:text-[#16130C] underline underline-offset-2"
            >
              Not the owner? Contact us
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* Claim form */
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="bg-[#16130C] px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/klickenya-mark.svg" alt="Klickenya" className="h-8 w-8" />
          <span className="text-white font-bold text-lg">
            Klic<span className="text-[#E8A020]">Kenya</span>
          </span>
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Listing mini card */}
        <div className="flex items-center gap-3 border border-[#E2DDD5] rounded-xl p-3 mb-6 bg-white">
          {listing.mainImage ? (
            <div className="relative w-[60px] h-[60px] rounded-lg overflow-hidden shrink-0">
              <Image src={listing.mainImage} alt={listing.title} fill className="object-cover" sizes="60px" />
            </div>
          ) : (
            <div className="w-[60px] h-[60px] rounded-lg bg-gradient-to-br from-amber to-purple shrink-0 flex items-center justify-center">
              <img src="/klickenya-mark.svg" alt="" className="w-6 h-6 opacity-30" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[#16130C] line-clamp-1">{listing.title}</p>
            {listing.city && (
              <p className="text-xs text-[#9C9485] mt-0.5">{listing.city}</p>
            )}
          </div>
        </div>

        {/* Heading */}
        <h1 className="font-heading text-2xl font-bold text-[#16130C] mb-2">
          Is this your business?
        </h1>
        <p className="text-sm text-[#5E5848] mb-6">
          Claim it free to receive enquiries directly and get your Verified badge.
        </p>

        {/* Form */}
        <ClaimForm
          listingSlug={listing.slug}
          listingSanityId={listing._id}
          listingTitle={listing.title}
          listingType={listing.type}
          listingCity={listing.city}
        />
      </div>
    </div>
  );
}
