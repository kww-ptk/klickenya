import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { sanityClient } from "@/lib/sanity/client";
import { getAuthUser, getHostProfile, getIsAdmin } from "../../dashboard/_lib/auth";

interface EatListing {
  _id: string;
  title: string;
  slug: string;
  type: string;
  city: string | null;
  imageUrl: string | null;
  isVerified: boolean;
}

export default async function EatListingsPage() {
  const { user } = await getAuthUser();
  if (!user) redirect("/login?returnTo=/eat/listings");

  const isAdmin = await getIsAdmin(user.id);
  const hostProfile = await getHostProfile(user.id);
  // Admins are allowed to roam without a host_profile so they can demo.
  if (!hostProfile && !isAdmin) redirect("/dashboard");

  // Restaurants only — eat is restaurant-centric.
  // Admin sees all restaurants; hosts see only their own.
  const groqFilter = isAdmin
    ? `_type == "listing" && type == "restaurant"`
    : `_type == "listing"
        && type == "restaurant"
        && (
          hostId == $hostId
          || host._ref == $sanityHostId
          || _id in *[_type == "host" && _id == $sanityHostId][0].listings[]._ref
        )`;

  let listings: EatListing[] = [];
  try {
    const raw = await sanityClient.fetch<
      {
        _id: string;
        title: string;
        slug: string;
        type: string;
        city: string | null;
        coverPhoto: { asset?: { url?: string } } | null;
        isVerified: boolean;
      }[]
    >(
      `*[${groqFilter}] | order(_createdAt desc) {
        _id, title, "slug": slug.current, type, city,
        "coverPhoto": photos[0]{ asset->{ _id, url } },
        isVerified
      }`,
      { hostId: user.id, sanityHostId: hostProfile?.sanity_host_id ?? "" },
    );
    listings = raw.map((l) => ({
      _id: l._id,
      title: l.title,
      slug: l.slug,
      type: l.type,
      city: l.city,
      imageUrl: l.coverPhoto?.asset?.url
        ? `${l.coverPhoto.asset.url}?w=400&auto=format`
        : null,
      isVerified: l.isVerified,
    }));
  } catch (err) {
    console.error("[/eat/listings] Sanity fetch error:", err);
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
          Restaurants
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-0.5">
          {listings.length === 0
            ? "No restaurants yet."
            : `${listings.length} restaurant${listings.length !== 1 ? "s" : ""}`}
          {isAdmin && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#6B2D8B]/15 text-[#6B2D8B]">
              Admin view
            </span>
          )}
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2DDD5] p-10 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#E8A020]/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-[28px]">🍽️</span>
          </div>
          <p className="font-display text-[16px] font-bold text-[#16130C] mb-1">
            No restaurants yet
          </p>
          <p className="text-[13px] text-[#9C9485] mb-4 max-w-[280px] mx-auto">
            Claim a restaurant on Klickenya and manage it from here.
          </p>
          <Link
            href="/"
            className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-6 h-[40px] leading-[40px] rounded-full hover:bg-[#d4911c] transition-colors shadow-sm"
          >
            Find your restaurant →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {listings.map((listing) => (
            <Link
              key={listing._id}
              href={`/eat/listings/${listing._id}`}
              className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-3 lg:p-4 shadow-sm hover:shadow-md hover:border-[#E8A020]/40 transition-all flex gap-3"
            >
              <div className="shrink-0 w-[72px] h-[72px] lg:w-[100px] lg:h-[100px] rounded-lg lg:rounded-xl overflow-hidden bg-[#F4F1EC] relative">
                {listing.imageUrl ? (
                  <Image
                    src={listing.imageUrl}
                    alt={listing.title}
                    fill
                    sizes="(max-width: 1024px) 72px, 100px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[24px] bg-gradient-to-br from-[#F4F1EC] to-[#E2DDD5]">
                    🍽️
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="text-[15px] lg:text-[16px] font-semibold text-[#16130C] truncate leading-tight">
                  {listing.title}
                </h3>
                {listing.city && (
                  <p className="text-[12px] text-[#9C9485] mt-0.5">{listing.city}</p>
                )}
                <div className="mt-1.5">
                  {listing.isVerified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#16A34A] bg-[#16A34A]/8 px-2 py-0.5 rounded-full">
                      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#E8A020] bg-[#E8A020]/8 px-2 py-0.5 rounded-full">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
