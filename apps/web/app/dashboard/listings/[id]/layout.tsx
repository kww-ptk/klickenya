import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUser, getHostProfile, getIsAdmin } from "../../_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { ListingTabNav } from "@/components/dashboard/listings/ListingTabNav";
import type { TabItem } from "@/components/dashboard/listings/ListingTabNav";
import {
  getActiveTabs,
  type FeatureContext,
} from "./_lib/features.config";

/**
 * DEPLOYED_SEGMENTS — Single source of truth for which feature tabSegments have
 * a page.tsx built at /dashboard/listings/[id]/[segment].
 *
 * Update this set when adding new feature pages:
 *   - 'reservations' → add when Prompt 8c creates reservations/page.tsx
 *   - 'orders'       → add when Prompt 9 migrates the orders page here
 *   - 'menu'         → add when Prompt 9 migrates MenuBuilder into this command center
 *
 * Any active tabSegment NOT in this set is rendered as a "Coming soon" card
 * in the Overview Quick Access section and omitted from the tab nav entirely.
 * No dead links, no 404s without a badge.
 */
export const DEPLOYED_SEGMENTS = new Set<string>([
  "reservations",
  "kitchen",
  "orders",
  // TODO Prompt 9: add 'menu' when MenuBuilder migrates here.
]);

export default async function ListingDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const isAdmin = await getIsAdmin(user.id);

  const hostProfile = await getHostProfile(user.id);
  // Admin users may not have a host_profile — only redirect non-admins
  if (!hostProfile && !isAdmin) redirect("/dashboard");

  // Fetch Sanity listing — admin bypasses ownership filter
  const listing = await sanityClient.fetch<{
    _id: string;
    title: string;
    slug: string;
    type: string;
    subcategory: string | null;
    city: string | null;
  } | null>(
    isAdmin
      ? `*[_id == $id && (_type == "listing" || _type == "event")][0]{
          _id, title, "slug": slug.current, type, subcategory, city
        }`
      : `*[
          _id == $id &&
          (_type == "listing" || _type == "event") &&
          (hostId == $userId || host._ref == $sanityHostId)
        ][0]{
          _id, title, "slug": slug.current, type, subcategory, city
        }`,
    {
      id,
      userId: user.id,
      sanityHostId: hostProfile?.sanity_host_id ?? "",
    },
  );

  if (!listing) notFound();

  // ── Stay / rental redirect ────────────────────────────────────────────────
  // TODO V2: Stays will render their own tab set (Overview, Rooms, Calendar,
  //          Settings) here in a future migration. Currently redirected to the
  //          legacy PMS route.
  if (listing.type === "stay" || listing.type === "rental") {
    let stayQuery = adminClient
      .from("properties")
      .select("id")
      .eq("listing_slug", listing.slug);
    if (!isAdmin) stayQuery = stayQuery.eq("owner_id", user.id);
    const { data: property } = await stayQuery.maybeSingle();

    if (property) {
      redirect(`/dashboard/property/${property.id}`);
    } else {
      // No linked property yet — redirect to PMS hub so host can set one up
      redirect("/dashboard/property");
    }
  }

  // ── Restaurant: resolve linked menu ──────────────────────────────────────
  let menu: {
    id: string;
    name: string;
    listing_slug: string | null;
    table_ordering: boolean;
    reservations_enabled: boolean;
    takeaway_enabled: boolean;
    delivery_enabled: boolean;
    stock_enabled: boolean;
  } | null = null;

  if (listing.slug) {
    // Admin bypasses business_id ownership filter
    let menuQuery = adminClient
      .from("menus")
      .select(
        "id, name, listing_slug, table_ordering, reservations_enabled, takeaway_enabled, delivery_enabled, stock_enabled",
      )
      .eq("listing_slug", listing.slug);
    if (!isAdmin) menuQuery = menuQuery.eq("business_id", user.id);
    const { data } = await menuQuery.maybeSingle();
    menu = data ?? null;
  }

  const featureCtx: FeatureContext = {
    listingType: "restaurant",
    menu: menu
      ? {
          id: menu.id,
          table_ordering: menu.table_ordering ?? false,
          reservations_enabled: menu.reservations_enabled ?? false,
          takeaway_enabled: menu.takeaway_enabled ?? false,
          delivery_enabled: menu.delivery_enabled ?? false,
          stock_enabled: menu.stock_enabled ?? false,
        }
      : undefined,
  };

  // Build active tabs filtered to deployed segments only
  const activeTabs = getActiveTabs(featureCtx).filter((f) => {
    if (f.tabSegment && !DEPLOYED_SEGMENTS.has(f.tabSegment)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[listing-dashboard] Tab '${f.id}' (segment '${f.tabSegment}') is active but has no page.tsx yet — omitting from nav`,
        );
      }
      return false;
    }
    return true;
  });

  const tabs: TabItem[] = [
    {
      label: "Overview",
      href: `/dashboard/listings/${id}`,
    },
    ...activeTabs.map((f) => ({
      label: f.label,
      href: `/dashboard/listings/${id}/${f.tabSegment}`,
    })),
    {
      label: "Features",
      href: `/dashboard/listings/${id}/features`,
    },
  ];

  const typeLabel =
    listing.type === "restaurant" || listing.subcategory === "restaurants"
      ? "Restaurant"
      : listing.type === "experience"
        ? "Experience"
        : listing.type.charAt(0).toUpperCase() + listing.type.slice(1);

  return (
    <div>
      {/* ── Page header ── */}
      <div className="mb-5">
        <Link
          href="/dashboard/listings"
          className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
        >
          ← My Listings
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] flex-1 min-w-0 truncate">
            {listing.title}
          </h1>
          <span className="shrink-0 text-[11px] font-bold bg-[#E8A020]/10 text-[#E8A020] px-2.5 py-1 rounded-full">
            {typeLabel}
          </span>
        </div>
        {listing.city && (
          <p className="text-[13px] text-[#9C9485] mt-0.5">{listing.city}</p>
        )}
      </div>

      {/* ── Tab nav ── */}
      <ListingTabNav listingId={id} tabs={tabs} />

      {/* ── Page content ── */}
      <div className="mt-5">{children}</div>
    </div>
  );
}
