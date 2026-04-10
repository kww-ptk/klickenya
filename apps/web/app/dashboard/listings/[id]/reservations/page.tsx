import { redirect } from "next/navigation";
import { getAuthUser, getHostProfile } from "../../../_lib/auth";
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

  const hostProfile = await getHostProfile(user.id);
  if (!hostProfile) redirect("/dashboard");

  // Fetch listing ownership (layout already validated, but we need slug + city for URLs)
  const listing = await sanityClient.fetch<{
    slug: string;
    city: string | null;
  } | null>(
    `*[_id == $id && (hostId == $userId || host._ref == $sanityHostId)][0]{
      "slug": slug.current, city
    }`,
    { id, userId: user.id, sanityHostId: hostProfile.sanity_host_id ?? "" },
  );

  if (!listing) redirect("/dashboard/listings");

  // Fetch linked menu (same query as layout, but needs reservations_enabled + slug)
  const { data: menu } = listing.slug
    ? await adminClient
        .from("menus")
        .select("id, name, slug, reservations_enabled")
        .eq("listing_slug", listing.slug)
        .eq("business_id", user.id)
        .maybeSingle()
    : { data: null };

  // Guard: reservations not enabled → redirect to overview
  if (!menu || !menu.reservations_enabled) {
    redirect(`/dashboard/listings/${id}`);
  }

  // Parallel fetch: initial reservations + all areas (active + inactive for floor view)
  const [initialReservations, areasResult] = await Promise.all([
    fetchReservations(menu.id).catch(() => []),
    adminClient
      .from("restaurant_areas")
      .select("id, name, capacity_total, display_order, color_hex, is_active")
      .eq("menu_id", menu.id)
      .order("display_order"),
  ]);

  const areas = areasResult.data ?? [];
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
      />
    </ToastProvider>
  );
}
