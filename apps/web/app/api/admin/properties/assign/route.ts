import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/properties/assign
 * Admin creates or links a property row for a host.
 * Body: { host_email, listing_slug, listing_title, city }
 *
 * This is the admin-assign path — equivalent to what happens
 * automatically on claim for stay listings, but triggered manually.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { host_email, listing_slug, listing_title, city } = body;

  if (!host_email || !listing_slug) {
    return NextResponse.json(
      { error: "host_email and listing_slug are required" },
      { status: 400 }
    );
  }

  // Find the host user by email
  const { data: hostUsers } = await adminClient.auth.admin.listUsers();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hostUser = hostUsers?.users?.find((u: any) => u.email === host_email);
  if (!hostUser) {
    return NextResponse.json(
      { error: `No user found with email ${host_email}` },
      { status: 404 }
    );
  }

  // Check if property already exists for this slug
  const { data: existing } = await adminClient
    .from("properties")
    .select("id")
    .eq("listing_slug", listing_slug)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "Property already exists for this listing", property_id: existing[0].id },
      { status: 409 }
    );
  }

  // Create property row
  const { data: property, error: insertErr } = await adminClient
    .from("properties")
    .insert({
      owner_id: hostUser.id,
      listing_slug,
      name: listing_title || listing_slug,
      property_type: "villa",
      is_entire_property: true,
      city: city || null,
      is_active: false,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ property }, { status: 201 });
}
