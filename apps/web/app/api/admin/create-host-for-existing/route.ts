import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSanityClient } from "next-sanity";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sanity = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

/**
 * GET /api/admin/create-host-for-existing?email=jess.mckenziem@gmail.com
 * One-time script to create Sanity host document for existing hosts.
 * Remove after use.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "?email= required" }, { status: 400 });
  }

  // 1. Fetch host profile
  const { data: hostProfile, error: hpErr } = await supabase
    .from("host_profiles")
    .select("id, user_id, display_name, phone, slug, ghl_contact_id, sanity_host_id")
    .eq("email", email)
    .single();

  if (hpErr || !hostProfile) {
    return NextResponse.json({ error: "Host profile not found", details: hpErr }, { status: 404 });
  }

  if (hostProfile.sanity_host_id) {
    return NextResponse.json({
      error: "Host already has a Sanity document",
      sanity_host_id: hostProfile.sanity_host_id,
    }, { status: 409 });
  }

  // 2. Fetch approved claim to get listing_sanity_id
  const { data: claim } = await supabase
    .from("claim_requests")
    .select("listing_sanity_id, listing_title, website_url, social_media_url")
    .eq("claimant_email", email)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // 3. Create Sanity host document
  const slugBase = hostProfile.display_name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

  const listings = claim?.listing_sanity_id
    ? [{ _type: "reference", _ref: claim.listing_sanity_id, _key: Math.random().toString(36).slice(2, 10) }]
    : [];

  const sanityHost = await sanity.create({
    _type: "host",
    name: hostProfile.display_name,
    slug: { _type: "slug", current: slugBase },
    email: email,
    phone: hostProfile.phone ?? undefined,
    website: claim?.website_url ?? undefined,
    instagram: claim?.social_media_url ?? undefined,
    planTier: "basic",
    supabaseUserId: hostProfile.user_id,
    verified: true,
    createdAt: new Date().toISOString(),
    listings,
  });

  // 4. Patch listing with host reference
  if (claim?.listing_sanity_id) {
    await sanity
      .patch(claim.listing_sanity_id)
      .set({
        host: { _type: "reference", _ref: sanityHost._id },
        hostName: hostProfile.display_name,
      })
      .commit();
  }

  // 5. Update host_profiles with sanity_host_id
  await supabase
    .from("host_profiles")
    .update({ sanity_host_id: sanityHost._id })
    .eq("user_id", hostProfile.user_id);

  return NextResponse.json({
    success: true,
    sanityHostId: sanityHost._id,
    hostName: hostProfile.display_name,
    listingLinked: claim?.listing_title ?? null,
  });
}
