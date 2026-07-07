import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { verifyPartnerKey, resolvePartnerOwner } from "@/lib/partner/auth";

/**
 * GET /api/partner/properties?partner=<partner_id>
 * Authorization: Bearer <partner's key from PARTNER_API_KEYS>
 *
 * Lists this partner's villas out of Klickenya's real PMS (`properties` +
 * `rooms`) for the partner's own admin panel. One Klickenya `rooms` row is
 * treated as one partner-site "villa" — that's where the editable content
 * (name, description, amenities, photos, price) actually lives; the parent
 * `properties` row carries booking/PMS config (booking_slug, city, etc.).
 * Server-to-server only; never called from a browser.
 */

export async function GET(request: NextRequest) {
  const partner = request.nextUrl.searchParams.get("partner");
  if (!partner) {
    return NextResponse.json({ error: "partner query param required" }, { status: 400 });
  }

  if (!verifyPartnerKey(request.headers.get("authorization"), partner)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = await resolvePartnerOwner(partner);
  if (!ownerId) {
    return NextResponse.json({ villas: [] });
  }

  const { data: props } = await adminClient
    .from("properties")
    .select("id, name, city, county, booking_slug, is_active")
    .eq("owner_id", ownerId);
  const properties = props ?? [];
  const propertyIds = properties.map((p) => p.id);

  if (propertyIds.length === 0) {
    return NextResponse.json({ villas: [] });
  }

  const { data: rooms } = await adminClient
    .from("rooms")
    .select(
      "id, property_id, name, description, base_price_kes, max_guests, room_size_sqm, amenities, photos, is_active, display_order"
    )
    .in("property_id", propertyIds)
    .order("display_order", { ascending: true });

  const propertyById = new Map(properties.map((p) => [p.id, p]));
  const villas = (rooms ?? []).map((r) => {
    const property = propertyById.get(r.property_id);
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      price_kes: r.base_price_kes,
      max_guests: r.max_guests,
      size_sqm: r.room_size_sqm,
      amenities: r.amenities ?? [],
      photos: r.photos ?? [],
      is_active: r.is_active,
      sort_order: r.display_order,
      city: property?.city ?? null,
      county: property?.county ?? null,
      booking_slug: property?.booking_slug ?? null,
    };
  });

  return NextResponse.json({ villas });
}
