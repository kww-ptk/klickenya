import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { menu_id, is_published } = await req.json();
    if (!menu_id || typeof is_published !== "boolean") {
      return NextResponse.json({ error: "menu_id and is_published required" }, { status: 400 });
    }

    // Verify ownership
    const { data: menu } = await supabase
      .from("menus")
      .select("id, slug")
      .eq("id", menu_id)
      .eq("business_id", user.id)
      .single();
    if (!menu) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabase
      .from("menus")
      .update({ is_published })
      .eq("id", menu_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Revalidate the public menu page
    revalidatePath(`/m/${menu.slug}`);

    return NextResponse.json({ success: true, is_published });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
