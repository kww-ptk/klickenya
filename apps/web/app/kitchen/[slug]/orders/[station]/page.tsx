import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { getPosMenuBySlug } from "@/app/pos/[slug]/_lib/menuFromSlug";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { KitchenHeader } from "@/components/kitchen/KitchenHeader";
import { StationDashboard, type DashboardOrder } from "@/components/dashboard/menu/StationDashboard";

interface PageProps {
  params: Promise<{ slug: string; station: string }>;
}

export default async function PinSingleStationPage({ params }: PageProps) {
  const { slug, station } = await params;
  if (station !== "kitchen" && station !== "bar") notFound();
  Sentry.setTag("route", "kitchen_orders");

  const menu = await getPosMenuBySlug(slug);
  if (!menu) notFound();

  const cookieStore = await cookies();
  const session = verifyPosSession(cookieStore.get(POS_SESSION_COOKIE)?.value);
  if (!session || session.menu_id !== menu.id) redirect(`/kitchen/${slug}`);
  if (session.role !== "kitchen" && session.role !== "manager" && session.role !== "bar") {
    redirect(`/pos/${slug}/tables`);
  }

  const { data: staffRow } = await adminClient
    .from("restaurant_staff").select("id, is_active").eq("id", session.staff_id).single();
  if (!staffRow || !staffRow.is_active) redirect(`/kitchen/${slug}`);

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
    .eq("menu_id", menu.id)
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
    <div className="min-h-screen flex flex-col bg-surface">
      <KitchenHeader slug={slug} menuName={menu.name}
        staffName={session.staff_name} role={session.role} />
      <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between">
        <p className="text-[12px] font-bold text-dark uppercase tracking-wide">
          {station === "kitchen" ? "🍳 Kitchen" : "🍹 Bar"}
        </p>
        <Link href={`/kitchen/${slug}/orders/${other}`}
          className="text-[11px] font-bold text-text2 border border-border rounded-full px-3 h-[28px] inline-flex items-center hover:bg-surface">
          Switch to {other === "kitchen" ? "Kitchen" : "Bar"} →
        </Link>
      </header>
      <div className="flex-1 p-4">
        <StationDashboard menuId={menu.id} station={station as "kitchen" | "bar"}
          initialOrders={enriched} />
      </div>
    </div>
  );
}
