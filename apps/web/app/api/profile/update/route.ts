import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { displayName, location } = body as { displayName?: string; location?: string };

    const updates: Record<string, string | null> = {};
    if (displayName !== undefined) updates.display_name = displayName.trim() || null;
    if (location !== undefined) updates.location = location.trim() || null;
    updates.updated_at = new Date().toISOString();

    await adminClient
      .from("guest_profiles")
      .update(updates)
      .eq("user_id", user.id);

    // Also update users table display name
    if (displayName?.trim()) {
      await adminClient
        .from("users")
        .update({ full_name: displayName.trim() })
        .eq("id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Profile] Update error:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
