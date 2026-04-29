import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { getPosMenuBySlug } from "@/app/pos/[slug]/_lib/menuFromSlug";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { KitchenDashboard, type KitchenOrder } from "@/components/dashboard/menu/KitchenDashboard";
import { KitchenHeader } from "@/components/kitchen/KitchenHeader";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Kitchen orders view (PIN-authed). Same KitchenDashboard component as the
 * dashboard variant, but powered by staff PIN auth and wrapped with a small
 * header that shows the signed-in staff + a "Switch staff" button.
 *
 * Auth gate:
 *   - kitchen role → access granted
 *   - manager role → access granted (managers can do anything)
 *   - waiter / cashier → bounced to /pos/[slug]/tables
 *   - no cookie / wrong menu → bounced to /kitchen/[slug] login
 */
export default async function KitchenOrdersPage({ params }: PageProps) {
  const { slug } = await params;
  Sentry.setTag("route", "kitchen_orders");

  const menu = await getPosMenuBySlug(slug);
  if (!menu) notFound();

  const cookieStore = await cookies();
  const session = verifyPosSession(cookieStore.get(POS_SESSION_COOKIE)?.value);
  if (!session || session.menu_id !== menu.id) {
    redirect(`/kitchen/${slug}`);
  }
  if (session.role !== "kitchen" && session.role !== "manager") {
    redirect(`/pos/${slug}/tables`);
  }

  // Verify staff is still active (defence against a deactivation mid-shift).
  const { data: staffRow } = await adminClient
    .from("restaurant_staff")
    .select("id, is_active")
    .eq("id", session.staff_id)
    .single();
  if (!staffRow || !staffRow.is_active) {
    redirect(`/kitchen/${slug}`);
  }

  // First-paint orders. The client polls /api/menu/orders for live updates
  // — same endpoint, now PIN-aware.
  const { data: orders } = await adminClient
    .from("orders")
    .select(`
      id, status, table_number, customer_name, notes,
      total_kes, created_at, waiter_id,
      order_items (
        id, item_name, item_price, quantity, notes,
        selected_options, allergy_notes, line_total
      )
    `)
    .eq("menu_id", menu.id)
    .in("status", ["new", "preparing", "ready"])
    .order("created_at", { ascending: false });

  // Resolve waiter names so the kitchen card shows "Marco" on first paint.
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
    <div className="min-h-screen flex flex-col">
      <KitchenHeader
        slug={slug}
        menuName={menu.name}
        staffName={session.staff_name}
        role={session.role}
      />
      <div className="flex-1">
        <KitchenDashboard
          menuId={menu.id}
          menuName={menu.name}
          initialOrders={enriched}
        />
      </div>
    </div>
  );
}
