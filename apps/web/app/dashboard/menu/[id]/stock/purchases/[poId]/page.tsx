import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { POClient, type POHeader, type POLineFull } from "./POClient";

interface PageProps {
  params: Promise<{ id: string; poId: string }>;
}

export default async function PurchaseOrderDetailPage({ params }: PageProps) {
  const { id: menuId, poId } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, stock_enabled")
    .eq("id", menuId)
    .eq("business_id", user.id)
    .single();
  if (!menu) redirect("/dashboard");
  if (!menu.stock_enabled) redirect(`/dashboard/menu/${menuId}/stock`);

  const { data: order } = await adminClient
    .from("purchase_orders")
    .select(
      "id, po_number, status, supplier_id, expected_at, ordered_at, received_at, total_kes, received_total_kes, notes, created_at",
    )
    .eq("id", poId)
    .eq("business_id", user.id)
    .single();
  if (!order) redirect(`/dashboard/menu/${menuId}/stock/purchases`);

  // Lines + supplier + ingredient cost lookups (parallel).
  const [{ data: linesRaw }, { data: supplier }] = await Promise.all([
    adminClient
      .from("purchase_order_items")
      .select("id, ingredient_id, qty, unit_cost, total_cost, qty_received")
      .eq("purchase_order_id", poId)
      .order("id", { ascending: true }),
    order.supplier_id
      ? adminClient
          .from("suppliers")
          .select("id, name, phone, email")
          .eq("id", order.supplier_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const lines = linesRaw ?? [];
  const ingredientIds = lines.map((l) => l.ingredient_id);

  // Pull current cost_per_unit for every ingredient on this PO so we can
  // compare against the PO line price and surface the price-change modal.
  let ingredientsById: Record<string, { name: string; unit: string; cost_per_unit: number }> = {};
  if (ingredientIds.length > 0) {
    const { data: ings } = await adminClient
      .from("ingredients")
      .select("id, name, unit, cost_per_unit")
      .in("id", ingredientIds);
    ingredientsById = Object.fromEntries(
      (ings ?? []).map((i) => [i.id, { name: i.name, unit: i.unit, cost_per_unit: Number(i.cost_per_unit) }]),
    );
  }

  const fullLines: POLineFull[] = lines.map((l) => {
    const ing = ingredientsById[l.ingredient_id];
    return {
      id: l.id,
      ingredient_id: l.ingredient_id,
      ingredient_name: ing?.name ?? "(deleted ingredient)",
      ingredient_unit: ing?.unit ?? "",
      current_cost_per_unit: ing?.cost_per_unit ?? 0,
      qty: Number(l.qty),
      unit_cost: Number(l.unit_cost),
      total_cost: Number(l.total_cost),
      qty_received: Number(l.qty_received ?? 0),
    };
  });

  const header: POHeader = {
    id: order.id,
    po_number: order.po_number,
    status: order.status,
    expected_at: order.expected_at,
    ordered_at: order.ordered_at,
    received_at: order.received_at,
    total_kes: Number(order.total_kes),
    received_total_kes: Number(order.received_total_kes ?? 0),
    notes: order.notes,
    created_at: order.created_at,
    supplier: supplier
      ? { id: supplier.id, name: supplier.name, phone: supplier.phone, email: supplier.email }
      : null,
  };

  return (
    <div>
      <div className="mb-5">
        <Link
          href={`/dashboard/menu/${menuId}/stock/purchases`}
          className="text-[13px] text-text3 hover:text-dark"
        >
          ← Back to purchase orders
        </Link>
      </div>

      <POClient menuId={menuId} header={header} lines={fullLines} />
    </div>
  );
}
