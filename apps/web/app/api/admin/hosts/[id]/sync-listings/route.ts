import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";
import { createClient as createSanityClient } from "next-sanity";

const sanityWrite = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertAdmin(request);
    const { id } = await params;

    // Fetch host profile
    const { data: host } = await adminClient
      .from("host_profiles")
      .select("user_id, sanity_host_id")
      .eq("id", id)
      .single();

    if (!host?.sanity_host_id) {
      return NextResponse.json({ error: "Host has no Sanity document" }, { status: 400 });
    }

    // Fetch all listings assigned to this host from Sanity
    const listings = await sanityWrite.fetch<{ _id: string }[]>(
      `*[_type == "listing" && (hostId == $hostId || host._ref == $sanityHostId)]{ _id }`,
      { hostId: host.user_id, sanityHostId: host.sanity_host_id }
    );

    // Rebuild the listings array on the host document
    const refs = listings.map((l) => ({
      _type: "reference" as const,
      _ref: l._id,
      _key: l._id.slice(-8),
    }));

    await sanityWrite
      .patch(host.sanity_host_id)
      .set({ listings: refs })
      .commit();

    return NextResponse.json({ success: true, synced: refs.length });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Sync listings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
