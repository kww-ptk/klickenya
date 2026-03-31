import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ count: 0 });

    const { data: hostProfile } = await adminClient
      .from("host_profiles")
      .select("user_id, sanity_host_id")
      .eq("user_id", user.id)
      .single();

    if (!hostProfile) return NextResponse.json({ count: 0 });

    const listingIds = await sanityClient.fetch<string[]>(
      `*[_type == "listing" && (hostId == $hostId || host._ref == $sanityHostId)]._id`,
      { hostId: hostProfile.user_id, sanityHostId: hostProfile.sanity_host_id ?? "" }
    );

    if (listingIds.length === 0) return NextResponse.json({ count: 0 });

    const { count } = await adminClient
      .from("contact_requests")
      .select("id", { count: "exact", head: true })
      .in("listing_sanity_id", listingIds)
      .eq("status", "new");

    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
