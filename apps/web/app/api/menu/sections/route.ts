import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getSessionUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { menu_id, title } = await req.json();
    if (!menu_id || !title?.trim()) {
      return NextResponse.json({ error: "menu_id and title required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify menu ownership
    const { data: menu } = await supabase
      .from("menus")
      .select("id")
      .eq("id", menu_id)
      .eq("business_id", userId)
      .single();
    if (!menu) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Get next display_order
    const { data: maxRow } = await supabase
      .from("menu_sections")
      .select("display_order")
      .eq("menu_id", menu_id)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const display_order = (maxRow?.display_order ?? -1) + 1;

    const { data: section, error } = await supabase
      .from("menu_sections")
      .insert({ menu_id, title: title.trim(), display_order })
      .select("id, title, display_order, is_visible")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(section);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { section_id, title } = await req.json();
    if (!section_id || !title?.trim()) {
      return NextResponse.json({ error: "section_id and title required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify ownership: section → menu → business_id
    const { data: section } = await supabase
      .from("menu_sections")
      .select("id, menu_id")
      .eq("id", section_id)
      .single();
    if (!section) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: menu } = await supabase
      .from("menus")
      .select("id")
      .eq("id", section.menu_id)
      .eq("business_id", userId)
      .single();
    if (!menu) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: updated, error } = await supabase
      .from("menu_sections")
      .update({ title: title.trim() })
      .eq("id", section_id)
      .select("id, title, display_order, is_visible")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { section_id } = await req.json();
    if (!section_id) return NextResponse.json({ error: "section_id required" }, { status: 400 });

    const supabase = await createClient();

    // Verify ownership
    const { data: section } = await supabase
      .from("menu_sections")
      .select("id, menu_id")
      .eq("id", section_id)
      .single();
    if (!section) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: menu } = await supabase
      .from("menus")
      .select("id")
      .eq("id", section.menu_id)
      .eq("business_id", userId)
      .single();
    if (!menu) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await supabase.from("menu_sections").delete().eq("id", section_id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
