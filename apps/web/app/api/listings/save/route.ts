import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sanityListingId } = (await request.json()) as { sanityListingId?: string };
  if (!sanityListingId) {
    return NextResponse.json({ error: "sanityListingId is required" }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from("saved_listings")
    .upsert(
      { user_id: user.id, sanity_listing_id: sanityListingId },
      { onConflict: "user_id,sanity_listing_id" }
    )
    .select();

  console.log("[Save API] Insert result:", { user_id: user.id, sanity_listing_id: sanityListingId, data, error });

  if (error) {
    console.error("Save listing error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sanityListingId } = (await request.json()) as { sanityListingId?: string };
  if (!sanityListingId) {
    return NextResponse.json({ error: "sanityListingId is required" }, { status: 400 });
  }

  const { error } = await adminClient
    .from("saved_listings")
    .delete()
    .eq("user_id", user.id)
    .eq("sanity_listing_id", sanityListingId);

  if (error) {
    console.error("Unsave listing error:", error);
    return NextResponse.json({ error: "Failed to unsave" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
