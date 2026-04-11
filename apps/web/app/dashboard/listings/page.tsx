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
      `*[_type == "listing" && (hostId == $hostId || host._ref == $sanityHostId)] | order(_createdAt desc) {
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
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
            My Listings
          </h1>
          <p className="text-[13px] text-[#9C9485] mt-0.5">
            {listings.length} listing{listings.length !== 1 ? "s" : ""} · {verifiedCount} verified · {pendingCount} pending
          </p>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2DDD5] p-12 text-center shadow-sm">
          <div className="w-20 h-20 rounded-full bg-[#E8A020]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-[36px]">🏡</span>
          </div>
          <p className="font-display text-[18px] font-bold text-[#16130C] mb-1">No listings yet</p>
          <p className="text-[14px] text-[#9C9485] mb-6 max-w-[280px] mx-auto">
            Claim your first listing on Klickenya and start managing it from here.
          </p>
          <Link
            href="/"
            className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[14px] px-7 h-[48px] leading-[48px] rounded-full hover:bg-[#d4911c] transition-colors shadow-sm"
          >
            Claim a listing →
          </Link>
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
                className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-3 lg:p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex gap-3">
                  <div className="shrink-0 w-[72px] h-[72px] lg:w-[120px] lg:h-[88px] rounded-lg lg:rounded-xl overflow-hidden bg-[#F4F1EC] relative">
                    {listing.imageUrl ? (
                      <Image
                        src={listing.imageUrl}
                        alt={listing.title}
                        fill
                        sizes="(max-width: 1024px) 72px, 120px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[24px] bg-gradient-to-br from-[#F4F1EC] to-[#E2DDD5]">
                        🏠
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] lg:text-[16px] font-semibold text-[#16130C] truncate leading-tight">
                      {listing.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[12px] text-[#9C9485] capitalize">{listing.type}</span>
                      {listing.city && (
                        <>
                          <span className="text-[#E2DDD5]">·</span>
                          <span className="text-[12px] text-[#9C9485]">{listing.city}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-1.5">
                      {listing.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#16A34A] bg-[#16A34A]/8 px-2 py-0.5 rounded-full">
                          <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Verified
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-[#E8A020] bg-[#E8A020]/8 px-2 py-0.5 rounded-full">Pending</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-[#F4F1EC]">
                  {/* "Open dashboard" for restaurant listings only */}
                  {(listing.type === "restaurant" || listing.subcategory === "restaurants") && (
                    <Link
                      href={`/dashboard/listings/${listing._id}`}
                      className="flex-1 h-[40px] lg:h-[44px] flex items-center justify-center text-[13px] lg:text-[14px] font-semibold text-[#E8A020] bg-[#E8A020]/8 rounded-lg lg:rounded-xl hover:bg-[#E8A020]/15 transition-colors"
                    >
                      Open dashboard →
                    </Link>
                  )}
                  <Link
                    href={href}
                    className="flex-1 h-[40px] lg:h-[44px] flex items-center justify-center text-[13px] lg:text-[14px] font-semibold text-[#6B2D8B] bg-[#6B2D8B]/8 rounded-lg lg:rounded-xl hover:bg-[#6B2D8B]/15 transition-colors"
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
