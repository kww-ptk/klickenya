import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

const ingredientLine = z.object({
  ingredient_id: z.string().uuid(),
  ep_qty: z.coerce.number().gt(0),
  yield_pct: z.coerce.number().gt(0).max(100).default(100),
  display_order: z.coerce.number().int().min(0).default(0),
});

const upsertSchema = z.object({
  menu_item_id: z.string().uuid(),
  overhead_pct: z.coerce.number().min(0).max(100).default(5),
  target_food_cost_pct: z.coerce.number().gt(0).max(100).default(30),
  notes: z.string().max(2000).optional().nullable(),
  ingredients: z.array(ingredientLine).max(50),
});

/* ── GET — fetch recipe for a menu_item ──────────────── */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const menuItemId = url.searchParams.get("menu_item_id");
  if (!menuItemId) return NextResponse.json({ error: "menu_item_id required" }, { status: 400 });

  // Ownership: verify the menu_item belongs to this user (via menu_sections → menus)
  const { data: owns } = await adminClient
    .from("menu_items")
    .select("id, section_id, menu_sections!inner(menu_id, menus!inner(business_id))")
    .eq("id", menuItemId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownerId = (owns as any)?.menu_sections?.menus?.business_id;
  if (!owns || ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, menu_item_id, overhead_pct, target_food_cost_pct, notes, updated_at")
    .eq("menu_item_id", menuItemId)
    .maybeSingle();

  if (!recipe) {
    return NextResponse.json({ recipe: null, ingredients: [] });
  }

  const { data: lines } = await supabase
    .from("recipe_ingredients")
    .select("id, ingredient_id, ep_qty, yield_pct, display_order")
    .eq("recipe_id", recipe.id)
    .order("display_order", { ascending: true });

  return NextResponse.json({ recipe, ingredients: lines ?? [] });
}

/* ── PUT — full upsert (replace ingredient lines) ────── */

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = upsertSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 400 });
  }
  const { menu_item_id, overhead_pct, target_food_cost_pct, notes, ingredients } = parsed.data;

  // Ownership check (menu_item → section → menu → business_id)
  const { data: owns } = await adminClient
    .from("menu_items")
    .select("id, menu_sections!inner(menus!inner(business_id))")
    .eq("id", menu_item_id)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownerId = (owns as any)?.menu_sections?.menus?.business_id;
  if (!owns || ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // All referenced ingredients must belong to the same business.
  if (ingredients.length > 0) {
    const ids = ingredients.map((i) => i.ingredient_id);
    const { data: pantry } = await supabase
      .from("ingredients")
      .select("id")
      .in("id", ids);
    if (!pantry || pantry.length !== new Set(ids).size) {
      return NextResponse.json({ error: "One or more ingredients are not in your pantry" }, { status: 400 });
    }
  }

  // Upsert recipe row
  const { data: recipe, error: rErr } = await supabase
    .from("recipes")
    .upsert(
      {
        menu_item_id,
        business_id: user.id,
        overhead_pct,
        target_food_cost_pct,
        notes: notes ?? null,
      },
      { onConflict: "menu_item_id" },
    )
    .select("id, menu_item_id, overhead_pct, target_food_cost_pct, notes, updated_at")
    .single();
  if (rErr || !recipe) {
    return NextResponse.json({ error: rErr?.message ?? "Failed to save recipe" }, { status: 500 });
  }

  // Replace ingredient lines: delete-then-insert is fine here. With the
  // recipe row pinned + RLS scoped to business_id, a partial failure leaves
  // a recipe with zero lines (visible as "no ingredients") — recoverable.
  // A real two-phase transaction would need a Postgres function; out of
  // scope for V0.
  const { error: dErr } = await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipe.id);
  if (dErr) {
    return NextResponse.json({ error: dErr.message }, { status: 500 });
  }

  if (ingredients.length > 0) {
    const rows = ingredients.map((i, idx) => ({
      recipe_id: recipe.id,
      ingredient_id: i.ingredient_id,
      ep_qty: i.ep_qty,
      yield_pct: i.yield_pct,
      display_order: i.display_order ?? idx,
    }));
    const { error: iErr } = await supabase.from("recipe_ingredients").insert(rows);
    if (iErr) {
      return NextResponse.json({ error: iErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ recipe, ingredients });
}

/* ── DELETE — remove recipe (cascades lines) ─────────── */

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { menu_item_id } = await req.json().catch(() => ({}));
  if (!menu_item_id) return NextResponse.json({ error: "menu_item_id required" }, { status: 400 });

  await supabase
    .from("recipes")
    .delete()
    .eq("menu_item_id", menu_item_id)
    .eq("business_id", user.id);

  return NextResponse.json({ ok: true });
}
