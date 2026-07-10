import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { verifyPartnerKey, resolvePartnerOwner } from "@/lib/partner/auth";

/**
 * GET/PATCH /api/partner/properties/[roomId]?partner=<partner_id>
 * Authorization: Bearer <partner's key from PARTNER_API_KEYS>
 *
 * Read or update one villa's content (a Klickenya `rooms` row). Ownership is
 * checked via the room's parent `properties.owner_id` against the partner's
 * host user_id — a partner can only touch its own villas.
 * Server-to-server only; never called from a browser.
 */

const EDITABLE_FIELDS = [
  "name",
  "description",
  "short_description",
  "bed_count",
  "faqs",
  "base_price_kes",
  "max_guests",
  "room_size_sqm",
  "amenities",
  "is_active",
  "display_order",
] as const;

async function loadOwnedRoom(roomId: string, partner: string) {
  const ownerId = await resolvePartnerOwner(partner);
  if (!ownerId) return { ownerId: null, room: null };

  const { data: room } = await adminClient
    .from("rooms")
    .select(
      "id, property_id, name, description, short_description, bed_count, faqs, base_price_kes, max_guests, room_size_sqm, amenities, photos, is_active, display_order, properties(owner_id, city, county, booking_slug)"
    )
    .eq("id", roomId)
    .maybeSingle();

  if (!room || (room.properties as unknown as { owner_id: string } | null)?.owner_id !== ownerId) {
    return { ownerId, room: null };
  }
  return { ownerId, room };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const partner = request.nextUrl.searchParams.get("partner");
  if (!partner) {
    return NextResponse.json({ error: "partner query param required" }, { status: 400 });
  }
  if (!verifyPartnerKey(request.headers.get("authorization"), partner)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { room } = await loadOwnedRoom(roomId, partner);
  if (!room) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ villa: room });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const partner = request.nextUrl.searchParams.get("partner");
  if (!partner) {
    return NextResponse.json({ error: "partner query param required" }, { status: 400 });
  }
  if (!verifyPartnerKey(request.headers.get("authorization"), partner)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { room } = await loadOwnedRoom(roomId, partner);
  if (!room) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const { data: updated, error } = await adminClient
    .from("rooms")
    .update(update)
    .eq("id", roomId)
    .select(
      "id, property_id, name, description, short_description, bed_count, faqs, base_price_kes, max_guests, room_size_sqm, amenities, photos, is_active, display_order"
    )
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ villa: updated });
}
