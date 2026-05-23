import * as Sentry from "@sentry/nextjs";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { safeBackHref } from "@/app/dashboard/_lib/back-href";
import { adminClient } from "@/lib/supabase/admin";
import { StationDashboard, type DashboardOrder } from "@/components/dashboard/menu/StationDashboard";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ back?: string }>;
}

export default async function OrdersPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const backHref = safeBackHref(sp.back);
  Sentry.setTag("route", "kitchen_orders");
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, name, table_ordering, order_view_mode")
    .eq("id", id)
    .eq("business_id", user.id)
    .single();
  if (!menu) redirect("/dashboard");
  if (!menu.table_ordering) redirect(`/dashboard/menu/${id}`);

  // Split mode: kick over to the per-station route (kitchen by default).
  if (menu.order_view_mode === "split") {
    redirect(`/dashboard/menu/${id}/orders/kitchen`);
  }

  const { data: orders } = await adminClient
    .from("orders")
    .select(`
      id, status, table_number, customer_name, notes,
      total_kes, created_at, waiter_id,
      order_items (
        id, item_name, item_price, quantity, notes,
        selected_options, allergy_notes, line_total,
        station, station_status, is_voided
      )
    `)
    .eq("menu_id", id)
    .in("status", ["new", "preparing", "ready"])
    .order("created_at", { ascending: false });

  const waiterIds = Array.from(
    new Set((orders ?? []).map((o) => o.waiter_id).filter((v): v is string => !!v)),
  );
  const waiterMap = new Map<string, string>();
  if (waiterIds.length > 0) {
    const { data: waiters } = await adminClient
      .from("restaurant_staff").select("id, name").in("id", waiterIds);
    for (const w of waiters ?? []) waiterMap.set(w.id, w.name);
  }
  const enriched = (orders ?? []).map((o) => ({
    ...o, waiter_name: o.waiter_id ? waiterMap.get(o.waiter_id) ?? null : null,
  })) as DashboardOrder[];

  return (
    <div className="min-h-screen bg-[#F4F1EC]">
      <header className="bg-white border-b border-[#E2DDD5] px-4 lg:px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-widest">Orders</p>
          <h1 className="font-display text-[22px] font-bold text-[#16130C]">{menu.name}</h1>
        </div>
        {backHref && (
          <a href={backHref} className="text-[12px] font-bold text-[#5E5848] underline">Back</a>
        )}
      </header>
      <div className="p-4 lg:p-6 flex gap-4 items-start">
        <StationDashboard menuId={menu.id} station="kitchen"
          initialOrders={enriched} filterToStation />
        <StationDashboard menuId={menu.id} station="bar"
          initialOrders={enriched} filterToStation />
      </div>
    </div>
  );
}
