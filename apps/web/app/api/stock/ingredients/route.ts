import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";

/* ── Schemas ─────────────────────────────────────────── */

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  unit: z.string().trim().min(1).max(20),
  cost_per_unit: z.coerce.number().min(0).default(0),
  default_yield: z.coerce.number().gt(0).max(1).default(1),
  category: z.string().trim().max(60).optional().nullable(),
  low_stock_threshold: z.coerce.number().min(0).optional().nullable(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  cost_per_unit: z.coerce.number().min(0).optional(),
  default_yield: z.coerce.number().gt(0).max(1).optional(),
  category: z.string().trim().max(60).nullable().optional(),
  low_stock_threshold: z.coerce.number().min(0).nullable().optional(),
  archived: z.boolean().optional(),
});

/* ── GET — list ingredients (RLS-scoped) ─────────────── */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const includeArchived = url.searchParams.get("include_archived") === "1";
  const search = url.searchParams.get("q")?.trim() ?? "";

  let q = supabase
    .from("ingredients")
    .select("id, name, unit, cost_per_unit, default_yield, category, on_hand, low_stock_threshold, archived, updated_at")
    .order("name", { ascending: true })
    .limit(500);

  if (!includeArchived) q = q.eq("archived", false);
  if (search) q = q.ilike("name", `%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ingredients: data ?? [] });
}

/* ── POST — create ───────────────────────────────────── */

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

  const { data, error } = await supabase
    .from("ingredients")
    .insert({
      business_id: user.id,
      ...parsed.data,
      category: parsed.data.category ?? null,
      low_stock_threshold: parsed.data.low_stock_threshold ?? null,
    })
    .select("id, name, unit, cost_per_unit, default_yield, category, on_hand, low_stock_threshold, archived, updated_at")
    .single();

  if (error) {
    // Unique violation → friendlier message
    if (error.code === "23505") {
      return NextResponse.json({ error: "An ingredient with that name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

/* ── PATCH — update or archive ───────────────────────── */

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 400 });
  }
  const { id, ...fields } = parsed.data;

  const { data, error } = await supabase
    .from("ingredients")
    .update(fields)
    .eq("id", id)
    .eq("business_id", user.id)
    .select("id, name, unit, cost_per_unit, default_yield, category, on_hand, low_stock_threshold, archived, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
