import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ids: [] });

    const { data } = await adminClient
      .from("saved_listings")
      .select("sanity_listing_id")
      .eq("user_id", user.id);

    const ids = (data ?? []).map((r) => r.sanity_listing_id);
    return NextResponse.json({ ids });
  } catch {
    return NextResponse.json({ ids: [] });
  }
}
