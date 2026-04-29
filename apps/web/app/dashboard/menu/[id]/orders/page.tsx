import * as Sentry from "@sentry/nextjs";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { KitchenDashboard, type KitchenOrder } from "@/components/dashboard/menu/KitchenDashboard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KitchenDashboardPage({ params }: PageProps) {
  const { id } = await params;
  Sentry.setTag("route", "kitchen_orders");
  const { user } = await getAuthUser();

  if (!user) redirect("/login");

  // Verify the menu belongs to this user and table ordering is enabled
  const { data: menu } = await adminClient
    .from("menus")
    .select("id, name, table_ordering, is_published")
    .eq("id", id)
    .eq("business_id", user.id)
    .single();

  if (!menu) redirect("/dashboard");

  // Table ordering must be enabled to use the kitchen dashboard
  if (!menu.table_ordering) {
    redirect(`/dashboard/menu/${id}`);
  }

  // Fetch initial active orders (new, preparing, ready) with their items
  const { data: orders } = await adminClient
    .from("orders")
    .select(`
      id,
      status,
      table_number,
      customer_name,
      notes,
      total_kes,
      created_at,
      waiter_id,
      order_items (
        id,
        item_name,
        item_price,
        quantity,
        notes,
        selected_options,
        allergy_notes,
        line_total
      )
    `)
    .eq("menu_id", id)
    .in("status", ["new", "preparing", "ready"])
    .order("created_at", { ascending: false });

  // Resolve waiter names so the first paint shows the staff chip without
  // waiting for the first poll to enrich.
  const waiterIds = Array.from(
    new Set((orders ?? []).map((o) => o.waiter_id).filter((v): v is string => !!v)),
  );
  const waiterMap = new Map<string, string>();
  if (waiterIds.length > 0) {
    const { data: waiters } = await adminClient
      .from("restaurant_staff")
      .select("id, name")
      .in("id", waiterIds);
    for (const w of waiters ?? []) waiterMap.set(w.id, w.name);
  }

  const enriched = (orders ?? []).map((o) => ({
    ...o,
    waiter_name: o.waiter_id ? waiterMap.get(o.waiter_id) ?? null : null,
  })) as KitchenOrder[];

  return (
    <KitchenDashboard
      menuId={menu.id}
      menuName={menu.name}
      initialOrders={enriched}
    />
  );
}
