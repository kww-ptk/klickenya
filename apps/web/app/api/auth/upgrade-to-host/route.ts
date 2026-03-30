import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check current role
    const { data: profile } = await adminClient
      .from("users")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (profile.role === "host" || profile.role === "admin") {
      return NextResponse.json({ success: true, message: "Already a host" });
    }

    // Promote guest → host
    await adminClient
      .from("users")
      .update({ role: "host" })
      .eq("id", user.id);

    // Create host_profiles row if not exists
    const { data: existingHost } = await adminClient
      .from("host_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingHost) {
      // Pull display name from guest_profiles or users
      const displayName = profile.full_name ?? user.email?.split("@")[0] ?? "Host";

      await adminClient.from("host_profiles").insert({
        user_id: user.id,
        display_name: displayName,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Upgrade] Error:", err);
    return NextResponse.json({ error: "Failed to upgrade account" }, { status: 500 });
  }
}
