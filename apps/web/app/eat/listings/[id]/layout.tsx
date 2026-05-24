import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChefHat, CalendarCheck, UtensilsCrossed, ShoppingCart, Smartphone, Settings as SettingsIcon, LayoutDashboard } from "lucide-react";
import { getAuthUser, getHostProfile, getIsAdmin } from "../../../dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { ListingTabNav, type TabItem } from "@/components/dashboard/listings/ListingTabNav";
import {
  type FeatureContext,
  LISTING_FEATURES,
} from "../../../dashboard/listings/[id]/_lib/features.config";

/**
 * /eat/listings/[id] — restaurant command center (preview).
 *
 * Re-imagined tab structure: Overview · Menu · Reservations · Orders · Kitchen
 * · POS · Features. Tabs are driven by features.config.ts (the single source
 * of truth) — everything an *inactive* feature gets routed to the Features
 * page, where the owner can enable it.
 *
 * Differences from /dashboard/listings/[id]:
 *   - Menu lives here as a tab (no more separate /dashboard/menu/<id> route
 *     to lose mental context in).
 *   - POS is a first-class tab, not a tools-section deep link.
 *   - Features is a real switchboard, not a "coming soon" placeholder.
 *   - Stays/events are entirely excluded — eat is restaurant-only.
 */
export default async function EatListingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { user } = await getAuthUser();
  if (!user) redirect(`/login?returnTo=/eat/listings/${id}`);

  const isAdmin = await getIsAdmin(user.id);
  const hostProfile = await getHostProfile(user.id);
  if (!hostProfile && !isAdmin) redirect("/dashboard");

  // Fetch listing — restaurants only on this surface.
  // Dual restaurant check (type OR subcategory) so legacy listings like
  // Napule (subcategory: "restaurants") are also recognised.
  const listing = await sanityClient.fetch<{
    _id: string;
    title: string;
    slug: string;
    type: string;
    city: string | null;
  } | null>(
    isAdmin
      ? `*[_id == $id && _type == "listing" && (type == "restaurant" || subcategory == "restaurants")][0]{
          _id, title, "slug": slug.current, type, city
        }`
      : `*[
          _id == $id
          && _type == "listing"
          && (type == "restaurant" || subcategory == "restaurants")
          && (hostId == $userId || host._ref == $sanityHostId)
        ][0]{
          _id, title, "slug": slug.current, type, city
        }`,
    {
      id,
      userId: user.id,
      sanityHostId: hostProfile?.sanity_host_id ?? "",
    },
  );

  if (!listing) notFound();

  // Resolve linked menu — restaurants always have one (or are about to).
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

  // Pending reservations badge — shown on the Reservations tab when there's
  // action required. Cheap count query, runs in parallel with the layout.
  let pendingReservations = 0;
  if (menu) {
    const { count } = await adminClient
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("menu_id", menu.id)
      .eq("status", "pending");
    pendingReservations = count ?? 0;
  }

  // Tabs — fixed order, gated by feature status.
  // POS is rendered for any menu (not modelled in LISTING_FEATURES today).
  // Inactive features hide from the tab strip but show on the Features page.
  function isFeatureActive(id: string): boolean {
    const f = LISTING_FEATURES.find((x) => x.id === id);
    return f ? f.getStatus(featureCtx) === "active" : false;
  }

  const baseHref = `/eat/listings/${id}`;
  const tabs: TabItem[] = [
    { label: "Overview", href: baseHref },
  ];

  if (menu) {
    // Menu is always present when the listing has one — first tab after Overview.
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
  if (isFeatureActive("klickenya_kitchen")) {
    tabs.push({ label: "Kitchen", href: `${baseHref}/kitchen` });
  }
  if (menu) {
    // POS is always available once a menu exists.
    tabs.push({ label: "POS", href: `${baseHref}/pos` });
  }
  tabs.push({ label: "Features", href: `${baseHref}/features` });

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <Link
          href="/eat/listings"
          className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
        >
          ← Restaurants
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] flex-1 min-w-0 truncate">
            {listing.title}
          </h1>
          <span className="shrink-0 text-[11px] font-bold bg-[#E8A020]/10 text-[#E8A020] px-2.5 py-1 rounded-full">
            Restaurant
          </span>
        </div>
        {listing.city && (
          <p className="text-[13px] text-[#9C9485] mt-0.5">{listing.city}</p>
        )}
      </div>

      {/* Tab nav */}
      <ListingTabNav
        listingId={id}
        tabs={tabs}
        overviewHref={baseHref}
      />

      <div className="mt-5">{children}</div>
    </div>
  );
}

// Lucide icons re-exported for the Overview page's "active features" cards.
// Kept here so the icon-map stays adjacent to the feature config that names them.
export const FEATURE_ICONS: Record<string, typeof ChefHat> = {
  UtensilsCrossed,
  ShoppingCart,
  CalendarCheck,
  ChefHat,
  Smartphone,
  Settings: SettingsIcon,
  LayoutDashboard,
};
