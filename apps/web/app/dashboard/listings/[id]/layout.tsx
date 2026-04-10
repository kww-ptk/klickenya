import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUser, getHostProfile } from "../../_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { ListingTabNav } from "@/components/dashboard/listings/ListingTabNav";
import type { TabItem } from "@/components/dashboard/listings/ListingTabNav";
import {
  getActiveTabs,
  type FeatureContext,
} from "./_lib/features.config";

// DEPLOYED_SEGMENTS: tab segments that are shown in the nav even before their
// page.tsx files exist. Any active segment NOT in this set is omitted from the
// nav (with a dev-mode warning) to prevent dead links.
//
// 'orders' is pre-registered: the Orders page will 404 until Prompt 8c builds it.
// TODO: add 'reservations' when Prompt 8c creates reservations/page.tsx
// TODO: add 'menu' when Prompt 9 migrates the MenuBuilder into this command center
const DEPLOYED_SEGMENTS = new Set<string>(["orders"]);

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

  const hostProfile = await getHostProfile(user.id);
  if (!hostProfile) redirect("/dashboard");

  // Fetch Sanity listing with ownership check
  const listing = await sanityClient.fetch<{
    _id: string;
    title: string;
    slug: string;
    type: string;
    city: string | null;
  } | null>(
    `*[
      _id == $id &&
      (_type == "listing" || _type == "event") &&
      (hostId == $userId || host._ref == $sanityHostId)
    ][0]{
      _id,
      title,
      "slug": slug.current,
      type,
      city
    }`,
    {
      id,
      userId: user.id,
      sanityHostId: hostProfile.sanity_host_id ?? "",
    },
  );

  if (!listing) notFound();

  // ── Stay / rental redirect ────────────────────────────────────────────────
  // TODO V2: Stays will render their own tab set (Overview, Rooms, Calendar,
  //          Settings) here in a future migration. Currently redirected to the
  //          legacy PMS route.
  if (listing.type === "stay" || listing.type === "rental") {
    const { data: property } = await adminClient
      .from("properties")
      .select("id")
      .eq("listing_slug", listing.slug)
      .eq("owner_id", user.id)
      .maybeSingle();

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
    ordering_enabled: boolean;
    takeaway_enabled: boolean;
    delivery_enabled: boolean;
  } | null = null;

  if (listing.slug) {
    const { data } = await adminClient
      .from("menus")
      .select(
        "id, name, listing_slug, table_ordering, reservations_enabled, ordering_enabled, takeaway_enabled, delivery_enabled",
      )
      .eq("listing_slug", listing.slug)
      .eq("business_id", user.id)
      // cache: 'no-store' equivalent — toggle flips must reflect immediately
      .maybeSingle();
    menu = data ?? null;
  }

  const featureCtx: FeatureContext = {
    listingType: "restaurant",
    menu: menu
      ? {
          id: menu.id,
          table_ordering: menu.table_ordering ?? false,
          reservations_enabled: menu.reservations_enabled ?? false,
          ordering_enabled: menu.ordering_enabled ?? false,
          takeaway_enabled: menu.takeaway_enabled ?? false,
          delivery_enabled: menu.delivery_enabled ?? false,
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
    listing.type === "restaurant"
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
