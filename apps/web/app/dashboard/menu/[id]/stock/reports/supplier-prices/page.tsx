import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { SupplierPricesClient, type IngredientPriceHistory } from "./SupplierPricesClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

function sixMonthsAgoIso(): string {
  return new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
}

export default async function SupplierPricesPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, stock_enabled")
    .eq("id", id)
    .eq("business_id", user.id)
    .single();
  if (!menu) redirect("/dashboard");
  if (!menu.stock_enabled) redirect(`/dashboard/menu/${id}/stock`);

  // Pull every received PO line from the last 6 months and group client-side.
  // Two round-trips: PO line items (for unit_cost over time) + ingredient names + supplier names.
  const sinceIso = sixMonthsAgoIso();

  const [linesRes, ingsRes, supRes, alertsRes] = await Promise.all([
    adminClient
      .from("purchase_order_items")
      .select(
        "id, ingredient_id, qty, unit_cost, qty_received, purchase_order_id, purchase_orders!inner(business_id, supplier_id, status, ordered_at, received_at, created_at)",
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq("purchase_orders.business_id", user.id as any)
      .gte("purchase_orders.created_at", sinceIso)
      .limit(2000),
    adminClient
      .from("ingredients")
      .select("id, name, unit, cost_per_unit")
      .eq("business_id", user.id)
      .eq("archived", false),
    adminClient
      .from("suppliers")
      .select("id, name")
      .eq("business_id", user.id),
    adminClient.rpc("fn_supplier_price_alerts"),
  ]);

  // Group lines by ingredient → time series. Use received_at when available,
  // else ordered_at, else created_at; fallback to "no date".
  const ingredientName = new Map<string, { name: string; unit: string; current_cost: number }>();
  for (const i of ingsRes.data ?? []) {
    ingredientName.set(i.id, { name: i.name, unit: i.unit, current_cost: Number(i.cost_per_unit) });
  }
  const supplierName = new Map<string, string>();
  for (const s of supRes.data ?? []) supplierName.set(s.id, s.name);

  type RawLine = {
    ingredient_id: string;
    unit_cost: number;
    qty: number;
    purchase_orders:
      | { supplier_id: string | null; received_at: string | null; ordered_at: string | null; created_at: string }
      | { supplier_id: string | null; received_at: string | null; ordered_at: string | null; created_at: string }[];
  };
  const byIngredient = new Map<string, IngredientPriceHistory>();
  for (const ln of (linesRes.data ?? []) as unknown as RawLine[]) {
    const po = Array.isArray(ln.purchase_orders) ? ln.purchase_orders[0] : ln.purchase_orders;
    if (!po) continue;
    const at = po.received_at ?? po.ordered_at ?? po.created_at;
    const meta = ingredientName.get(ln.ingredient_id);
    if (!meta) continue;
    const existing = byIngredient.get(ln.ingredient_id) ?? {
      ingredient_id: ln.ingredient_id,
      ingredient_name: meta.name,
      unit: meta.unit,
      current_cost: meta.current_cost,
      points: [],
    };
    existing.points.push({
      at,
      unit_cost: Number(ln.unit_cost),
      qty: Number(ln.qty),
      supplier_name: po.supplier_id ? supplierName.get(po.supplier_id) ?? null : null,
    });
    byIngredient.set(ln.ingredient_id, existing);
  }
  for (const v of byIngredient.values()) {
    v.points.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }

  // Alerts (>10% MoM) come from the RPC.
  const alerts: Array<{ ingredient_id: string; delta_pct: number; recent_avg_cost: number; prev_avg_cost: number }> =
    (alertsRes.data ?? []) as Array<{ ingredient_id: string; delta_pct: number; recent_avg_cost: number; prev_avg_cost: number }>;
  const alertById = new Map(alerts.map((a) => [a.ingredient_id, a]));

  // Final list — ingredients with at least 2 data points, sorted by alert magnitude then name.
  const list: IngredientPriceHistory[] = Array.from(byIngredient.values())
    .filter((v) => v.points.length >= 1)
    .map((v) => {
      const a = alertById.get(v.ingredient_id);
      return a
        ? { ...v, alert_delta_pct: Number(a.delta_pct), alert_prev: Number(a.prev_avg_cost), alert_recent: Number(a.recent_avg_cost) }
        : v;
    })
    .sort((a, b) => {
      const av = a.alert_delta_pct == null ? 0 : Math.abs(a.alert_delta_pct);
      const bv = b.alert_delta_pct == null ? 0 : Math.abs(b.alert_delta_pct);
      if (av !== bv) return bv - av;
      return a.ingredient_name.localeCompare(b.ingredient_name);
    });

  return (
    <div>
      <div className="mb-5">
        <Link href={`/dashboard/menu/${menu.id}/stock/reports`} className="text-[13px] text-[#9C9485] hover:text-[#16130C]">
          ← Back to reports
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
          Supplier price trend
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-1">
          Unit cost on every received purchase order line, last 6 months. Ingredients up &gt;10% month-over-month are flagged.
        </p>
      </div>
      <SupplierPricesClient ingredients={list} alertCount={alerts.length} />
    </div>
  );
}
