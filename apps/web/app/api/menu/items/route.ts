import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getMenuAuth } from "../_lib/auth";

async function verifyItemOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId: string,
  userId: string,
  isAdmin: boolean
) {
  const client = isAdmin ? adminClient : supabase;
  const { data: item } = await client
    .from("menu_items")
    .select("id, section_id")
    .eq("id", itemId)
    .single();
  if (!item) return null;

  return verifySectionOwnership(supabase, item.section_id, userId, isAdmin);
}

async function verifySectionOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sectionId: string,
  userId: string,
  isAdmin: boolean
) {
  const client = isAdmin ? adminClient : supabase;
  const { data: section } = await client
    .from("menu_sections")
    .select("id, menu_id")
    .eq("id", sectionId)
    .single();
  if (!section) return null;

  if (isAdmin) {
    const { data: menu } = await adminClient.from("menus").select("id, slug").eq("id", section.menu_id).single();
    return menu;
  }

  const { data: menu } = await supabase
    .from("menus")
    .select("id, slug")
    .eq("id", section.menu_id)
    .eq("business_id", userId)
    .single();
  return menu;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, isAdmin, supabase } = await getMenuAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { section_id, name, price_kes, description, photo_url, dietary_tags, is_available } = body;

    if (!section_id || !name?.trim() || price_kes == null) {
      return NextResponse.json({ error: "section_id, name, and price_kes required" }, { status: 400 });
    }

    const owned = await verifySectionOwnership(supabase, section_id, userId, isAdmin);
    if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const client = isAdmin ? adminClient : supabase;

    const { data: maxRow } = await client
      .from("menu_items")
      .select("display_order")
      .eq("section_id", section_id)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const display_order = (maxRow?.display_order ?? -1) + 1;

    const { data: item, error } = await client
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

    revalidateTag(`menu:${owned.id}`, "default");
    revalidatePath(`/m/${owned.slug}`);

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, isAdmin, supabase } = await getMenuAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { item_id, ...fields } = body;
    if (!item_id) return NextResponse.json({ error: "item_id required" }, { status: 400 });

    const owned = await verifyItemOwnership(supabase, item_id, userId, isAdmin);
    if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const update: Record<string, unknown> = {};
    if (fields.name !== undefined) update.name = fields.name.trim();
    if (fields.price_kes !== undefined) update.price_kes = Number(fields.price_kes);
    if (fields.description !== undefined) update.description = fields.description?.trim() || null;
    if (fields.photo_url !== undefined) update.photo_url = fields.photo_url?.trim() || null;
    if (fields.dietary_tags !== undefined) update.dietary_tags = fields.dietary_tags;
    if (fields.is_available !== undefined) update.is_available = fields.is_available;
    if (fields.is_featured !== undefined) update.is_featured = Boolean(fields.is_featured);

    const client = isAdmin ? adminClient : supabase;

    // Enforce max 5 featured items per menu
    if (update.is_featured === true) {
      const { data: sections } = await client
        .from("menu_sections")
        .select("id")
        .eq("menu_id", owned.id);
      const sectionIds = (sections ?? []).map((s: { id: string }) => s.id);
      const { count } = await client
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .in("section_id", sectionIds)
        .eq("is_featured", true)
        .neq("id", item_id);
      if ((count ?? 0) >= 5) {
        return NextResponse.json(
          { error: "You can feature up to 5 items. Unstar one to add another." },
          { status: 400 }
        );
      }
    }

    const { data: item, error } = await client
      .from("menu_items")
      .update(update)
      .eq("id", item_id)
      .select("id, name, description, price_kes, dietary_tags, is_available, display_order, photo_url, is_featured")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    revalidateTag(`menu:${owned.id}`, "default");
    revalidatePath(`/m/${owned.slug}`);

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, isAdmin, supabase } = await getMenuAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { item_id } = await req.json();
    if (!item_id) return NextResponse.json({ error: "item_id required" }, { status: 400 });

    const owned = await verifyItemOwnership(supabase, item_id, userId, isAdmin);
    if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const client = isAdmin ? adminClient : supabase;
    await client.from("menu_items").delete().eq("id", item_id);

    revalidateTag(`menu:${owned.id}`, "default");
    revalidatePath(`/m/${owned.slug}`);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
