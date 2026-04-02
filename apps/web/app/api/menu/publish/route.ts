import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getMenuAuth } from "../_lib/auth";

export async function PATCH(req: NextRequest) {
  try {
    const { userId, isAdmin, supabase } = await getMenuAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { menu_id, is_published } = await req.json();
    if (!menu_id || typeof is_published !== "boolean") {
      return NextResponse.json({ error: "menu_id and is_published required" }, { status: 400 });
    }

    // Verify ownership (or admin)
    const client = isAdmin ? adminClient : supabase;
    const menuQuery = client.from("menus").select("id, slug").eq("id", menu_id);
    if (!isAdmin) menuQuery.eq("business_id", userId);
    const { data: menu } = await menuQuery.single();
    if (!menu) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await client
      .from("menus")
      .update({ is_published })
      .eq("id", menu_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    revalidatePath(`/m/${menu.slug}`);

    return NextResponse.json({ success: true, is_published });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
