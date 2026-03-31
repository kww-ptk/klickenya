import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("user_id, display_name, sanity_host_id")
    .eq("user_id", user.id)
    .single();

  // Fetch listings from Sanity
  let listings: {
    _id: string;
    title: string;
    slug: string;
    type: string;
    city: string | null;
    imageUrl: string | null;
    isVerified: boolean;
  }[] = [];

  let hostSlug: string | null = null;

  if (hostProfile) {
    // Fetch host slug
    if (hostProfile.sanity_host_id) {
      try {
        const hostDoc = await sanityClient.fetch<{ slug: string } | null>(
          `*[_type == "host" && _id == $id][0]{ "slug": slug.current }`,
          { id: hostProfile.sanity_host_id }
        );
        hostSlug = hostDoc?.slug ?? null;
      } catch {
        // Non-blocking
      }
    }

    try {
      const raw = await sanityClient.fetch<
        { _id: string; title: string; slug: string; type: string; city: string | null; coverPhoto: { asset?: { url?: string } } | null; isVerified: boolean }[]
      >(
        `*[_type == "listing" && (hostId == $hostId || host._ref == $sanityHostId)] | order(_createdAt desc) {
          _id,
          title,
          "slug": slug.current,
          type,
          city,
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
        city: l.city,
        imageUrl: l.coverPhoto?.asset?.url
          ? `${l.coverPhoto.asset.url}?w=400&auto=format`
          : null,
        isVerified: l.isVerified,
      }));
    } catch (err) {
      console.error("Sanity listing fetch error:", err);
    }
  }

  const firstName = (hostProfile?.display_name ?? profile?.full_name ?? "Host").split(/\s+/)[0];
  const verifiedCount = listings.filter((l) => l.isVerified).length;
  const pendingCount = listings.length - verifiedCount;

  // Fetch real enquiry counts per listing from contact_requests
  const listingIds = listings.map((l) => l._id);
  let enquiryCountMap = new Map<string, number>();
  let totalEnquiries = 0;
  if (listingIds.length > 0) {
    const { data: countRows } = await adminClient
      .from("contact_requests")
      .select("listing_sanity_id")
      .in("listing_sanity_id", listingIds);
    if (countRows) {
      for (const row of countRows) {
        const id = row.listing_sanity_id;
        if (id) enquiryCountMap.set(id, (enquiryCountMap.get(id) ?? 0) + 1);
      }
      totalEnquiries = countRows.length;
    }
  }

  // Time-based greeting
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
            {greeting}, {firstName}
          </h1>
          <p className="text-[13px] text-[#9C9485] mt-0.5">
            Here&apos;s an overview of your listings
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hostSlug && (
            <Link
              href={`/hosts/${hostSlug}`}
              className="text-[13px] font-medium text-[#9C9485] hover:text-[#16130C] transition-colors hidden sm:flex items-center"
            >
              View profile →
            </Link>
          )}
          <Link
            href="/dashboard/profile/edit"
            className="text-[13px] font-semibold text-[#6B2D8B] bg-[#6B2D8B]/8 px-4 h-[40px] flex items-center rounded-xl hover:bg-[#6B2D8B]/15 transition-colors"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 lg:gap-3 mb-5">
        {[
          { label: "Listings", value: listings.length, color: "text-[#16130C]" },
          { label: "Verified", value: verifiedCount, color: "text-[#16A34A]" },
          { label: "Pending", value: pendingCount, color: "text-[#E8A020]" },
          { label: "Enquiries", value: totalEnquiries, color: "text-[#6B2D8B]" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] py-3 px-2 lg:p-4 text-center shadow-sm"
          >
            <p className={`font-display text-[20px] lg:text-[24px] font-bold tracking-[-0.02em] leading-none ${stat.color}`}>
              {stat.value}
            </p>
            <p className="text-[10px] lg:text-[11px] text-[#9C9485] font-medium mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Listings */}
      <div className="mb-5">
        <h2 className="font-display text-[17px] lg:text-[20px] font-bold text-[#16130C] tracking-[-0.02em] mb-3">
          My Listings
        </h2>

        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2DDD5] p-12 text-center shadow-sm">
            <div className="w-20 h-20 rounded-full bg-[#E8A020]/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-[36px]">🏡</span>
            </div>
            <p className="font-display text-[18px] font-bold text-[#16130C] mb-1">
              No listings yet
            </p>
            <p className="text-[14px] text-[#9C9485] mb-6 max-w-[280px] mx-auto">
              Claim your first listing on Klickenya and start managing it from here
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
            {listings.map((listing, i) => {
              const typeSlug = listing.type === "experience" ? "experiences" : listing.type + "s";
              const citySlug = (listing.city ?? "").toLowerCase().replace(/ /g, "-");
              const href = `/${typeSlug}/${citySlug}/${listing.slug}`;
              const listingEnquiries = enquiryCountMap.get(listing._id) ?? 0;

              return (
                <div
                  key={listing._id}
                  className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-3 lg:p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-3">
                    {/* Photo */}
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

                    {/* Info */}
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
                          <span className="text-[10px] font-bold text-[#E8A020] bg-[#E8A020]/8 px-2 py-0.5 rounded-full">
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-[#9C9485]">
                          <span className="font-semibold text-[#16130C]">{listingEnquiries}</span> enquir{listingEnquiries === 1 ? "y" : "ies"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-[#F4F1EC]">
                    <Link
                      href={href}
                      className="flex-1 h-[40px] lg:h-[44px] flex items-center justify-center text-[13px] lg:text-[14px] font-semibold text-[#6B2D8B] bg-[#6B2D8B]/8 rounded-lg lg:rounded-xl hover:bg-[#6B2D8B]/15 transition-colors"
                    >
                      View listing →
                    </Link>
                    <button
                      disabled
                      className="flex-1 h-[40px] lg:h-[44px] flex items-center justify-center text-[13px] lg:text-[14px] font-medium text-[#9C9485] bg-[#F4F1EC] rounded-lg lg:rounded-xl cursor-not-allowed"
                    >
                      Edit · Soon
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Claim more CTA */}
      <div className="bg-gradient-to-br from-[#16130C] to-[#2A2520] rounded-xl lg:rounded-2xl p-5 lg:p-8 text-center shadow-sm">
        <p className="font-display text-[16px] lg:text-[20px] font-bold text-white tracking-[-0.02em] mb-1.5">
          Have more listings on Klickenya?
        </p>
        <p className="text-[13px] text-white/50 mb-4 max-w-[300px] mx-auto">
          Claim and verify them to get the green badge and manage enquiries.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[13px] lg:text-[14px] px-6 h-[44px] leading-[44px] rounded-full hover:bg-[#d4911c] transition-colors shadow-sm"
        >
          Claim another listing →
        </Link>
      </div>
    </div>
  );
}
