import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings as SettingsIcon } from "lucide-react";
import { getAuthUser, getHostProfile, getIsAdmin } from "../../../../dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { ORDER_QUEUE_SELECT, ACTIVE_ORDER_STATUSES } from "@/lib/orders/projection";
import { LiveOrderQueue, type QueueOrder, type AddableDish } from "@/components/manage/LiveOrderQueue";
import { DeleteOrders } from "@/components/orders/DeleteOrders";
import { OrderTabletPanel } from "@/components/manage/OrderTabletPanel";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * /manage/listings/[id]/orders — the LIVE ORDER QUEUE.
 *
 * "Orders" used to open the setup screen, which is not what an owner means by
 * the word. Settings now live at /orders/setup; this is what comes in today.
 *
 * Server-renders the first page so the queue is populated on arrival, then
 * the client polls. Delivery, takeaway and table orders share one list —
 * splitting them would make the owner check three places during a rush.
 */
export default async function ManageOrdersPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect(`/login?returnTo=/manage/listings/${id}/orders`);

  const [isAdmin, hostProfile] = await Promise.all([getIsAdmin(user.id), getHostProfile(user.id)]);
  if (!hostProfile && !isAdmin) redirect("/dashboard");

  // Dual restaurant check (type OR subcategory) — see /manage/listings/[id]/layout.tsx.
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
  if (!listing?.slug) redirect("/manage/listings");

  let menuQuery = adminClient
    .from("menus")
    .select("id, name, slug, table_ordering, takeaway_enabled, delivery_enabled")
    .eq("listing_slug", listing.slug);
  if (!isAdmin) menuQuery = menuQuery.eq("business_id", user.id);
  const { data: menu } = await menuQuery.maybeSingle();

  const setupHref = `/manage/listings/${id}/orders/setup`;

  if (!menu) {
    return (
      <div>
        <Link href={`/manage/listings/${id}`} className="text-[13px] text-[#9C9485] hover:text-[#16130C]">
          ← Back to overview
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
          Orders
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-1 mb-5">
          Set up your menu first — orders come from it.
        </p>
        <Link
          href={`/manage/listings/${id}/menu`}
          className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-5 h-[44px] leading-[44px] rounded-full hover:bg-[#d4911c]"
        >
          Set up menu →
        </Link>
      </div>
    );
  }

  // The queue, the Food Delivery Station's PIN and the dish picker all hang
  // off menu.id alone, so they go out together rather than one after another.
  //
  // Dishes for the "add to this order" picker are server-rendered rather than
  // fetched on demand: there is no GET on /api/menu/items, a restaurant menu
  // is ~40-150 rows, and the owner opening this page is about to work orders
  // from it. !inner on menu_sections scopes to THIS menu.
  const [{ data: rows, error: ordersError }, { data: stationRow }, { data: dishRows }] =
    await Promise.all([
      adminClient
        .from("orders")
        .select(ORDER_QUEUE_SELECT)
        .eq("menu_id", menu.id)
        .in("status", [...ACTIVE_ORDER_STATUSES])
        .order("created_at", { ascending: false }),
      adminClient
        .from("restaurant_staff")
        .select("pin")
        .eq("menu_id", menu.id)
        .eq("role", "delivery")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
      adminClient
        .from("menu_items")
        .select("id, name, price_kes, is_available, menu_sections!inner ( menu_id )")
        .eq("menu_sections.menu_id", menu.id)
        .eq("is_available", true)
        .order("name", { ascending: true }),
    ]);

  // A failed read must not look like a quiet afternoon. PostgREST answers a
  // missing column with 400 and `data` is then null — which used to render
  // "No orders right now" over a live queue. Surface it instead.
  if (ordersError) console.error("[manage/orders] orders query failed:", ordersError);

  const rawOrders = (rows ?? []) as unknown as QueueOrder[];

  // Rider names for the FIRST paint. The poll enriches them after 10s, but an
  // owner opening the page to "a rider is on the way" and no name for ten
  // seconds is a worse answer than waiting one query for it.
  const riderIds = Array.from(
    new Set(rawOrders.map((o) => o.rider_id).filter((v): v is string => !!v)),
  );
  const riderMap = new Map<string, { name: string; phone: string }>();
  if (riderIds.length > 0) {
    const { data: riderRows } = await adminClient
      .from("riders")
      .select("id, name, phone")
      .in("id", riderIds);
    for (const r of riderRows ?? []) riderMap.set(r.id as string, { name: r.name, phone: r.phone });
  }
  const orders: QueueOrder[] = rawOrders.map((o) => ({
    ...o,
    rider_name: o.rider_id ? riderMap.get(o.rider_id)?.name ?? null : null,
    rider_phone: o.rider_id ? riderMap.get(o.rider_id)?.phone ?? null : null,
  }));

  // The Food Delivery Station's PIN, shown next to the link it opens.
  const deliveryStationPin: string | null =
    (stationRow as { pin?: string } | null)?.pin ?? null;

  const dishes: AddableDish[] = (dishRows ?? []).map((d) => ({
    id: d.id as string,
    name: d.name as string,
    priceKes: Number(d.price_kes ?? 0),
  }));

  // Which channels are actually open. If none are, the empty queue would be
  // indistinguishable from a quiet afternoon — so say which it is.
  const channels = [
    menu.delivery_enabled ? "Delivery" : null,
    menu.takeaway_enabled ? "Takeaway" : null,
    menu.table_ordering ? "Table" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link href={`/manage/listings/${id}`} className="text-[13px] text-[#9C9485] hover:text-[#16130C]">
            ← Back to overview
          </Link>
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
            Orders
          </h1>
          <p className="text-[13px] text-[#9C9485] mt-1">
            {channels.length > 0
              ? `Live queue — ${channels.join(" · ")} · updates on its own`
              : "No ordering channel is switched on yet."}
          </p>
        </div>

        <Link
          href={setupHref}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E2DDD5] bg-white px-4 h-[40px] text-[13px] font-bold text-[#16130C] hover:border-[#C8C0B2]"
        >
          <SettingsIcon className="size-4" aria-hidden />
          Ordering setup
        </Link>
      </div>

      {ordersError && (
        <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4">
          <p className="text-[13.5px] font-bold text-red-800">The order queue could not be read</p>
          <p className="text-[12px] font-mono text-red-700 mt-1">{ordersError.message}</p>
        </div>
      )}

      {channels.length === 0 ? (
        <div className="rounded-2xl border border-[#E8A020]/40 bg-[#E8A020]/[0.06] p-6">
          <p className="font-display text-[16px] font-bold text-[#16130C]">
            Nobody can order yet
          </p>
          <p className="text-[13px] text-[#6B6355] mt-1 mb-4 max-w-[520px]">
            Turn on delivery or takeaway and add the WhatsApp number that should receive
            orders. Until then your restaurant is listed but cannot be ordered from.
          </p>
          <Link
            href={setupHref}
            className="inline-block bg-[#16130C] text-white font-bold text-[13px] px-5 h-[42px] leading-[42px] rounded-full hover:bg-[#2A251A]"
          >
            Open ordering setup →
          </Link>
        </div>
      ) : (
        <LiveOrderQueue menuId={menu.id} initialOrders={orders} dishes={dishes} />
      )}

      {/* Putting this queue on the counter. Here rather than on the POS tab,
          because that tab disappears when POS is off — and a delivery-only
          kitchen is exactly the one that needs a tablet. */}
      <OrderTabletPanel
        menuId={menu.id}
        menuSlug={menu.slug as string}
        stationPin={deliveryStationPin}
      />

      {/* Clearing test data. Below the queue, not beside it — this is a setup
          task, not part of working a shift. */}
      <details className="rounded-2xl border border-[#E2DDD5] bg-white">
        <summary className="cursor-pointer list-none p-4 text-[13px] font-bold text-[#9C9485] hover:text-[#16130C]">
          Clear test orders…
        </summary>
        <div className="border-t border-[#F4F1EC] p-4 space-y-3">
          <p className="text-[13px] text-[#6B6355] max-w-[560px]">
            Deletes orders for this restaurant permanently, including delivered ones.
            Intended for clearing test data while you set up — not for tidying a real
            service.
          </p>
          <DeleteOrders menuId={menu.id} mode="all" />
        </div>
      </details>
    </div>
  );
}
