import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUser, getHostProfile, getIsAdmin } from "../../_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { ListingTabNav } from "@/components/dashboard/listings/ListingTabNav";
import type { TabItem } from "@/components/dashboard/listings/ListingTabNav";
import {
  LISTING_FEATURES,
  type FeatureContext,
} from "./_lib/features.config";

/**
 * DEPLOYED_SEGMENTS — Single source of truth for which feature tabSegments have
 * a page.tsx built at /dashboard/listings/[id]/[segment].
 *
 * After the IA promotion (eat → dashboard): menu now has its own page here,
 * so it's included. The legacy `getActiveTabs()` filtering is replaced by
 * the explicit, fixed-order tab list below (mirrors /eat layout).
 */
export const DEPLOYED_SEGMENTS = new Set<string>([
  "menu",
  "reservations",
  "kitchen",
  "orders",
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
    ordering_enabled: boolean;
    takeaway_enabled: boolean;
    delivery_enabled: boolean;
    stock_enabled: boolean;
  } | null = null;

  if (listing.slug) {
    // Admin bypasses business_id ownership filter
    let menuQuery = adminClient
      .from("menus")
      .select(
        "id, name, listing_slug, table_ordering, reservations_enabled, ordering_enabled, takeaway_enabled, delivery_enabled, stock_enabled",
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
          ordering_enabled: menu.ordering_enabled ?? false,
          takeaway_enabled: menu.takeaway_enabled ?? false,
          delivery_enabled: menu.delivery_enabled ?? false,
          stock_enabled: menu.stock_enabled ?? false,
        }
      : undefined,
  };

  // ── Pending reservations badge ──────────────────────────────────────────
  let pendingReservations = 0;
  if (menu) {
    const { count } = await adminClient
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("menu_id", menu.id)
      .eq("status", "pending");
    pendingReservations = count ?? 0;
  }

  // ── Tabs — fixed order matching /eat IA promotion ────────────────────────
  // Overview · Menu · Reservations · Orders · POS · Kitchen · Features.
  // Inactive features hide from the tab strip but surface on the Features
  // page so owners can enable them. POS shows whenever a menu exists.
  function isFeatureActive(featureId: string): boolean {
    const f = LISTING_FEATURES.find((x) => x.id === featureId);
    return f ? f.getStatus(featureCtx) === "active" : false;
  }

  const baseHref = `/dashboard/listings/${id}`;
  const tabs: TabItem[] = [
    { label: "Overview", href: baseHref },
  ];

  if (menu) {
    tabs.push({ label: "Menu", href: `${baseHref}/menu` });
  }
  if (isFeatureActive("reservations")) {
    tabs.push({
      label: "Reservations",
      href: `${baseHref}/reservations`,
      badge: pendingReservations > 0 ? pendingReservations : undefined,
    });
  }
  if (isFeatureActive("table_ordering")) {
    tabs.push({ label: "Orders", href: `${baseHref}/orders` });
  }
  if (menu) {
    // POS is the staff-side of the order pipeline; available whenever a menu
    // exists (waiter-only restaurants can use POS without QR ordering).
    tabs.push({ label: "POS", href: `${baseHref}/pos` });
  }
  if (isFeatureActive("klickenya_kitchen")) {
    tabs.push({ label: "Kitchen", href: `${baseHref}/kitchen` });
  }
  tabs.push({ label: "Features", href: `${baseHref}/features` });

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
      <ListingTabNav listingId={id} tabs={tabs} overviewHref={baseHref} />

      {/* ── Page content ── */}
      <div className="mt-5">{children}</div>
    </div>
  );
}
