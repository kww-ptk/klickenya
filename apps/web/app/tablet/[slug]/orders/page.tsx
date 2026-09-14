import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getPosMenuBySlug } from "@/app/pos/[slug]/_lib/menuFromSlug";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { TabletHeader } from "@/components/tablet/TabletHeader";
import { ORDER_QUEUE_SELECT, ACTIVE_ORDER_STATUSES } from "@/lib/orders/projection";
import { LiveOrderQueue, type QueueOrder } from "@/components/manage/LiveOrderQueue";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * /tablet/[slug]/orders — the owner's order queue, on the counter tablet.
 *
 * Same component the owner sees at /manage/listings/[id]/orders, reached with
 * a staff PIN instead of an owner login. The restaurant team should not need
 * the owner's password to work the orders in front of them, and the owner
 * should not have to be present for the kitchen to mark something ready.
 *
 * Deliberately whole orders rather than the station view next door: a rider
 * collecting needs the entire bag, and the handover code belongs to the
 * order, not to a station.
 *
 * /api/menu/orders already accepts either a POS staff session or the owner
 * (getPosOrOwnerAuth), so the status buttons work here with no API change.
 */
export default async function KitchenDeliveriesPage({ params }: PageProps) {
  const { slug } = await params;

  const menu = await getPosMenuBySlug(slug);
  if (!menu) notFound();

  const cookieStore = await cookies();
  const session = verifyPosSession(cookieStore.get(POS_SESSION_COOKIE)?.value);
  if (!session || session.menu_id !== menu.id) redirect(`/tablet/${slug}`);

  const { data: staffRow } = await adminClient
    .from("restaurant_staff")
    .select("id, is_active")
    .eq("id", session.staff_id)
    .single();
  if (!staffRow || !staffRow.is_active) redirect(`/tablet/${slug}`);

  const { data: rows, error: ordersError } = await adminClient
    .from("orders")
    .select(ORDER_QUEUE_SELECT)
    .eq("menu_id", menu.id)
    .in("status", [...ACTIVE_ORDER_STATUSES])
    .order("created_at", { ascending: false });

  // A failed read must not look like a quiet afternoon. PostgREST answers a
  // missing column with 400 and `data` is then null — which used to render
  // "No orders right now" over a live queue. Surface it instead.
  if (ordersError) console.error("[tablet/orders] orders query failed:", ordersError);

  const rawOrders = (rows ?? []) as unknown as QueueOrder[];

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

  return (
    <div className="min-h-screen bg-[#0F0D08]">
      <TabletHeader
        menuName={menu.name}
        slug={slug}
        staffName={session.staff_name}
        role={session.role}
      />
      {/* The queue is built for the light dashboard; give it a light surface
          rather than restyling every card for the dark terminal shell. */}
      <div className="bg-[#FAF8F5] min-h-[calc(100vh-64px)] p-4 lg:p-6">
        <h1 className="font-display text-[20px] font-bold text-[#16130C] mb-4">
          Orders
        </h1>
        {ordersError && (
          <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 mb-4">
            <p className="text-[13.5px] font-bold text-red-800">The order queue could not be read</p>
            <p className="text-[12px] font-mono text-red-700 mt-1">{ordersError.message}</p>
          </div>
        )}
        <LiveOrderQueue menuId={menu.id} initialOrders={orders} />
      </div>
    </div>
  );
}
