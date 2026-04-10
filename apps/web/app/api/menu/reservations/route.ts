import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { sanityClient } from "@/lib/sanity/client";
import { getMenuAuth, verifyMenuAccess } from "../_lib/auth";

/* ── Phone validation (same regex as /api/contact) ──────────────────────── */
const internationalPhone = /^\+\d{7,15}$/;

/* ── Nairobi timezone helpers ────────────────────────────────────────────── */
// All time math uses Intl.DateTimeFormat with timeZone: 'Africa/Nairobi'. No manual UTC+3.

function getNairobiNow(): Date {
  // Returns a Date whose UTC value represents the current wall-clock time in Nairobi.
  // We achieve this by formatting current time as Nairobi local, then parsing back.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const isoStr = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
  return new Date(isoStr); // treat as local for comparison purposes
}

function formatNairobiDateTime(isoStr: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(isoStr));
}

/* ── Email template ──────────────────────────────────────────────────────── */

function reservationNotificationHtml(opts: {
  guestName: string;
  guestPhone: string;
  partySize: number;
  reservedFor: string;       // ISO string
  areaName: string | null;
  guestMessage: string | null;
  restaurantName: string;
  dashboardUrl: string;
}): string {
  const {
    guestName, guestPhone, partySize, reservedFor,
    areaName, guestMessage, restaurantName, dashboardUrl,
  } = opts;

  const formattedDateTime = formatNairobiDateTime(reservedFor);

  const detailRows = [
    ["Restaurant", restaurantName],
    ["Date & time", formattedDateTime],
    ["Party size", String(partySize)],
    ...(areaName ? [["Area preference", areaName]] : []),
  ]
    .map(
      ([k, v]) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;white-space:nowrap;">${k}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${v}</td>
        </tr>`,
    )
    .join("");

  const messageSection = guestMessage
    ? `<h2 style="margin:24px 0 12px;font-size:16px;font-weight:600;color:#111;">Guest message</h2>
       <div style="padding:16px;background-color:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
         <p style="margin:0;font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap;">${guestMessage}</p>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>New Reservation Request</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
  <tr><td align="center" style="padding:24px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0"
      style="max-width:600px;width:100%;background-color:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
      <tr><td style="background-color:#E8A020;padding:24px 32px;">
        <span style="color:#fff;font-size:24px;font-weight:700;letter-spacing:-.5px;">Klickenya</span>
      </td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111;">New Reservation Request</h1>

        <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111;">Reservation details</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
          ${detailRows}
        </table>

        <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111;">Guest contact</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;white-space:nowrap;">Name</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;font-weight:600;">${guestName}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;color:#666;font-size:14px;white-space:nowrap;">Phone</td>
            <td style="padding:8px 12px;font-size:14px;"><a href="tel:${guestPhone}" style="color:#E8A020;text-decoration:underline;">${guestPhone}</a></td>
          </tr>
        </table>

        ${messageSection}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
          <tr><td align="center">
            <a href="${dashboardUrl}"
              style="display:inline-block;padding:12px 24px;background-color:#E8A020;color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">
              View in Reservations Dashboard
            </a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:20px 32px;background-color:#fafafa;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#999;text-align:center;">&copy; 2026 Klickenya &middot; klickenya.com</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/* ── POST ────────────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      menu_id,
      guest_name,
      guest_phone,
      party_size,
      reserved_for, // ISO string with timezone, e.g. "2026-04-15T19:00:00+03:00"
      area_id,
      guest_message,
      source,
    } = body;

    /* ── 1. Basic presence checks ── */
    if (!menu_id || typeof menu_id !== "string") {
      return NextResponse.json({ error: "menu_id required" }, { status: 400 });
    }
    if (!guest_name || typeof guest_name !== "string" || !guest_name.trim()) {
      return NextResponse.json({ error: "Guest name required" }, { status: 400 });
    }
    if (!guest_phone || !internationalPhone.test(guest_phone)) {
      return NextResponse.json(
        { error: "Enter a valid phone number with country code (e.g. +254712345678)" },
        { status: 400 },
      );
    }
    if (!party_size || typeof party_size !== "number" || party_size < 1) {
      return NextResponse.json({ error: "Party size must be at least 1" }, { status: 400 });
    }
    if (!reserved_for || typeof reserved_for !== "string") {
      return NextResponse.json({ error: "reserved_for required" }, { status: 400 });
    }
    if (source !== "qr_menu" && source !== "listing" && source !== "direct" && source !== "phone") {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }

    /* ── 2. Fetch menu + validate reservations_enabled ── */
    const { data: menu, error: menuErr } = await adminClient
      .from("menus")
      .select(
        "id, name, slug, listing_slug, business_id, reservations_enabled, reservations_lead_time_hours, reservations_max_party_size, reservations_max_advance_days, default_reservation_duration",
      )
      .eq("id", menu_id)
      .single();

    if (menuErr || !menu) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    }
    if (!menu.reservations_enabled) {
      return NextResponse.json(
        { error: "Reservations are not enabled for this restaurant" },
        { status: 403 },
      );
    }

    /* ── 3. Validate party_size against menu cap ── */
    if (party_size > menu.reservations_max_party_size) {
      return NextResponse.json(
        { error: `Maximum party size is ${menu.reservations_max_party_size}` },
        { status: 400 },
      );
    }

    /* ── 4. Validate reserved_for ── */
    const reservedDate = new Date(reserved_for);
    if (isNaN(reservedDate.getTime())) {
      return NextResponse.json({ error: "Invalid reservation date" }, { status: 400 });
    }

    // Lead time check (Nairobi wall clock)
    const nairobiNow = getNairobiNow();
    const leadTimeMs = menu.reservations_lead_time_hours * 3600 * 1000;
    // Compare UTC epoch values — reserved_for has explicit timezone (+03:00) so getTime() is correct
    const reservedMs = reservedDate.getTime();
    const nowMs = new Date().getTime();
    if (reservedMs < nowMs + leadTimeMs) {
      const minHours = menu.reservations_lead_time_hours;
      return NextResponse.json(
        { error: `Reservations must be made at least ${minHours} hour${minHours !== 1 ? "s" : ""} in advance` },
        { status: 400 },
      );
    }

    // Max advance check
    const maxAdvanceMs = menu.reservations_max_advance_days * 24 * 3600 * 1000;
    if (reservedMs > nowMs + maxAdvanceMs) {
      return NextResponse.json(
        { error: `Reservations can only be made up to ${menu.reservations_max_advance_days} days in advance` },
        { status: 400 },
      );
    }

    // Suppress nairobiNow unused warning — it's used above for context, kept for future slot validation
    void nairobiNow;

    /* ── 5. Validate area_id (if provided) ── */
    let areaName: string | null = null;
    if (area_id) {
      const { data: area } = await adminClient
        .from("restaurant_areas")
        .select("id, name, is_active")
        .eq("id", area_id)
        .eq("menu_id", menu_id)
        .single();

      if (!area || !area.is_active) {
        return NextResponse.json({ error: "Invalid area selection" }, { status: 400 });
      }
      areaName = area.name;
    }

    /* ── 6. Insert reservation ── */
    const { data: reservation, error: insertErr } = await adminClient
      .from("reservations")
      .insert({
        menu_id,
        guest_name: guest_name.trim(),
        guest_phone,
        party_size,
        reserved_for,
        duration_minutes: menu.default_reservation_duration,
        area_id: area_id ?? null,
        status: "pending",
        guest_message: guest_message?.trim() || null,
        source,
      })
      .select("id")
      .single();

    if (insertErr || !reservation) {
      console.error("[reservations POST] insert error:", insertErr);
      return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 });
    }

    /* ── 7. Host notification email (non-blocking — failure never fails the insert) ── */
    if (process.env.RESEND_API_KEY) {
      void sendHostNotification({
        menu,
        reservationId: reservation.id,
        guestName: guest_name.trim(),
        guestPhone: guest_phone,
        partySize: party_size,
        reservedFor: reserved_for,
        areaName,
        guestMessage: guest_message?.trim() || null,
      }).catch((err) => {
        console.error("[reservations POST] email error (non-fatal):", err);
      });
    }

    return NextResponse.json(
      {
        reservation_id: reservation.id,
        estimated_response_time_hours: menu.reservations_lead_time_hours,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[reservations POST] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ── GET — list reservations for a menu (owner-only) ────────────────────── */

export async function GET(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const { userId, isAdmin, supabase } = await getMenuAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const menu_id = searchParams.get("menu_id");
    const since = searchParams.get("since"); // Optional ISO timestamp for incremental sync

    if (!menu_id) {
      return NextResponse.json({ error: "menu_id required" }, { status: 400 });
    }

    // ── Ownership check (same pattern as GET /api/menu/orders) ────────────────
    const menu = await verifyMenuAccess(supabase, menu_id, userId, isAdmin);
    if (!menu) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Build query ───────────────────────────────────────────────────────────
    // Fields: full V1 set; DORMANT V3 deposit columns deliberately excluded.
    let query = adminClient
      .from("reservations")
      .select(
        [
          "id",
          "menu_id",
          "guest_name",
          "guest_phone",
          "party_size",
          "reserved_for",
          "duration_minutes",
          "area_id",
          "status",
          "source",
          "guest_message",
          "owner_note",
          "decline_reason",
          "approved_at",
          "checked_in_at",
          "created_at",
          "updated_at",
          // Area join — will be flattened to area_name / area_color_hex below
          "area:restaurant_areas!area_id(name, color_hex)",
        ].join(", "),
      )
      .eq("menu_id", menu_id)
      .order("reserved_for", { ascending: true });

    if (since) {
      // Incremental sync: rows changed since the caller's last poll timestamp
      query = query.gte("updated_at", since);
    } else {
      // Default window: last 30 days + all future reservations.
      // reserved_for >= 30 days ago captures both groups in a single filter.
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("reserved_for", thirtyDaysAgo);
    }

    // TODO V2: Add cursor pagination when historical window extends beyond 30 days.

    const { data, error } = await query;

    if (error) {
      console.error("[reservations GET] error:", error);
      return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
    }

    // ── Flatten area join ─────────────────────────────────────────────────────
    // PostgREST returns { area: { name, color_hex } | null }; we flatten to
    // area_name and area_color_hex so callers get a uniform row shape.
    // Cast through unknown first because the inferred Supabase type for the
    // "area" join column doesn't overlap cleanly with our explicit shape.
    type RawArea = { name: string; color_hex: string | null } | null;
    type RawRow = Record<string, unknown> & { area: RawArea };
    const reservations = ((data ?? []) as unknown as RawRow[]).map(
      ({ area, ...rest }) => ({
        ...rest,
        area_name: area?.name ?? null,
        area_color_hex: area?.color_hex ?? null,
      }),
    );

    return NextResponse.json({ reservations });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ── PATCH — update reservation status (owner-only) ─────────────────────── */

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { reservation_id, status, owner_note, decline_reason } = body;

    if (!reservation_id || typeof reservation_id !== "string") {
      return NextResponse.json({ error: "reservation_id required" }, { status: 400 });
    }

    const validStatuses = ["pending", "approved", "declined", "checked_in", "completed", "no_show", "cancelled"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (typeof owner_note === "string") updates.owner_note = owner_note;
    if (typeof decline_reason === "string") updates.decline_reason = decline_reason;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { error } = await adminClient
      .from("reservations")
      .update(updates)
      .eq("id", reservation_id);

    if (error) {
      return NextResponse.json({ error: "Failed to update reservation" }, { status: 500 });
    }

    return NextResponse.json({ success: true, ...updates });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ── Email helper ────────────────────────────────────────────────────────── */

async function sendHostNotification(opts: {
  menu: {
    id: string;
    name: string;
    slug: string;
    listing_slug: string | null;
    business_id: string;
  };
  reservationId: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  reservedFor: string;
  areaName: string | null;
  guestMessage: string | null;
}) {
  const { menu, reservationId, guestName, guestPhone, partySize, reservedFor, areaName, guestMessage } = opts;

  // Resolve host email: try Sanity first, fall back to host_profiles
  let notificationEmails: string[] = [];

  // Resolve Sanity listing (for notification emails + listing command center URL)
  let sanityListingId: string | null = null;

  if (menu.listing_slug) {
    try {
      const sanityListing = await sanityClient.fetch<{
        _id: string;
        notificationEmail1?: string;
        notificationEmail2?: string;
      } | null>(
        `*[_type == "listing" && slug.current == $slug][0]{ _id, notificationEmail1, notificationEmail2 }`,
        { slug: menu.listing_slug },
      );
      if (sanityListing?._id) sanityListingId = sanityListing._id;
      if (sanityListing?.notificationEmail1) notificationEmails.push(sanityListing.notificationEmail1);
      if (sanityListing?.notificationEmail2) notificationEmails.push(sanityListing.notificationEmail2);
    } catch {
      // Non-blocking
    }
  }

  if (notificationEmails.length === 0) {
    const { data: hostProfile } = await adminClient
      .from("host_profiles")
      .select("email")
      .eq("user_id", menu.business_id)
      .single();
    if (hostProfile?.email) notificationEmails.push(hostProfile.email);
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const allRecipients = [
    ...(adminEmail ? [adminEmail] : []),
    ...notificationEmails,
  ].filter((e, i, arr) => arr.indexOf(e) === i);

  if (allRecipients.length === 0) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com";
  // Point to the listing command center when the Sanity _id is available.
  // Falls back to the legacy menu-scoped URL when listing_slug has no Sanity match.
  // TODO: remove fallback once all menus have a valid listing_slug in Sanity.
  const dashboardUrl = sanityListingId
    ? `${siteUrl}/dashboard/listings/${sanityListingId}/reservations`
    : `${siteUrl}/dashboard/menu/${menu.id}/reservations`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "Klickenya Bookings <bookings@klickenya.com>",
    to: allRecipients,
    subject: `New reservation request — ${guestName}, party of ${partySize}`,
    html: reservationNotificationHtml({
      guestName,
      guestPhone,
      partySize,
      reservedFor,
      areaName,
      guestMessage,
      restaurantName: menu.name,
      dashboardUrl,
    }),
  });
}
