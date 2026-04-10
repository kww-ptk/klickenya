import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getMenuAuth } from "../_lib/auth";

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

    const { menu_id, title } = await req.json();
    if (!menu_id || !title?.trim()) {
      return NextResponse.json({ error: "menu_id and title required" }, { status: 400 });
    }

    // Verify menu ownership (or admin)
    const client = isAdmin ? adminClient : supabase;
    const menuQuery = client.from("menus").select("id, slug").eq("id", menu_id);
    if (!isAdmin) menuQuery.eq("business_id", userId);
    const { data: menu } = await menuQuery.single();
    if (!menu) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Get next display_order
    const { data: maxRow } = await client
      .from("menu_sections")
      .select("display_order")
      .eq("menu_id", menu_id)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const display_order = (maxRow?.display_order ?? -1) + 1;

    const { data: section, error } = await client
      .from("menu_sections")
      .insert({ menu_id, title: title.trim(), display_order })
      .select("id, title, display_order, is_visible")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    revalidateTag(`menu:${menu_id}`, "default");
    revalidatePath(`/m/${menu.slug}`);

    return NextResponse.json(section);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, isAdmin, supabase } = await getMenuAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { section_id, title } = await req.json();
    if (!section_id || !title?.trim()) {
      return NextResponse.json({ error: "section_id and title required" }, { status: 400 });
    }

    const owned = await verifySectionOwnership(supabase, section_id, userId, isAdmin);
    if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const client = isAdmin ? adminClient : supabase;
    const { data: updated, error } = await client
      .from("menu_sections")
      .update({ title: title.trim() })
      .eq("id", section_id)
      .select("id, title, display_order, is_visible")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    revalidateTag(`menu:${owned.id}`, "default");
    revalidatePath(`/m/${owned.slug}`);

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, isAdmin, supabase } = await getMenuAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { section_id } = await req.json();
    if (!section_id) return NextResponse.json({ error: "section_id required" }, { status: 400 });

    const owned = await verifySectionOwnership(supabase, section_id, userId, isAdmin);
    if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const client = isAdmin ? adminClient : supabase;
    await client.from("menu_sections").delete().eq("id", section_id);

    revalidateTag(`menu:${owned.id}`, "default");
    revalidatePath(`/m/${owned.slug}`);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
