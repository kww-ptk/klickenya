import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { getMenuTree } from "@/lib/cache/menu";
import type { MenuData } from "@/components/listings/detail/restaurant/MenuDisplay";
import { MenuBuilder } from "@/components/dashboard/menu/MenuBuilder";
import { ToastProvider } from "@/components/ui/Toast";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MenuBuilderPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();

  if (!user) redirect("/login");

  // Fetch menu tree (cached) + scan count (live) + reservation settings in parallel
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [menu, { count: scanCount }, menuSettings] = await Promise.all([
    getMenuTree(id, user.id),
    adminClient
      .from("menu_scans")
      .select("id", { count: "exact", head: true })
      .eq("menu_id", id)
      .gte("scanned_at", sevenDaysAgo),
    // Fetch reservation settings + listing_slug (uncached — these are operational flags,
    // not menu content, so we want fresh values on every dashboard load)
    adminClient
      .from("menus")
      .select(
        "listing_slug, reservations_enabled, default_reservation_duration, reservations_lead_time_hours, reservations_max_party_size, reservations_max_advance_days",
      )
      .eq("id", id)
      .eq("business_id", user.id)
      .single(),
  ]);

  if (!menu) redirect("/dashboard");

  const settings = menuSettings.data;
  const listingSlug = settings?.listing_slug ?? null;
  const reservationsEnabled = settings?.reservations_enabled ?? false;

  // Fetch listing city + Sanity _id from Sanity.
  // city: needed so MenuBuilder can pass listing_city in PATCH /api/menu/settings to bust ISR cache.
  // _id:  needed so MenuBuilder can link to /dashboard/listings/[id]/reservations.
  // Non-blocking: if Sanity is unreachable or listing not found, both are null.
  let listingCity: string | null = null;
  let listingId: string | null = null;
  if (listingSlug) {
    try {
      const sanityListing = await sanityClient.fetch<{ city: string; _id: string } | null>(
        `*[_type == "listing" && slug.current == $slug][0]{ city, _id }`,
        { slug: listingSlug },
      );
      listingCity = sanityListing?.city ?? null;
      listingId = sanityListing?._id ?? null;
    } catch {
      // Non-blocking — continue without city/id
    }
  }

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
        listingSlug={listingSlug}
        listingCity={listingCity}
        listingId={listingId}
      />
    </ToastProvider>
  );
}
