import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { sanityClient } from "@/lib/sanity/client";
import { imageUrl } from "@/lib/sanity/image";

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
    .select("user_id, display_name")
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

  if (hostProfile) {
    try {
      const raw = await sanityClient.fetch<
        { _id: string; title: string; slug: string; type: string; city: string | null; coverPhoto: unknown; isVerified: boolean }[]
      >(
        `*[_type == "listing" && hostId == $hostId] | order(_createdAt desc) {
          _id,
          title,
          "slug": slug.current,
          type,
          city,
          coverPhoto,
          isVerified
        }`,
        { hostId: hostProfile.user_id }
      );
      listings = raw.map((l) => ({
        _id: l._id,
        title: l.title,
        slug: l.slug,
        type: l.type,
        city: l.city,
        imageUrl: l.coverPhoto ? imageUrl(l.coverPhoto, 400) : null,
        isVerified: l.isVerified,
      }));
    } catch (err) {
      console.error("Sanity listing fetch error:", err);
    }
  }

  const firstName = (hostProfile?.display_name ?? profile?.full_name ?? "Host").split(/\s+/)[0];
  const verifiedCount = listings.filter((l) => l.isVerified).length;
  const pendingCount = listings.length - verifiedCount;

  // Time-based greeting
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
          {greeting}, {firstName}
        </h1>
        <p className="text-[14px] text-[#9C9485] mt-1">
          Here&apos;s an overview of your listings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Total Listings", value: listings.length, color: "text-[#16130C]" },
          { label: "Verified", value: verifiedCount, color: "text-[#16A34A]" },
          { label: "Pending", value: pendingCount, color: "text-[#E8A020]" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-[#E2DDD5] p-5 text-center shadow-sm"
          >
            <p className={`font-display text-[28px] font-bold tracking-[-0.02em] leading-none ${stat.color}`}>
              {stat.value}
            </p>
            <p className="text-[12px] text-[#9C9485] font-medium mt-2">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Listings */}
      <div className="mb-8">
        <h2 className="font-display text-[20px] font-bold text-[#16130C] tracking-[-0.02em] mb-4">
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => {
              const typeSlug = listing.type === "experience" ? "experiences" : listing.type + "s";
              const citySlug = (listing.city ?? "").toLowerCase().replace(/ /g, "-");
              const href = `/${typeSlug}/${citySlug}/${listing.slug}`;

              return (
                <div
                  key={listing._id}
                  className="bg-white rounded-2xl border border-[#E2DDD5] overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Photo */}
                  <div className="aspect-[4/3] bg-[#F4F1EC] relative">
                    {listing.imageUrl ? (
                      <Image
                        src={listing.imageUrl}
                        alt={listing.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[48px] bg-gradient-to-br from-[#F4F1EC] to-[#E2DDD5]">
                        🏠
                      </div>
                    )}
                    {/* Badge overlay */}
                    <div className="absolute top-3 left-3">
                      {listing.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#16A34A] px-2.5 py-1 rounded-full shadow-sm">
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16130C] bg-[#F5C842] px-2.5 py-1 rounded-full shadow-sm">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-[16px] font-semibold text-[#16130C] truncate">
                      {listing.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 mb-4">
                      <span className="text-[13px] text-[#9C9485] capitalize">{listing.type}</span>
                      {listing.city && (
                        <>
                          <span className="text-[#E2DDD5]">·</span>
                          <span className="text-[13px] text-[#9C9485]">{listing.city}</span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={href}
                        className="flex-1 h-[44px] flex items-center justify-center text-[14px] font-semibold text-[#6B2D8B] bg-[#6B2D8B]/8 rounded-xl hover:bg-[#6B2D8B]/15 transition-colors"
                      >
                        View →
                      </Link>
                      <button
                        disabled
                        className="flex-1 h-[44px] flex items-center justify-center text-[14px] font-medium text-[#9C9485] bg-[#F4F1EC] rounded-xl cursor-not-allowed"
                      >
                        Edit · Soon
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
