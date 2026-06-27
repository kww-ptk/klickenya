import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { sanityClient } from "@/lib/sanity/client";
import { getAuthUser, getHostProfile } from "../_lib/auth";

export default async function DashboardListingsPage() {
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const hostProfile = await getHostProfile(user.id);

  if (!hostProfile) redirect("/dashboard");

  let listings: {
    _id: string;
    title: string;
    slug: string;
    type: string;
    subcategory: string | null;
    city: string | null;
    imageUrl: string | null;
    isVerified: boolean;
  }[] = [];

  try {
    const raw = await sanityClient.fetch<
      { _id: string; title: string; slug: string; type: string; subcategory: string | null; city: string | null; coverPhoto: { asset?: { url?: string } } | null; isVerified: boolean }[]
    >(
      `*[_type == "listing" && (
        hostId == $hostId
        || host._ref == $sanityHostId
        || _id in *[_type == "host" && _id == $sanityHostId][0].listings[]._ref
      )] | order(_createdAt desc) {
        _id, title, "slug": slug.current, type, subcategory, city,
        "coverPhoto": photos[0]{ asset->{ _id, url } },
        isVerified
      }`,
      { hostId: hostProfile.user_id, sanityHostId: hostProfile.sanity_host_id ?? "" }
    );
    listings = raw.map((l) => ({
      _id: l._id,
      title: l.title,
      slug: l.slug,
      type: l.type,
      subcategory: l.subcategory ?? null,
      city: l.city,
      imageUrl: l.coverPhoto?.asset?.url ? `${l.coverPhoto.asset.url}?w=400&auto=format` : null,
      isVerified: l.isVerified,
    }));
  } catch (err) {
    console.error("Sanity listing fetch error:", err);
  }

  const verifiedCount = listings.filter((l) => l.isVerified).length;
  const pendingCount = listings.length - verifiedCount;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark">My Listings</h1>
            <span className="text-[12px] font-semibold text-text3 bg-[#F0EDE8] px-2 py-0.5 rounded-full">{listings.length}</span>
          </div>
          <p className="text-[13px] text-text3 mt-0.5">Your marketplace listings and their command centres — manage menus, POS, reservations, and more.</p>
        </div>
        <Link
          href="/list"
          className="shrink-0 inline-flex items-center bg-amber text-dark font-bold text-[13px] px-5 h-[40px] rounded-full hover:bg-[#d4911c] transition-colors shadow-sm"
        >
          List your business →
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-sm">
          <div className="w-20 h-20 rounded-full bg-amber/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-[36px]">🏡</span>
          </div>
          <p className="font-display text-[18px] font-bold text-dark mb-1">No listings yet</p>
          <p className="text-[14px] text-text3 mb-6 max-w-[320px] mx-auto">
            List a new business to put it on Klickenya — or claim an existing
            listing if your business is already on the marketplace.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/list"
              className="inline-block bg-amber text-dark font-bold text-[14px] px-7 h-[48px] leading-[48px] rounded-full hover:bg-[#d4911c] transition-colors shadow-sm"
            >
              List your business →
            </Link>
            <Link
              href="/"
              className="inline-block bg-white border border-border text-dark font-bold text-[14px] px-7 h-[48px] leading-[48px] rounded-full hover:border-text3 transition-colors"
            >
              Claim a listing
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => {
            const typeSlug = listing.type === "experience" ? "experiences" : listing.type + "s";
            const citySlug = (listing.city ?? "").toLowerCase().replace(/ /g, "-");
            const href = `/${typeSlug}/${citySlug}/${listing.slug}`;

            return (
              <div
                key={listing._id}
                className="bg-white rounded-xl lg:rounded-2xl border border-border p-3 lg:p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex gap-3">
                  <div className="shrink-0 w-[72px] h-[72px] lg:w-[120px] lg:h-[88px] rounded-lg lg:rounded-xl overflow-hidden bg-surface relative">
                    {listing.imageUrl ? (
                      <Image
                        src={listing.imageUrl}
                        alt={listing.title}
                        fill
                        sizes="(max-width: 1024px) 72px, 120px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[24px] bg-gradient-to-br from-surface to-border">
                        🏠
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] lg:text-[16px] font-semibold text-dark truncate leading-tight">
                      {listing.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[12px] text-text3 capitalize">{listing.type}</span>
                      {listing.city && (
                        <>
                          <span className="text-border">·</span>
                          <span className="text-[12px] text-text3">{listing.city}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-1.5">
                      {listing.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green bg-green/8 px-2 py-0.5 rounded-full">
                          <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Verified
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber bg-amber/8 px-2 py-0.5 rounded-full">Pending</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-surface">
                  {/* "Open dashboard" for restaurant listings only */}
                  {(listing.type === "restaurant" || listing.subcategory === "restaurants") && (
                    <Link
                      href={`/dashboard/listings/${listing._id}`}
                      className="flex-1 h-[40px] lg:h-[44px] flex items-center justify-center text-[13px] lg:text-[14px] font-semibold text-amber bg-amber/8 rounded-lg lg:rounded-xl hover:bg-amber/15 transition-colors"
                    >
                      Open dashboard →
                    </Link>
                  )}
                  <Link
                    href={href}
                    className="flex-1 h-[40px] lg:h-[44px] flex items-center justify-center text-[13px] lg:text-[14px] font-semibold text-purple bg-purple/8 rounded-lg lg:rounded-xl hover:bg-purple/15 transition-colors"
                  >
                    View listing →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
