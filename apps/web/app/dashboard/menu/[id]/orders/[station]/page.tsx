import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { StationDashboard, type DashboardOrder } from "@/components/dashboard/menu/StationDashboard";

interface PageProps {
  params: Promise<{ id: string; station: string }>;
}

export default async function OwnerSingleStationPage({ params }: PageProps) {
  const { id, station } = await params;
  if (station !== "kitchen" && station !== "bar") notFound();

  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, name, table_ordering")
    .eq("id", id)
    .eq("business_id", user.id)
    .single();
  if (!menu) redirect("/dashboard");
  if (!menu.table_ordering) redirect(`/dashboard/menu/${id}`);

  const { data: orders } = await adminClient
    .from("orders")
    .select(`
      id, status, order_type, table_number, customer_name, customer_phone, estimated_ready_at, notes,
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

  const other = station === "kitchen" ? "bar" : "kitchen";

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white border-b border-border px-4 lg:px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-text3 uppercase tracking-widest">
            {station === "kitchen" ? "🍳 Kitchen" : "🍹 Bar"}
          </p>
          <h1 className="font-display text-[22px] font-bold text-dark">{menu.name}</h1>
        </div>
        <Link href={`/dashboard/menu/${menu.id}/orders/${other}`}
          className="text-[12px] font-bold text-text2 border border-border rounded-full px-3 h-[32px] inline-flex items-center hover:bg-white">
          Switch to {other === "kitchen" ? "Kitchen" : "Bar"} →
        </Link>
      </header>
      <div className="p-4 lg:p-6">
        <StationDashboard menuId={menu.id} station={station as "kitchen" | "bar"}
          initialOrders={enriched} />
      </div>
    </div>
  );
}
