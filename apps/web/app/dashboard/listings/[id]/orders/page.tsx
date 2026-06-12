import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser, getHostProfile, getIsAdmin } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { TableOrderingClient } from "./TableOrderingClient";
import type { AreaOption, InitialTable } from "./TableOrderingClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Table ordering setup page.
 *
 * Three things owners care about here:
 *   1. Toggle the feature on/off
 *   2. Manage the list of tables (CRUD via the existing TableSetup component)
 *   3. Quick deep-links to live operational surfaces (Kitchen view, Audit log, QR)
 *
 * The live kitchen-view screen lives at /dashboard/menu/[menu.id]/orders --
 * that's a separate route, linked-to but not embedded.
 */
export default async function TableOrderingSetupPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const isAdmin = await getIsAdmin(user.id);

  const hostProfile = await getHostProfile(user.id);
  // Admin users may not have a host_profile — only redirect non-admins
  if (!hostProfile && !isAdmin) redirect("/dashboard");

  // Mirror layout's pattern: admin bypasses ownership filter
  const listing = await sanityClient.fetch<{ slug: string; title: string } | null>(
    isAdmin
      ? `*[_id == $id && (_type == "listing" || _type == "event")][0]{
          "slug": slug.current, title
        }`
      : `*[_id == $id && (hostId == $userId || host._ref == $sanityHostId)][0]{
          "slug": slug.current, title
        }`,
    { id, userId: user.id, sanityHostId: hostProfile?.sanity_host_id ?? "" },
  );
  if (!listing?.slug) redirect("/dashboard/listings");

  // Admin bypasses business_id ownership filter (layout already validated listing ownership).
  let menuQuery = adminClient
    .from("menus")
    .select("id, name, slug, table_ordering, listing_slug")
    .eq("listing_slug", listing.slug);
  if (!isAdmin) menuQuery = menuQuery.eq("business_id", user.id);
  const { data: menu } = await menuQuery.maybeSingle();

  if (!menu) {
    return (
      <div>
        <Link
          href={`/dashboard/listings/${id}`}
          className="text-[13px] text-text3 hover:text-dark"
        >
          ← Back to dashboard
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark mt-2">
          Table ordering
        </h1>
        <p className="text-[13px] text-text3 mt-1 mb-5">
          Set up your menu first before turning on table ordering.
        </p>
        <Link
          href={`/dashboard/listings/${id}`}
          className="inline-block bg-amber text-dark font-bold text-[13px] px-5 h-[44px] leading-[44px] rounded-full hover:bg-[#d4911c]"
        >
          Set up menu →
        </Link>
      </div>
    );
  }

  // Reservation areas double as floor sections in TableSetup AND drive
  // the floor-map area picker. color_hex tints the picker's active pill.
  // Tables are fetched in the same parallel batch — the floor map needs
  // pos_x / pos_y / area_id beyond the list-view fields.
  const [{ data: areasRaw }, { data: tablesRaw }] = await Promise.all([
    adminClient
      .from("restaurant_areas")
      .select("id, name, color_hex")
      .eq("menu_id", menu.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    adminClient
      .from("restaurant_tables")
      // floor_section is the legacy text label (migration 045). The canvas
      // uses it as a fallback when area_id is null so pre-V1 data shows up.
      .select("id, table_number, capacity, pos_x, pos_y, area_id, floor_section, is_active")
      .eq("menu_id", menu.id)
      .order("display_order", { ascending: true }),
  ]);

  return (
    <TableOrderingClient
      listingId={id}
      menuId={menu.id}
      menuName={menu.name}
      menuSlug={menu.slug}
      initialTableOrdering={menu.table_ordering ?? false}
      areas={(areasRaw ?? []) as AreaOption[]}
      initialTables={(tablesRaw ?? []) as InitialTable[]}
    />
  );
}
