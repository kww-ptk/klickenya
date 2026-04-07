import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { getMenuAuth, verifyMenuAccess } from "@/app/api/menu/_lib/auth";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/* ── Schemas ─────────────────────────────────────────── */

const createGroupSchema = z.object({
  menu_item_id:  z.string().uuid(),
  name:          z.string().min(1).max(100),
  group_type:    z.enum(["single", "multi", "allergy"]),
  is_required:   z.boolean().optional(),
  min_select:    z.number().int().min(0).optional(),
  max_select:    z.number().int().min(1).nullable().optional(),
  display_order: z.number().int().optional(),
});

const updateGroupSchema = z.object({
  group_id:      z.string().uuid(),
  name:          z.string().min(1).max(100).optional(),
  group_type:    z.enum(["single", "multi", "allergy"]).optional(),
  is_required:   z.boolean().optional(),
  min_select:    z.number().int().min(0).optional(),
  max_select:    z.number().int().min(1).nullable().optional(),
  display_order: z.number().int().optional(),
});

const createOptionSchema = z.object({
  option_group_id: z.string().uuid(),
  name:            z.string().min(1).max(200),
  price_modifier:  z.number().min(0).optional(),
  is_available:    z.boolean().optional(),
  display_order:   z.number().int().optional(),
});

const updateOptionSchema = z.object({
  option_id:      z.string().uuid(),
  name:           z.string().min(1).max(200).optional(),
  price_modifier: z.number().min(0).optional(),
  is_available:   z.boolean().optional(),
  display_order:  z.number().int().optional(),
});

const deleteSchema = z.object({
  type: z.enum(["group", "option"]),
  id:   z.string().uuid(),
});

/* ── GET — fetch option groups + options for a menu item ─ */

export async function GET(req: NextRequest) {
  const menuItemId = req.nextUrl.searchParams.get("menu_item_id");
  if (!menuItemId) {
    return NextResponse.json({ error: "menu_item_id required" }, { status: 400 });
  }

  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Resolve menu_id from item so we can check ownership
  const { data: itemRow } = await supabase
    .from("menu_items")
    .select("id, menu_sections!inner(menu_id)")
    .eq("id", menuItemId)
    .single();

  if (!itemRow) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  const _sec0 = Array.isArray(itemRow.menu_sections) ? itemRow.menu_sections[0] : itemRow.menu_sections;
  const menuId = (_sec0 as { menu_id: string }).menu_id;

  const access = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: groups } = await supabase
    .from("item_option_groups")
    .select(`
      id, name, group_type, is_required, min_select, max_select, display_order,
      item_options (
        id, name, price_modifier, is_available, display_order
      )
    `)
    .eq("menu_item_id", menuItemId)
    .order("display_order");

  return NextResponse.json({ groups: groups ?? [] });
}

/* ── POST — create a group or option ─────────────────── */

export async function POST(req: NextRequest) {
  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = body.action as string;

  if (action === "create_group") {
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    const d = parsed.data;

    // Resolve menu for ownership check
    const { data: itemRow } = await supabase
      .from("menu_items")
      .select("id, menu_sections!inner(menu_id)")
      .eq("id", d.menu_item_id)
      .single();

    if (!itemRow) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    const _sec1 = Array.isArray(itemRow.menu_sections) ? itemRow.menu_sections[0] : itemRow.menu_sections;
    const menuId = (_sec1 as { menu_id: string }).menu_id;
    const access = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await supabase
      .from("item_option_groups")
      .insert({
        menu_item_id:  d.menu_item_id,
        name:          d.name,
        group_type:    d.group_type,
        is_required:   d.is_required ?? false,
        min_select:    d.min_select ?? 0,
        max_select:    d.max_select ?? null,
        display_order: d.display_order ?? 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ group: { ...data, item_options: [] } });
  }

  if (action === "create_option") {
    const parsed = createOptionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    const d = parsed.data;

    // Resolve menu for ownership check via option_group → menu_item → menu
    const { data: groupRow } = await supabase
      .from("item_option_groups")
      .select("id, menu_item_id, menu_items!inner(menu_sections!inner(menu_id))")
      .eq("id", d.option_group_id)
      .single();

    if (!groupRow) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    const _mi = Array.isArray(groupRow.menu_items) ? groupRow.menu_items[0] : groupRow.menu_items;
    const _ms = Array.isArray(_mi?.menu_sections) ? _mi.menu_sections[0] : _mi?.menu_sections;
    const menuId = (_ms as { menu_id: string }).menu_id;
    const access = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await supabase
      .from("item_options")
      .insert({
        option_group_id: d.option_group_id,
        name:            d.name,
        price_modifier:  d.price_modifier ?? 0,
        is_available:    d.is_available ?? true,
        display_order:   d.display_order ?? 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ option: data });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

/* ── Ownership helpers ───────────────────────────────── */

async function resolveMenuIdFromGroup(
  supabase: SupabaseClient,
  groupId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("item_option_groups")
    .select("id, menu_item_id, menu_items!inner(menu_sections!inner(menu_id))")
    .eq("id", groupId)
    .single();
  if (!data) return null;
  const _mi = Array.isArray(data.menu_items) ? data.menu_items[0] : data.menu_items;
  const _ms = Array.isArray(_mi?.menu_sections) ? _mi.menu_sections[0] : _mi?.menu_sections;
  return (_ms as { menu_id: string })?.menu_id ?? null;
}

async function resolveMenuIdFromOption(
  supabase: SupabaseClient,
  optionId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("item_options")
    .select("id, item_option_groups!inner(menu_item_id, menu_items!inner(menu_sections!inner(menu_id)))")
    .eq("id", optionId)
    .single();
  if (!data) return null;
  const _grp = Array.isArray(data.item_option_groups) ? data.item_option_groups[0] : data.item_option_groups;
  const _mi  = Array.isArray(_grp?.menu_items)    ? _grp.menu_items[0]    : _grp?.menu_items;
  const _ms  = Array.isArray(_mi?.menu_sections)  ? _mi.menu_sections[0]  : _mi?.menu_sections;
  return (_ms as { menu_id: string })?.menu_id ?? null;
}

/* ── PATCH — update a group or option ────────────────── */

export async function PATCH(req: NextRequest) {
  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = body.action as string;

  if (action === "update_group") {
    const parsed = updateGroupSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    const { group_id, ...fields } = parsed.data;

    const menuId = await resolveMenuIdFromGroup(supabase, group_id);
    if (!menuId) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    const access = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await supabase
      .from("item_option_groups")
      .update(fields)
      .eq("id", group_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ group: data });
  }

  if (action === "update_option") {
    const parsed = updateOptionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    const { option_id, ...fields } = parsed.data;

    const menuId = await resolveMenuIdFromOption(supabase, option_id);
    if (!menuId) return NextResponse.json({ error: "Option not found" }, { status: 404 });
    const access = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await supabase
      .from("item_options")
      .update(fields)
      .eq("id", option_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ option: data });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

/* ── DELETE — remove a group or option ───────────────── */

export async function DELETE(req: NextRequest) {
  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const { type, id } = parsed.data;

  if (type === "group") {
    const menuId = await resolveMenuIdFromGroup(supabase, id);
    if (!menuId) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    const access = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabase
      .from("item_option_groups")
      .delete()
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // type === "option"
  const menuId = await resolveMenuIdFromOption(supabase, id);
  if (!menuId) return NextResponse.json({ error: "Option not found" }, { status: 404 });
  const access = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("item_options")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
