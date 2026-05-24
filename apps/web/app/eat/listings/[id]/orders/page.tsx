import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser, getHostProfile, getIsAdmin } from "../../../../dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { TableOrderingClient } from "../../../../dashboard/listings/[id]/orders/TableOrderingClient";
import type { AreaOption, InitialTable } from "../../../../dashboard/listings/[id]/orders/TableOrderingClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * /eat/listings/[id]/orders — Table Ordering setup page in the /eat shell.
 * Forks from the legacy page so it can pass mode="ordering-only" +
 * featureBaseHref. Same data fetching as legacy.
 */
export default async function EatOrdersPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect(`/login?returnTo=/eat/listings/${id}/orders`);

  const isAdmin = await getIsAdmin(user.id);
  const hostProfile = await getHostProfile(user.id);
  if (!hostProfile && !isAdmin) redirect("/dashboard");

  // Dual restaurant check (type OR subcategory) — see /eat/listings/[id]/layout.tsx.
  const listing = await sanityClient.fetch<{ slug: string; title: string } | null>(
    isAdmin
      ? `*[_id == $id && _type == "listing" && (type == "restaurant" || subcategory == "restaurants")][0]{
          "slug": slug.current, title
        }`
      : `*[_id == $id && _type == "listing" && (type == "restaurant" || subcategory == "restaurants") && (hostId == $userId || host._ref == $sanityHostId)][0]{
          "slug": slug.current, title
        }`,
    { id, userId: user.id, sanityHostId: hostProfile?.sanity_host_id ?? "" },
  );
  if (!listing?.slug) redirect("/eat/listings");

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
          href={`/eat/listings/${id}`}
          className="text-[13px] text-[#9C9485] hover:text-[#16130C]"
        >
          ← Back to overview
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
          Table ordering
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-1 mb-5">
          Set up your menu first before turning on table ordering.
        </p>
        <Link
          href={`/eat/listings/${id}/menu`}
          className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-5 h-[44px] leading-[44px] rounded-full hover:bg-[#d4911c]"
        >
          Set up menu →
        </Link>
      </div>
    );
  }

  const [{ data: areasRaw }, { data: tablesRaw }] = await Promise.all([
    adminClient
      .from("restaurant_areas")
      .select("id, name, color_hex")
      .eq("menu_id", menu.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    adminClient
      .from("restaurant_tables")
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
      mode="ordering-only"
      featureBaseHref={`/eat/listings/${id}`}
    />
  );
}
