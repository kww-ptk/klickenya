import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

const BUCKET = "room-photos";
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB (client compresses before upload)

/**
 * Slugify a string for SEO-friendly filenames.
 * "Prestige Suite" → "prestige-suite"
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const propertyId = formData.get("property_id") as string | null;
    const propertyName = formData.get("property_name") as string | null;
    const roomName = formData.get("room_name") as string | null;

    if (!file || !propertyId) {
      return NextResponse.json(
        { error: "file and property_id required" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 2 MB)" },
        { status: 400 }
      );
    }

    // Verify property ownership
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("owner_id", user.id)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build SEO-friendly filename:
    // room-photos/{property-slug}/{room-slug}-{timestamp}.webp
    const propSlug = slugify(propertyName || propertyId);
    const roomSlug = slugify(roomName || "room");
    const ts = Date.now().toString(36);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `${propSlug}/${roomSlug}-${ts}.${ext}`;

    // Upload to Supabase Storage
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
  } catch (e) {
    console.error("Upload route error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
