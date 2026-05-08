import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";

const lineSchema = z.object({
  ingredient_id: z.string().uuid(),
  qty: z.coerce.number().gt(0),
  unit_cost: z.coerce.number().min(0),
});

const createSchema = z.object({
  supplier_id: z.string().uuid().nullable().optional(),
  expected_at: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["draft", "sent"]).default("draft"),
  items: z.array(lineSchema).min(1).max(200),
});

const PO_SELECT =
  "id, po_number, status, supplier_id, expected_at, ordered_at, received_at, total_kes, received_total_kes, notes, created_at, updated_at";

/* ── GET — list with optional filters ────────────────── */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const supplierId = url.searchParams.get("supplier_id");
  const search = url.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "100")));

  let q = supabase
    .from("purchase_orders")
    .select(PO_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && ["draft", "sent", "partial", "received", "cancelled"].includes(status)) {
    q = q.eq("status", status);
  }
  if (supplierId && supplierId !== "all") q = q.eq("supplier_id", supplierId);
  if (search) q = q.ilike("po_number", `%${search}%`);

  const { data: orders, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Hydrate suppliers for display (skip a join — RLS through joins is finicky).
  const supplierIds = Array.from(new Set((orders ?? []).map((o) => o.supplier_id).filter(Boolean))) as string[];
  let suppliersById: Record<string, { name: string }> = {};
  if (supplierIds.length > 0) {
    const { data: sup } = await supabase.from("suppliers").select("id, name").in("id", supplierIds);
    suppliersById = Object.fromEntries((sup ?? []).map((s) => [s.id, { name: s.name }]));
  }

  return NextResponse.json({ orders: orders ?? [], suppliers: suppliersById });
}

/* ── POST — create draft or sent PO ──────────────────── */

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 400 });
  }
  const { supplier_id, expected_at, notes, status, items } = parsed.data;

  // Validate supplier ownership (if provided) + ingredients ownership
  if (supplier_id) {
    const { data: sup } = await supabase
      .from("suppliers").select("id").eq("id", supplier_id).maybeSingle();
    if (!sup) return NextResponse.json({ error: "Supplier not found" }, { status: 400 });
  }
  const ingredientIds = Array.from(new Set(items.map((i) => i.ingredient_id)));
  const { data: ings } = await supabase
    .from("ingredients").select("id").in("id", ingredientIds);
  if (!ings || ings.length !== ingredientIds.length) {
    return NextResponse.json({ error: "One or more ingredients are not in your pantry" }, { status: 400 });
  }

  // Generate PO number atomically (per-business sequence)
  const { data: poNumberData, error: numErr } = await supabase
    .rpc("next_po_number", { p_business_id: user.id });
  if (numErr || !poNumberData) {
    return NextResponse.json({ error: "Failed to generate PO number" }, { status: 500 });
  }

  const totalKes = items.reduce((sum, i) => sum + i.qty * i.unit_cost, 0);

  // Insert header
  const { data: order, error: poErr } = await supabase
    .from("purchase_orders")
    .insert({
      business_id: user.id,
      supplier_id: supplier_id ?? null,
      po_number: poNumberData as string,
      status,
      expected_at: expected_at ?? null,
      ordered_at: status === "sent" ? new Date().toISOString() : null,
      notes: notes ?? null,
      total_kes: totalKes,
    })
    .select(PO_SELECT)
    .single();
  if (poErr || !order) {
    return NextResponse.json({ error: poErr?.message ?? "Failed to create PO" }, { status: 500 });
  }

  // Insert lines. If this fails we leave the header behind; the user can
  // delete it from the detail screen. A real two-phase txn would need an
  // RPC; not worth it here because the failure modes are noisy and rare.
  const itemRows = items.map((i) => ({
    purchase_order_id: order.id,
    ingredient_id: i.ingredient_id,
    qty: i.qty,
    unit_cost: i.unit_cost,
    total_cost: i.qty * i.unit_cost,
    qty_received: 0,
  }));
  const { error: liErr } = await supabase.from("purchase_order_items").insert(itemRows);
  if (liErr) {
    return NextResponse.json({ error: liErr.message, partial_po_id: order.id }, { status: 500 });
  }

  return NextResponse.json(order);
}
