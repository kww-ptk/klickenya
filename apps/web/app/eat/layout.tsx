import { redirect } from "next/navigation";
import { sanityClient } from "@/lib/sanity/client";
import { adminClient } from "@/lib/supabase/admin";
import { getAuthUser, getUserProfile, getHostProfile } from "../dashboard/_lib/auth";
import { EatSidebar } from "./_components/EatSidebar";
import { EatBottomNav } from "./_components/EatBottomNav";

/**
 * /eat — restaurant-only command center preview.
 *
 * Conceptually a separate eat.klickenya.com subdomain. For the preview we
 * mount it under /eat in the same Next.js app — same auth, same Supabase,
 * but a stripped-down navigation that hides everything stays/PMS/events
 * related so a restaurateur sees only what's relevant to them.
 *
 * If/when this graduates to a real subdomain, the layout and routes move
 * to the apex of an `apps/eat` workspace; the underlying components stay.
 */
export default async function EatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getAuthUser();
  if (!user) redirect("/login?returnTo=/eat");

  const [profile, hostProfile] = await Promise.all([
    getUserProfile(user.id),
    getHostProfile(user.id),
  ]);

  // Photo + enquiry count — exact mirror of the dashboard layout, kept
  // duplicate-ish on purpose so the eat preview doesn't pull from a shared
  // helper that might evolve in ways the legacy dashboard needs.
  let photoUrl: string | null = null;
  let enquiryCount = 0;

  if (hostProfile?.sanity_host_id) {
    const [photoResult, enquiryResult] = await Promise.allSettled([
      sanityClient.fetch<{ photo?: { asset?: { url?: string } } } | null>(
        `*[_type == "host" && _id == $id][0]{ photo{ asset->{ url } } }`,
        { id: hostProfile.sanity_host_id },
      ),
      (async () => {
        // Restaurants only — eat preview shouldn't count enquiries for
        // stays/experiences/events listings.
        const listingIds = await sanityClient.fetch<string[]>(
          // Restaurant detection mirrors the legacy dashboard convention:
          // a listing is restaurant-y if `type == "restaurant"` OR if it's
          // catalogued under `subcategory == "restaurants"`. Napule and
          // others use the latter — the type field is sometimes
          // "experience" or "venue" with restaurants nested as a subcategory.
          `*[
            _type == "listing"
            && (type == "restaurant" || subcategory == "restaurants")
            && (
              hostId == $hostId
              || host._ref == $sanityHostId
              || _id in *[_type == "host" && _id == $sanityHostId][0].listings[]._ref
            )
          ]._id`,
          { hostId: user.id, sanityHostId: hostProfile.sanity_host_id },
        );
        if (listingIds.length === 0) return 0;
        const { count } = await adminClient
          .from("contact_requests")
          .select("id", { count: "exact", head: true })
          .in("listing_sanity_id", listingIds)
          .eq("status", "new");
        return count ?? 0;
      })(),
    ]);
    if (photoResult.status === "fulfilled") {
      photoUrl = photoResult.value?.photo?.asset?.url ?? null;
    }
    if (enquiryResult.status === "fulfilled") {
      enquiryCount = enquiryResult.value;
    }
  }

  const displayName = hostProfile?.display_name ?? profile?.full_name ?? "Host";
  const planTier = hostProfile?.plan_tier ?? "basic";
  const initials = displayName
    .split(/\s+/)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-screen">
      <EatSidebar
        displayName={displayName}
        initials={initials}
        photoUrl={photoUrl}
        enquiryCount={enquiryCount}
        email={profile?.email ?? null}
        planTier={planTier}
      />

      <main className="flex-1 lg:ml-[240px] min-h-screen bg-[#FAFAF8] min-w-0 overflow-x-hidden">
        {/* Mobile header: eat branding + enquiry badge. Keep simple. */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[#E2DDD5] bg-[#16130C]">
          <p className="text-[16px] font-display font-bold tracking-[-0.02em] text-white leading-none">
            eat<span className="text-[#E8A020]">.</span>
          </p>
          {enquiryCount > 0 && (
            <span className="text-[11px] font-semibold text-[#E8A020] uppercase tracking-wide">
              {enquiryCount} new
            </span>
          )}
        </header>
        <div className="p-5 pb-24 lg:p-8 lg:pb-8">{children}</div>
      </main>

      <EatBottomNav enquiryCount={enquiryCount} />
    </div>
  );
}
