import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getSessionUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function verifyItemOwnership(supabase: Awaited<ReturnType<typeof createClient>>, itemId: string, userId: string) {
  const { data: item } = await supabase
    .from("menu_items")
    .select("id, section_id")
    .eq("id", itemId)
    .single();
  if (!item) return null;

  return verifySectionOwnership(supabase, item.section_id, userId);
}

async function verifySectionOwnership(supabase: Awaited<ReturnType<typeof createClient>>, sectionId: string, userId: string) {
  const { data: section } = await supabase
    .from("menu_sections")
    .select("id, menu_id")
    .eq("id", sectionId)
    .single();
  if (!section) return null;

  const { data: menu } = await supabase
    .from("menus")
    .select("id")
    .eq("id", section.menu_id)
    .eq("business_id", userId)
    .single();

  return menu;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { section_id, name, price_kes, description, photo_url, dietary_tags, is_available } = body;

    if (!section_id || !name?.trim() || price_kes == null) {
      return NextResponse.json({ error: "section_id, name, and price_kes required" }, { status: 400 });
    }

    const supabase = await createClient();
    const owned = await verifySectionOwnership(supabase, section_id, userId);
    if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Get next display_order
    const { data: maxRow } = await supabase
      .from("menu_items")
      .select("display_order")
      .eq("section_id", section_id)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const display_order = (maxRow?.display_order ?? -1) + 1;

    const { data: item, error } = await supabase
      .from("menu_items")
      .insert({
        section_id,
        name: name.trim(),
        price_kes: Number(price_kes),
        description: description?.trim() || null,
        photo_url: photo_url?.trim() || null,
        dietary_tags: dietary_tags ?? [],
        is_available: is_available ?? true,
        display_order,
      })
      .select("id, name, description, price_kes, dietary_tags, is_available, display_order, photo_url")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { item_id, ...fields } = body;
    if (!item_id) return NextResponse.json({ error: "item_id required" }, { status: 400 });

    const supabase = await createClient();
    const owned = await verifyItemOwnership(supabase, item_id, userId);
    if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Build update object from allowed fields
    const update: Record<string, unknown> = {};
    if (fields.name !== undefined) update.name = fields.name.trim();
    if (fields.price_kes !== undefined) update.price_kes = Number(fields.price_kes);
    if (fields.description !== undefined) update.description = fields.description?.trim() || null;
    if (fields.photo_url !== undefined) update.photo_url = fields.photo_url?.trim() || null;
    if (fields.dietary_tags !== undefined) update.dietary_tags = fields.dietary_tags;
    if (fields.is_available !== undefined) update.is_available = fields.is_available;

    const { data: item, error } = await supabase
      .from("menu_items")
      .update(update)
      .eq("id", item_id)
      .select("id, name, description, price_kes, dietary_tags, is_available, display_order, photo_url")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { item_id } = await req.json();
    if (!item_id) return NextResponse.json({ error: "item_id required" }, { status: 400 });

    const supabase = await createClient();
    const owned = await verifyItemOwnership(supabase, item_id, userId);
    if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await supabase.from("menu_items").delete().eq("id", item_id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
