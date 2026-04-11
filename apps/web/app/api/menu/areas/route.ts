import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getMenuAuth, verifyMenuAccess } from "@/app/api/menu/_lib/auth";

/* ── GET — list areas for a menu ────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const menuId = req.nextUrl.searchParams.get("menu_id");
  if (!menuId) return NextResponse.json({ error: "menu_id required" }, { status: 400 });

  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await adminClient
    .from("restaurant_areas")
    .select("id, name, capacity_total, display_order, color_hex, is_active")
    .eq("menu_id", menuId)
    .order("display_order");

  if (error) return NextResponse.json({ error: "Failed to fetch areas" }, { status: 500 });
  return NextResponse.json({ areas: data });
}

/* ── POST — create area ─────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { menu_id, name, capacity_total, color_hex } = body;

  if (!menu_id || !name?.trim()) {
    return NextResponse.json({ error: "menu_id and name required" }, { status: 400 });
  }

  const access = await verifyMenuAccess(supabase, menu_id, userId, isAdmin);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Next display_order = current max + 1
  const { data: existing } = await adminClient
    .from("restaurant_areas")
    .select("display_order")
    .eq("menu_id", menu_id)
    .order("display_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

  const { data, error } = await adminClient
    .from("restaurant_areas")
    .insert({
      menu_id,
      name: name.trim(),
      capacity_total: Math.max(1, Math.min(9999, parseInt(capacity_total, 10) || 20)),
      color_hex: typeof color_hex === "string" && color_hex.startsWith("#") ? color_hex : null,
      display_order: nextOrder,
      is_active: true,
    })
    .select("id, name, capacity_total, display_order, color_hex, is_active")
    .single();

  if (error) return NextResponse.json({ error: "Failed to create area" }, { status: 500 });
  return NextResponse.json({ area: data });
}

/* ── PATCH — update area ────────────────────────────────────────────────────── */

export async function PATCH(req: NextRequest) {
  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, menu_id, ...rest } = body;

  if (!id || !menu_id) {
    return NextResponse.json({ error: "id and menu_id required" }, { status: 400 });
  }

  const access = await verifyMenuAccess(supabase, menu_id, userId, isAdmin);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const allowed: Record<string, unknown> = {};
  if (typeof rest.name === "string" && rest.name.trim()) allowed.name = rest.name.trim();
  if (typeof rest.capacity_total === "number") allowed.capacity_total = Math.max(1, rest.capacity_total);
  if (typeof rest.color_hex === "string" || rest.color_hex === null) allowed.color_hex = rest.color_hex;
  if (typeof rest.is_active === "boolean") allowed.is_active = rest.is_active;
  if (typeof rest.display_order === "number") allowed.display_order = rest.display_order;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from("restaurant_areas")
    .update(allowed)
    .eq("id", id)
    .eq("menu_id", menu_id)
    .select("id, name, capacity_total, display_order, color_hex, is_active")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update area" }, { status: 500 });
  return NextResponse.json({ area: data });
}

/* ── DELETE — delete area ───────────────────────────────────────────────────── */

export async function DELETE(req: NextRequest) {
  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  const menuId = req.nextUrl.searchParams.get("menu_id");

  if (!id || !menuId) {
    return NextResponse.json({ error: "id and menu_id required" }, { status: 400 });
  }

  const access = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await adminClient
    .from("restaurant_areas")
    .delete()
    .eq("id", id)
    .eq("menu_id", menuId);

  if (error) return NextResponse.json({ error: "Failed to delete area" }, { status: 500 });
  return NextResponse.json({ success: true });
}
