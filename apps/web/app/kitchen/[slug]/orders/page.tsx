import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { getPosMenuBySlug } from "@/app/pos/[slug]/_lib/menuFromSlug";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { KitchenHeader } from "@/components/kitchen/KitchenHeader";
import { StationDashboard, type DashboardOrder } from "@/components/dashboard/menu/StationDashboard";
import { StationTabs } from "@/components/dashboard/menu/StationTabs";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ station?: string }>;
}

export default async function KitchenOrdersPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
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

  // Read view mode from the menu (getPosMenuBySlug may not include it — fetch directly).
  const { data: menuMode } = await adminClient
    .from("menus").select("order_view_mode").eq("id", menu.id).single();
  if (menuMode?.order_view_mode === "split") {
    const defaultStation = session.role === "bar" ? "bar" : "kitchen";
    redirect(`/kitchen/${slug}/orders/${defaultStation}`);
  }

  const { count: barSectionCount } = await adminClient
    .from("menu_sections")
    .select("id", { count: "exact", head: true })
    .eq("menu_id", menu.id)
    .eq("station", "bar");
  const hasBarStation = (barSectionCount ?? 0) > 0;

  // Which stations is this PIN-authed user allowed to operate? Mirrors the
  // station-scope check in /api/menu/order-items/[id] set_station_status —
  // we don't want to render tabs they can't actually use (clicking would
  // 403 and the optimistic UI would snap back, looking like a bug).
  const allowedStations: ReadonlyArray<"kitchen" | "bar"> =
    session.role === "kitchen"
      ? ["kitchen"]
      : session.role === "bar"
      ? ["bar"]
      : ["kitchen", "bar"]; // manager / owner

  // Role-aware default + ?station override, clamped to allowedStations.
  const roleDefault: "kitchen" | "bar" =
    session.role === "bar" && hasBarStation ? "bar" : "kitchen";
  const requested =
    sp.station === "bar" ? "bar" : sp.station === "kitchen" ? "kitchen" : roleDefault;
  const clamped: "kitchen" | "bar" =
    allowedStations.includes(requested as "kitchen" | "bar")
      ? (requested as "kitchen" | "bar")
      : allowedStations[0];
  const activeStation: "kitchen" | "bar" =
    clamped === "bar" && !hasBarStation ? "kitchen" : clamped;

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

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F1EC]">
      <KitchenHeader slug={slug} menuName={menu.name}
        staffName={session.staff_name} role={session.role} />
      <div className="flex-1 p-4">
        <StationTabs
          activeStation={activeStation}
          hasBarStation={hasBarStation}
          baseHref={`/kitchen/${slug}/orders`}
          allowedStations={allowedStations}
        />
        <StationDashboard
          key={activeStation}
          menuId={menu.id}
          station={activeStation}
          initialOrders={enriched}
        />
      </div>
    </div>
  );
}
