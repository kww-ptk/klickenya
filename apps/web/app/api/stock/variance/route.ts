import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";

/* ── GET — variance report for a date range ──────────── */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "start and end required" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("fn_variance_report", {
    p_start: start,
    p_end: end,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

/* ── POST — save physical count → count_adjustment movements ── */

const saveSchema = z.object({
  // The "as-of" timestamp the count is taken at; defaults to now.
  count_at: z.string().datetime().optional(),
  // For each ingredient, the actual physical count. Server computes the
  // expected end as of count_at and writes a count_adjustment with the
  // signed delta. Ingredients with no entry are left alone.
  counts: z
    .array(
      z.object({
        ingredient_id: z.string().uuid(),
        actual_qty: z.coerce.number().min(0),
      }),
    )
    .min(1)
    .max(500),
  reason: z.string().max(500).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = saveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 400 });
  }

  const countAt = parsed.data.count_at ? new Date(parsed.data.count_at) : new Date();
  const reason = parsed.data.reason ?? "Physical count";

  const ingredientIds = parsed.data.counts.map((c) => c.ingredient_id);

  // Validate ingredient ownership in one round-trip. RLS would also
  // catch this on insert, but we want a clean 403 message.
  const { data: ings } = await supabase
    .from("ingredients")
    .select("id, business_id, cost_per_unit")
    .in("id", ingredientIds);
  if (!ings || ings.length !== new Set(ingredientIds).size) {
    return NextResponse.json({ error: "One or more ingredients not found" }, { status: 403 });
  }
  const costById = new Map<string, number>();
  for (const i of ings) {
    if (i.business_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    costById.set(i.id, Number(i.cost_per_unit));
  }

  // Compute expected_end at count_at by summing all signed qty up to that
  // moment. One round-trip per ingredient would be wasteful, so we batch.
  const { data: sums, error: sumsErr } = await supabase
    .from("stock_movements")
    .select("ingredient_id, qty")
    .in("ingredient_id", ingredientIds)
    .lt("created_at", countAt.toISOString());
  if (sumsErr) return NextResponse.json({ error: sumsErr.message }, { status: 500 });

  const expectedById = new Map<string, number>();
  for (const id of ingredientIds) expectedById.set(id, 0);
  for (const r of sums ?? []) {
    expectedById.set(r.ingredient_id, (expectedById.get(r.ingredient_id) ?? 0) + Number(r.qty));
  }

  // Build count_adjustment movements where actual ≠ expected. We tolerate
  // a 0.0001 epsilon to avoid spurious adjustments from float drift.
  const rows: Array<Record<string, unknown>> = [];
  for (const c of parsed.data.counts) {
    const expected = expectedById.get(c.ingredient_id) ?? 0;
    const delta = c.actual_qty - expected;
    if (Math.abs(delta) < 0.0001) continue;
    const cost = costById.get(c.ingredient_id) ?? 0;
    rows.push({
      business_id: user.id,
      ingredient_id: c.ingredient_id,
      type: "count_adjustment",
      qty: delta,
      unit_cost: cost,
      total_cost: delta * cost,
      source: "variance_report",
      reason,
      reference_type: "count",
      reference_id: null,
      created_by: user.id,
      created_at: countAt.toISOString(),
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ adjustments: 0, message: "No adjustments needed — all counts match." });
  }

  const { error: insErr } = await supabase.from("stock_movements").insert(rows);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ adjustments: rows.length });
}
