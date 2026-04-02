import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getMenuAuth } from "../_lib/auth";

const BUCKET = "menu-photos";
const MAX_SIZE = 2 * 1024 * 1024; // 2MB after compression

export async function POST(req: NextRequest) {
  try {
    const { userId, isAdmin } = await getMenuAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const menuId = formData.get("menu_id") as string | null;

    if (!file || !menuId) {
      return NextResponse.json({ error: "file and menu_id required" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
    }

    // Verify menu ownership (or admin)
    if (!isAdmin) {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data: menu } = await supabase
        .from("menus")
        .select("id")
        .eq("id", menuId)
        .eq("business_id", userId)
        .single();
      if (!menu) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate unique filename
    const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
    const filename = `${menuId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Upload to Supabase Storage using admin client
    const { error: uploadError } = await adminClient.storage
      .from(BUCKET)
      .upload(filename, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data: urlData } = adminClient.storage
      .from(BUCKET)
      .getPublicUrl(filename);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
