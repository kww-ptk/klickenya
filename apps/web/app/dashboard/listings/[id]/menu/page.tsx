import { redirect, notFound } from "next/navigation";
import { getAuthUser, getHostProfile, getIsAdmin } from "../../../_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { getMenuTree } from "@/lib/cache/menu";
import type { MenuData } from "@/components/listings/detail/restaurant/MenuDisplay";
import { MenuBuilder } from "@/components/dashboard/menu/MenuBuilder";
import { ToastProvider } from "@/components/ui/Toast";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * /dashboard/listings/<sanityListingId>/menu — MenuBuilder addressed by the
 * listing id (instead of the menu id) so it lives inside the listing
 * dashboard's tab structure. Same component as the legacy /dashboard/menu/<id>
 * route; the legacy route stays around for backward compatibility.
 *
 * Resolves the menu via the listing → slug → menu lookup chain that the
 * layout already used; we re-do it here because page components don't
 * receive layout-fetched data.
 */
export default async function ListingMenuPage({ params }: PageProps) {
  const { id: listingId } = await params;

  const { user } = await getAuthUser();
  if (!user) redirect(`/login?returnTo=/dashboard/listings/${listingId}/menu`);

  const isAdmin = await getIsAdmin(user.id);
  const hostProfile = await getHostProfile(user.id);
  if (!hostProfile && !isAdmin) redirect("/dashboard");

  // Restaurant-only listing fetch (dual type/subcategory check — see layout).
  const listing = await sanityClient.fetch<{ slug: string; city: string | null } | null>(
    isAdmin
      ? `*[_id == $id && _type == "listing" && (type == "restaurant" || subcategory == "restaurants")][0]{ "slug": slug.current, city }`
      : `*[_id == $id && _type == "listing" && (type == "restaurant" || subcategory == "restaurants") && (hostId == $userId || host._ref == $sanityHostId)][0]{
          "slug": slug.current, city
        }`,
    {
      id: listingId,
      userId: user.id,
      sanityHostId: hostProfile?.sanity_host_id ?? "",
    },
  );

  if (!listing?.slug) notFound();

  let menuRowQuery = adminClient
    .from("menus")
    .select("id, business_id")
    .eq("listing_slug", listing.slug);
  if (!isAdmin) menuRowQuery = menuRowQuery.eq("business_id", user.id);
  const { data: menuRow } = await menuRowQuery.maybeSingle();

  if (!menuRow) {
    // No menu yet → punt to the menu creation flow.
    redirect("/dashboard/menus");
  }

  // Fetch menu tree + scan count + settings in parallel — same shape as the
  // legacy /dashboard/menu/[id]/page.tsx. Cached for the owner-id pair.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [menu, { count: scanCount }, menuSettings] = await Promise.all([
    getMenuTree(menuRow.id, menuRow.business_id),
    adminClient
      .from("menu_scans")
      .select("id", { count: "exact", head: true })
      .eq("menu_id", menuRow.id)
      .gte("scanned_at", sevenDaysAgo),
    adminClient
      .from("menus")
      .select(
        "listing_slug, reservations_enabled, default_reservation_duration, reservations_lead_time_hours, reservations_max_party_size, reservations_max_advance_days, stock_enabled, order_view_mode",
      )
      .eq("id", menuRow.id)
      .single(),
  ]);

  if (!menu) notFound();

  const settings = menuSettings.data;
  const reservationsEnabled = settings?.reservations_enabled ?? false;
  const stockEnabled = settings?.stock_enabled ?? false;

  return (
    <ToastProvider>
      <MenuBuilder
        menu={menu as MenuData}
        scanCount={scanCount ?? 0}
        tableOrdering={menu.table_ordering ?? false}
        reservationsEnabled={reservationsEnabled}
        defaultReservationDuration={settings?.default_reservation_duration ?? 90}
        reservationsLeadTimeHours={settings?.reservations_lead_time_hours ?? 2}
        reservationsMaxPartySize={settings?.reservations_max_party_size ?? 12}
        reservationsMaxAdvanceDays={settings?.reservations_max_advance_days ?? 30}
        listingSlug={listing.slug}
        listingCity={listing.city}
        listingId={listingId}
        stockEnabled={stockEnabled}
        orderViewMode={(settings?.order_view_mode as "combined" | "split") ?? "combined"}
        backHref={`/dashboard/listings/${listingId}`}
        backLabel="← Back to overview"
        // Menu page is single-purpose: create menu, publish, download QR.
        // Reservations / ordering / kitchen each have their own tab and
        // surface here as hint cards that link out.
        mode="menu-only"
        featureBaseHref={`/dashboard/listings/${listingId}`}
      />
    </ToastProvider>
  );
}
