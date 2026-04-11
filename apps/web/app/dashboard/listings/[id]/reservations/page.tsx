import { redirect } from "next/navigation";
import { getAuthUser, getHostProfile, getIsAdmin } from "../../../_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { fetchReservations } from "@/app/api/menu/reservations/_lib/queries";
import { ReservationsDashboard } from "@/components/dashboard/listings/ReservationsDashboard";
import { ToastProvider } from "@/components/ui/Toast";

export default async function ReservationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const isAdmin = await getIsAdmin(user.id);

  const hostProfile = await getHostProfile(user.id);
  // Admin users may not have a host_profile — only redirect non-admins
  if (!hostProfile && !isAdmin) redirect("/dashboard");

  // Fetch listing — admin bypasses ownership filter
  const listing = await sanityClient.fetch<{
    slug: string;
    city: string | null;
  } | null>(
    isAdmin
      ? `*[_id == $id][0]{ "slug": slug.current, city }`
      : `*[_id == $id && (hostId == $userId || host._ref == $sanityHostId)][0]{
          "slug": slug.current, city
        }`,
    { id, userId: user.id, sanityHostId: hostProfile?.sanity_host_id ?? "" },
  );

  if (!listing) redirect("/dashboard/listings");

  // Fetch linked menu — admin bypasses business_id ownership filter
  let menuQuery = adminClient
    .from("menus")
    .select(
      "id, name, slug, reservations_enabled, table_ordering, default_reservation_duration, reservations_lead_time_hours, reservations_max_party_size, reservations_max_advance_days",
    )
    .eq("listing_slug", listing.slug);
  if (!isAdmin) menuQuery = menuQuery.eq("business_id", user.id);

  const { data: menu } = listing.slug
    ? await menuQuery.maybeSingle()
    : { data: null };

  // Guard: reservations not enabled → redirect to overview
  if (!menu || !menu.reservations_enabled) {
    redirect(`/dashboard/listings/${id}`);
  }

  // Parallel fetch: initial reservations + all areas (active + inactive for floor view) + time windows
  const [initialReservations, areasResult, windowsResult] = await Promise.all([
    fetchReservations(menu.id).catch(() => []),
    adminClient
      .from("restaurant_areas")
      .select("id, name, capacity_total, display_order, color_hex, is_active")
      .eq("menu_id", menu.id)
      .order("display_order"),
    adminClient
      .from("reservation_time_windows")
      .select("id, menu_id, open_time, close_time, label, display_order, is_active")
      .eq("menu_id", menu.id)
      .order("display_order"),
  ]);

  const areas = areasResult.data ?? [];
  const timeWindows = windowsResult.data ?? [];
  const initialFetchedAt = new Date().toISOString();

  return (
    <ToastProvider>
      <ReservationsDashboard
        menuId={menu.id}
        menuName={menu.name}
        menuSlug={menu.slug ?? ""}
        listingId={id}
        listingSlug={listing.slug}
        listingCity={listing.city ?? null}
        initialReservations={initialReservations}
        areas={areas}
        initialFetchedAt={initialFetchedAt}
        tableOrdering={menu.table_ordering ?? false}
        menuSettings={{
          reservationsEnabled: menu.reservations_enabled ?? true,
          duration: menu.default_reservation_duration ?? 90,
          leadTime: menu.reservations_lead_time_hours ?? 2,
          maxParty: menu.reservations_max_party_size ?? 12,
          maxAdvance: menu.reservations_max_advance_days ?? 30,
          listingCity: listing.city ?? null,
          timeWindows,
        }}
      />
    </ToastProvider>
  );
}
