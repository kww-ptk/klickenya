import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";

const MOVEMENT_TYPES = ["purchase_in", "recipe_out", "waste", "count_adjustment", "transfer"] as const;
const MANUAL_TYPES = ["purchase_in", "waste", "count_adjustment"] as const;

const createSchema = z.object({
  ingredient_id: z.string().uuid(),
  // Manual entries are restricted to these types — auto_recipe is reserved
  // for the trigger that lands in V0.2.
  type: z.enum(MANUAL_TYPES),
  // Magnitude. The server applies the sign based on type so the UI doesn't
  // have to know about negative numbers.
  qty: z.coerce.number().gt(0),
  unit_cost: z.coerce.number().min(0).optional().nullable(),
  reason: z.string().trim().max(500).optional().nullable(),
});

/* ── POST — manual movement ──────────────────────────── */

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 400 });
  }
  const { ingredient_id, type, qty, unit_cost, reason } = parsed.data;

  // Verify ingredient belongs to this business — RLS on the join, plus a
  // belt-and-braces business_id check so we never cross-tenant.
  const { data: ingredient } = await supabase
    .from("ingredients")
    .select("id, business_id, cost_per_unit, unit")
    .eq("id", ingredient_id)
    .single();
  if (!ingredient || ingredient.business_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Sign convention:
  //   purchase_in       → +qty
  //   waste             → −qty
  //   count_adjustment  → +qty (the UI sends a signed magnitude via reason
  //                              for now; full-count screen ships in V0.1)
  let signedQty: number;
  if (type === "purchase_in") signedQty = qty;
  else if (type === "waste") signedQty = -qty;
  else signedQty = qty; // count_adjustment: caller provides direction in its own UI later

  const cpu = unit_cost ?? Number(ingredient.cost_per_unit ?? 0);
  const total = signedQty * cpu;

  const { data, error } = await supabase
    .from("stock_movements")
    .insert({
      business_id: user.id,
      ingredient_id,
      type,
      qty: signedQty,
      unit_cost: cpu,
      total_cost: total,
      source: "manual",
      reason: reason ?? null,
      created_by: user.id,
    })
    .select("id, ingredient_id, type, qty, unit_cost, total_cost, source, reason, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // For purchase_in, refresh the ingredient's cost_per_unit so future
  // recipe math uses the latest paid price. We only do this on POST so the
  // owner controls when the costing rolls forward.
  if (type === "purchase_in" && unit_cost != null && unit_cost > 0) {
    await supabase
      .from("ingredients")
      .update({ cost_per_unit: unit_cost })
      .eq("id", ingredient_id)
      .eq("business_id", user.id);
  }

  return NextResponse.json(data);
}

/* ── GET — paginated activity feed ───────────────────── */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "50")));
  const before = url.searchParams.get("before");
  const type = url.searchParams.get("type");
  const ingredientId = url.searchParams.get("ingredient_id");
  const fromIso = url.searchParams.get("from");
  const toIso = url.searchParams.get("to");

  let q = supabase
    .from("stock_movements")
    .select("id, ingredient_id, type, qty, unit_cost, total_cost, source, reason, created_at")
    .eq("business_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type && (MOVEMENT_TYPES as readonly string[]).includes(type)) {
    q = q.eq("type", type);
  }
  if (ingredientId) q = q.eq("ingredient_id", ingredientId);
  if (fromIso) q = q.gte("created_at", fromIso);
  if (toIso) q = q.lte("created_at", toIso);
  if (before) q = q.lt("created_at", before);

  const { data: movements, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Hydrate ingredient names + units for display. One round-trip, no joins
  // (PostgREST joins through RLS-protected tables get awkward).
  const ids = Array.from(new Set((movements ?? []).map((m) => m.ingredient_id)));
  let ingredientsById: Record<string, { name: string; unit: string }> = {};
  if (ids.length > 0) {
    const { data: ings } = await supabase
      .from("ingredients")
      .select("id, name, unit")
      .in("id", ids);
    ingredientsById = Object.fromEntries((ings ?? []).map((i) => [i.id, { name: i.name, unit: i.unit }]));
  }

  return NextResponse.json({
    movements: movements ?? [],
    ingredients: ingredientsById,
    next_cursor: movements && movements.length === limit ? movements[movements.length - 1].created_at : null,
  });
}
