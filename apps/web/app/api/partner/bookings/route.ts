import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { verifyPartnerKey, resolvePartnerOwner } from "@/lib/partner/auth";

/**
 * GET /api/partner/bookings?partner=<partner_id>
 * Authorization: Bearer <partner's key from PARTNER_API_KEYS>
 *
 * Read-only feed of a partner's holds & bookings from Klickenya's PMS:
 *   - confirmed reservations (`bookings`) that block the calendar
 *   - held enquiries (`contact_requests` with calendar_status = 'held')
 * Merged into one list, newest first, so the partner's own admin can show a
 * "Holds & Bookings" view.
 *
 * Managing them (confirm / cancel / convert) is NOT exposed here — those flows
 * are owner-authenticated in the Klickenya host dashboard and have different
 * semantics from Claris's old hold model. See docs/claris-remaining-plan.md
 * Phase 2D. Server-to-server only; never called from a browser.
 */

type Row = {
  id: string;
  kind: "booking" | "hold";
  guest_name: string | null;
  guest_email: string | null;
  room_name: string | null;
  check_in: string | null;
  check_out: string | null;
  status: string | null;
  total_kes: number | null;
  created_at: string;
};

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
    return NextResponse.json({ bookings: [] satisfies Row[] });
  }

  const { data: ownedProps } = await adminClient
    .from("properties")
    .select("id, name")
    .eq("owner_id", ownerId);
  const properties = ownedProps ?? [];
  const propertyIds = properties.map((p) => p.id);
  const propertyName = new Map(properties.map((p) => [p.id, p.name]));

  if (propertyIds.length === 0) {
    return NextResponse.json({ bookings: [] satisfies Row[] });
  }

  const [bookingsRes, holdsRes] = await Promise.all([
    adminClient
      .from("bookings")
      .select(
        "id, property_id, guest_name, guest_email, check_in_date, check_out_date, status, total_kes, created_at"
      )
      .in("property_id", propertyIds)
      .order("created_at", { ascending: false })
      .limit(200),
    adminClient
      .from("contact_requests")
      .select("id, full_name, email, listing_title, check_in, check_out, calendar_status, created_at")
      .in("property_id", propertyIds)
      .eq("calendar_status", "held")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const rows: Row[] = [
    ...(bookingsRes.data ?? []).map(
      (b): Row => ({
        id: `booking-${b.id}`,
        kind: "booking",
        guest_name: b.guest_name,
        guest_email: b.guest_email,
        room_name: propertyName.get(b.property_id) ?? null,
        check_in: b.check_in_date,
        check_out: b.check_out_date,
        status: b.status,
        total_kes: b.total_kes,
        created_at: b.created_at,
      })
    ),
    ...(holdsRes.data ?? []).map(
      (h): Row => ({
        id: `hold-${h.id}`,
        kind: "hold",
        guest_name: h.full_name,
        guest_email: h.email,
        room_name: h.listing_title,
        check_in: h.check_in,
        check_out: h.check_out,
        status: "held",
        total_kes: null,
        created_at: h.created_at,
      })
    ),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return NextResponse.json({ bookings: rows });
}
