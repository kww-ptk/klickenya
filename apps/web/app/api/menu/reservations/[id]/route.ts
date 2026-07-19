import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { sanityClient } from "@/lib/sanity/client";
import { imageUrl } from "@/lib/sanity/image";
import { getMenuAuth, verifyMenuAccess } from "../../_lib/auth";
import { generateWhatsAppUrl, type WhatsAppTransition } from "../_lib/whatsapp";

/* ── Allowed status transitions (V1) ────────────────────────────────────────
 *
 * From        → To          Notes
 * ─────────────────────────────────────────────────────────────────────────
 * pending     → approved    Sets approved_at + approved_by
 * pending     → declined    Requires non-empty decline_reason
 * pending     → cancelled   Owner-initiated cancellation before acting
 * approved    → cancelled   Owner-initiated after approving
 *
 * TODO V2: Check-in flow will add:
 *   approved    → checked_in
 *   checked_in  → completed
 *   approved    → no_show
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "declined", "cancelled"],
  approved: ["cancelled"],
};

/* ── Nairobi date/time helpers ───────────────────────────────────────────── */

function formatNairobiDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
}

function formatNairobiTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
}

/* ── Guest email templates ───────────────────────────────────────────────── */

/** Restaurant contact/context resolved from Sanity + Supabase, shared by all
 *  three guest emails. Any field may be null when the data isn't available. */
interface RestaurantContact {
  logoUrl: string | null;
  whatsappUrl: string | null; // base https://wa.me/<digits> (no ?text=)
  mapsUrl: string | null;
  addressLine: string | null;
}

/** Escape user/CMS-provided strings before interpolating into email HTML.
 *  Coerces non-string input (null/undefined/number) so a missing DB/CMS field
 *  can never throw and silently kill the whole email. */
function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;"
      : c === "<" ? "&lt;"
      : c === ">" ? "&gt;"
      : c === '"' ? "&quot;"
      : "&#39;",
  );
}

function partyLabel(n: number): string {
  return `${n} ${n === 1 ? "guest" : "guests"}`;
}

/** Email header: restaurant logo (if any) + name, on an accent bar. */
function headerHtml(accent: string, eyebrow: string, restaurantName: string, logoUrl: string | null): string {
  const name = esc(restaurantName);
  const logoCell = logoUrl
    ? `<td width="56" style="padding-right:14px;vertical-align:middle;">
         <img src="${esc(logoUrl)}" width="56" height="56" alt="${name}"
           style="display:block;width:56px;height:56px;border-radius:12px;object-fit:cover;background-color:#fff;border:2px solid rgba(255,255,255,.35);"/>
       </td>`
    : "";
  return `<tr><td style="background-color:${accent};padding:22px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${logoCell}
      <td style="vertical-align:middle;">
        <div style="color:rgba(255,255,255,.82);font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;">${esc(eyebrow)}</div>
        <div style="color:#fff;font-size:21px;font-weight:700;letter-spacing:-.3px;line-height:1.2;">${name}</div>
      </td>
    </tr></table>
  </td></tr>`;
}

/** Reservation detail card: date / time / guests rows. */
function detailCardHtml(partySize: number, formattedDate: string, formattedTime: string): string {
  const row = (label: string, value: string, border: boolean) =>
    `<tr>
      <td style="padding:10px 0;${border ? "border-bottom:1px solid #eee;" : ""}font-size:13px;color:#888;">${label}</td>
      <td style="padding:10px 0;${border ? "border-bottom:1px solid #eee;" : ""}font-size:14px;font-weight:600;color:#111;text-align:right;">${value}</td>
    </tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="background-color:#f9fafb;border:1px solid #eef0f2;border-radius:8px;padding:4px 16px;margin:0 0 24px;">
      ${row("Date", esc(formattedDate), true)}
      ${row("Time", esc(formattedTime), true)}
      ${row("Party", partyLabel(partySize), false)}
    </table>`;
}

/** Contact block: address, WhatsApp + directions buttons, cancel note. */
function contactHtml(contact: RestaurantContact, whatsappText: string, cancelNote: string): string {
  const { whatsappUrl, mapsUrl, addressLine } = contact;
  const parts: string[] = [];

  if (addressLine) {
    parts.push(
      `<p style="margin:0 0 14px;font-size:14px;color:#333;line-height:1.5;">
        <span style="color:#16A34A;">&#128205;</span> ${esc(addressLine)}
      </p>`,
    );
  }

  const buttons: string[] = [];
  if (whatsappUrl) {
    const href = `${whatsappUrl}?text=${encodeURIComponent(whatsappText)}`;
    buttons.push(
      `<td style="padding:0 8px 8px 0;">
        <a href="${esc(href)}" style="display:inline-block;background-color:#16A34A;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:8px;">Message on WhatsApp</a>
      </td>`,
    );
  }
  if (mapsUrl) {
    buttons.push(
      `<td style="padding:0 0 8px;">
        <a href="${esc(mapsUrl)}" style="display:inline-block;background-color:#fff;color:#111;border:1px solid #d4d4d8;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:8px;">Get directions</a>
      </td>`,
    );
  }
  if (buttons.length) {
    parts.push(
      `<table role="presentation" cellpadding="0" cellspacing="0"><tr>${buttons.join("")}</tr></table>`,
    );
  }

  // Cancel note — prefer WhatsApp wording when a number is available.
  parts.push(
    `<p style="margin:16px 0 0;font-size:13px;color:#666;line-height:1.6;">${cancelNote}</p>`,
  );

  return parts.join("\n");
}

/** Outer email shell shared by every guest email. `header` and `inner` are
 *  pre-built HTML rows/blocks. */
function emailShell(title: string, header: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
  <tr><td align="center" style="padding:24px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0"
      style="max-width:600px;width:100%;background-color:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
      ${header}
      <tr><td style="padding:32px;">
        ${inner}
      </td></tr>
      <tr><td style="padding:18px 32px;background-color:#fafafa;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Booking managed via <strong style="color:#16A34A;">Klickenya</strong> &middot; klickenya.com</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function guestApproveHtml(opts: {
  guestName: string;
  restaurantName: string;
  partySize: number;
  formattedDate: string;
  formattedTime: string;
  contact: RestaurantContact;
}): string {
  const { guestName, restaurantName, partySize, formattedDate, formattedTime, contact } = opts;
  const cancelNote = contact.whatsappUrl
    ? "Need to cancel or change your booking? Please send us a message on WhatsApp."
    : "Need to cancel or change your booking? Please contact the restaurant directly.";
  const whatsappText = `Hi ${restaurantName}, this is ${guestName}. Regarding my reservation on ${formattedDate} at ${formattedTime} (${partyLabel(partySize)})...`;
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111;">Reservation confirmed &#127881;</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.6;">
      Hi ${esc(guestName)}, your table at <strong>${esc(restaurantName)}</strong> is confirmed. We look forward to seeing you!
    </p>
    ${detailCardHtml(partySize, formattedDate, formattedTime)}
    ${contactHtml(contact, whatsappText, cancelNote)}`;
  return emailShell(
    "Reservation confirmed",
    headerHtml("#16A34A", "Reservation confirmed", restaurantName, contact.logoUrl),
    inner,
  );
}

function guestDeclineHtml(opts: {
  guestName: string;
  restaurantName: string;
  partySize: number;
  formattedDate: string;
  formattedTime: string;
  declineReason: string;
  contact: RestaurantContact;
}): string {
  const { guestName, restaurantName, partySize, formattedDate, formattedTime, declineReason, contact } = opts;
  const cancelNote = contact.whatsappUrl
    ? "Have a question or want to try another time? Send us a message on WhatsApp."
    : "Have a question or want to try another time? Please contact the restaurant directly.";
  const whatsappText = `Hi ${restaurantName}, this is ${guestName}. About my reservation request on ${formattedDate} at ${formattedTime}...`;
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111;">Reservation update</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.6;">
      Hi ${esc(guestName)}, unfortunately we can't confirm your reservation at
      <strong>${esc(restaurantName)}</strong>.
    </p>
    ${detailCardHtml(partySize, formattedDate, formattedTime)}
    <div style="padding:14px 16px;background-color:#fef9ec;border-radius:8px;border:1px solid #fde68a;margin:0 0 8px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.05em;">Reason</p>
      <p style="margin:0;font-size:14px;color:#78350f;">${esc(declineReason)}</p>
    </div>
    ${contactHtml(contact, whatsappText, cancelNote)}`;
  return emailShell(
    "Reservation update",
    headerHtml("#E8A020", "Reservation update", restaurantName, contact.logoUrl),
    inner,
  );
}

function guestCancelHtml(opts: {
  guestName: string;
  restaurantName: string;
  partySize: number;
  formattedDate: string;
  formattedTime: string;
  contact: RestaurantContact;
}): string {
  const { guestName, restaurantName, partySize, formattedDate, formattedTime, contact } = opts;
  const cancelNote = contact.whatsappUrl
    ? "To rebook, please send us a message on WhatsApp."
    : "To rebook, please contact the restaurant directly.";
  const whatsappText = `Hi ${restaurantName}, this is ${guestName}. I'd like to rebook a table...`;
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111;">Reservation cancelled</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.6;">
      Hi ${esc(guestName)}, we need to cancel your reservation at <strong>${esc(restaurantName)}</strong>.
      We're sorry for the inconvenience.
    </p>
    ${detailCardHtml(partySize, formattedDate, formattedTime)}
    ${contactHtml(contact, whatsappText, cancelNote)}`;
  return emailShell(
    "Reservation cancelled",
    headerHtml("#6B7280", "Reservation cancelled", restaurantName, contact.logoUrl),
    inner,
  );
}

/* ── Guest email sender (non-blocking — failure never fails the PATCH) ────── */

async function sendGuestEmail(opts: {
  guestEmail: string;
  newStatus: "approved" | "declined" | "cancelled";
  guestName: string;
  restaurantName: string;
  partySize: number;
  reservedFor: string;
  contact: RestaurantContact;
  declineReason?: string;
}): Promise<{ id: string | null; skipped?: boolean }> {
  if (!process.env.RESEND_API_KEY) return { id: null, skipped: true };

  const { guestEmail, newStatus, guestName, restaurantName, partySize, reservedFor, contact, declineReason } = opts;
  const formattedDate = formatNairobiDate(reservedFor);
  const formattedTime = formatNairobiTime(reservedFor);

  let subject: string;
  let html: string;

  if (newStatus === "approved") {
    subject = `Reservation confirmed at ${restaurantName} — ${formattedDate}`;
    html = guestApproveHtml({ guestName, restaurantName, partySize, formattedDate, formattedTime, contact });
  } else if (newStatus === "declined") {
    subject = `Reservation update — ${restaurantName}`;
    html = guestDeclineHtml({ guestName, restaurantName, partySize, formattedDate, formattedTime, declineReason: declineReason ?? "", contact });
  } else {
    subject = `Reservation cancelled — ${restaurantName}`;
    html = guestCancelHtml({ guestName, restaurantName, partySize, formattedDate, formattedTime, contact });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  // The Resend SDK returns { data, error } — it does NOT throw on API-level
  // rejections. Historically we ignored `error`, so any rejected send (e.g.
  // unverified domain, rate limit) failed completely silently. Surface it.
  const { data, error } = await resend.emails.send({
    from: "Klickenya Bookings <bookings@klickenya.com>",
    to: guestEmail,
    subject,
    html,
  });
  if (error) {
    throw new Error(`Resend rejected email: ${error.name ?? "unknown"} — ${error.message ?? JSON.stringify(error)}`);
  }
  return { id: data?.id ?? null };
}

/* ── Restaurant name + contact resolver ──────────────────────────────────── */

/** Resolve the correct restaurant name + contact (logo, WhatsApp, maps, address)
 *  for guest emails. The display name comes from the Sanity listing `title`
 *  (NOT the menu name, which is an internal menu label), falling back to the
 *  menu name and then a generic label. WhatsApp uses the host phone (Sanity
 *  host → Supabase host_profiles). All lookups are best-effort and never throw. */
async function resolveRestaurant(
  menuId: string,
): Promise<{ restaurantName: string; contact: RestaurantContact }> {
  const contact: RestaurantContact = {
    logoUrl: null,
    whatsappUrl: null,
    mapsUrl: null,
    addressLine: null,
  };

  const { data: menu } = await adminClient
    .from("menus")
    .select("name, listing_slug, business_id")
    .eq("id", menuId)
    .single();

  let restaurantName = menu?.name ?? "the restaurant";
  let hostPhone: string | null = null;

  if (menu?.listing_slug) {
    try {
      const listing = await sanityClient.fetch<{
        title?: string;
        address?: string;
        city?: string;
        county?: string;
        listingPhoto?: Parameters<typeof imageUrl>[0];
        host?: { phone?: string; photo?: Parameters<typeof imageUrl>[0] } | null;
      } | null>(
        `*[_type == "listing" && slug.current == $slug][0]{
          title, address, city, county,
          "listingPhoto": photos[0],
          host->{ phone, photo }
        }`,
        { slug: menu.listing_slug },
      );

      if (listing?.title) restaurantName = listing.title;
      if (listing?.host?.phone) hostPhone = listing.host.phone;

      // Logo: prefer the host's profile photo; fall back to the listing photo.
      const logoSource = listing?.host?.photo ?? listing?.listingPhoto;
      if (logoSource) {
        try {
          contact.logoUrl = imageUrl(logoSource, 200);
        } catch {
          /* image builder failure is non-fatal */
        }
      }

      const addressParts = [listing?.address, listing?.city, listing?.county]
        .map((p) => p?.trim())
        .filter((p): p is string => !!p);
      if (addressParts.length) contact.addressLine = addressParts.join(", ");

      const mapsQuery = [restaurantName, ...addressParts].join(", ");
      contact.mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;
    } catch {
      // Non-blocking — email still sends with the menu-name fallback.
    }
  }

  // WhatsApp number: Sanity host phone → Supabase host_profiles.phone fallback.
  if (!hostPhone && menu?.business_id) {
    const { data: hostProfile } = await adminClient
      .from("host_profiles")
      .select("phone")
      .eq("user_id", menu.business_id)
      .single();
    if (hostProfile?.phone) hostPhone = hostProfile.phone;
  }

  const waDigits = hostPhone ? hostPhone.replace(/\D/g, "") : "";
  if (waDigits.length >= 7) contact.whatsappUrl = `https://wa.me/${waDigits}`;

  return { restaurantName, contact };
}

/* ── PATCH /api/menu/reservations/[id] ──────────────────────────────────── */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: reservationId } = await params;

    // ── Auth (same pattern as PATCH /api/menu/orders) ─────────────────────
    const { userId, isAdmin, supabase } = await getMenuAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { status: newStatus, owner_note, decline_reason } = body as {
      status?: string;
      owner_note?: string;
      decline_reason?: string;
    };

    // Must supply at least one updatable field
    if (newStatus === undefined && owner_note === undefined) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // ── Fetch reservation (admin bypass — ownership verified below) ─────────
    const { data: reservation, error: fetchErr } = await adminClient
      .from("reservations")
      .select(
        "id, menu_id, status, guest_name, guest_phone, guest_email, party_size, reserved_for",
      )
      .eq("id", reservationId)
      .single();

    if (fetchErr || !reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    // ── Ownership check ────────────────────────────────────────────────────
    const menuAccess = await verifyMenuAccess(
      supabase,
      reservation.menu_id,
      userId,
      isAdmin,
    );
    if (!menuAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── owner_note-only PATCH (no status change) ───────────────────────────
    if (newStatus === undefined) {
      const { error: noteErr } = await adminClient
        .from("reservations")
        .update({ owner_note })
        .eq("id", reservationId);

      if (noteErr) {
        console.error("[reservations PATCH] note update error:", noteErr);
        return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
      }

      return NextResponse.json({ success: true, owner_note, whatsapp_url: null });
    }

    // ── Status transition validation ───────────────────────────────────────
    const currentStatus = reservation.status as string;
    const allowedNext = VALID_TRANSITIONS[currentStatus] ?? [];

    if (!allowedNext.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
        },
        { status: 400 },
      );
    }

    // ── decline_reason required for declined ───────────────────────────────
    if (newStatus === "declined") {
      if (!decline_reason || !decline_reason.trim()) {
        return NextResponse.json(
          { error: "decline_reason is required when declining a reservation" },
          { status: 400 },
        );
      }
    }

    // ── Build update payload ───────────────────────────────────────────────
    const updates: Record<string, unknown> = { status: newStatus };

    if (typeof owner_note === "string") updates.owner_note = owner_note;

    if (newStatus === "declined" && decline_reason) {
      updates.decline_reason = decline_reason.trim();
    }

    if (newStatus === "approved") {
      updates.approved_at = new Date().toISOString();
      // approved_by exists in schema (migration 049, promoted from DORMANT V2 to active use)
      // TODO V2: Add FK enforcement once all hosts use SSO-linked auth.users rows.
      updates.approved_by = userId;
    }

    const { error: updateErr } = await adminClient
      .from("reservations")
      .update(updates)
      .eq("id", reservationId);

    if (updateErr) {
      console.error("[reservations PATCH] update error:", updateErr);

      // If approved_by FK causes an issue (unlikely but defensive), retry without it
      if (newStatus === "approved" && updateErr.code === "23503") {
        console.warn(
          "[reservations PATCH] approved_by FK violation — skipping approved_by field",
        );
        const { approved_by: _drop, ...updatesWithoutApprovedBy } = updates as typeof updates & { approved_by: unknown };
        const { error: retryErr } = await adminClient
          .from("reservations")
          .update(updatesWithoutApprovedBy)
          .eq("id", reservationId);

        if (retryErr) {
          return NextResponse.json({ error: "Failed to update reservation" }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: "Failed to update reservation" }, { status: 500 });
      }
    }

    // ── Resolve restaurant name + contact (Sanity listing → menu fallback) ─
    // restaurantName is the listing title, not the internal menu label.
    const { restaurantName, contact } = await resolveRestaurant(reservation.menu_id);

    const whatsAppTransitions: WhatsAppTransition[] = ["approved", "declined", "cancelled"];
    const whatsapp_url = whatsAppTransitions.includes(newStatus as WhatsAppTransition)
      ? generateWhatsAppUrl(
          {
            guest_name: reservation.guest_name,
            guest_phone: reservation.guest_phone,
            party_size: reservation.party_size,
            reserved_for: reservation.reserved_for,
            decline_reason: newStatus === "declined" ? decline_reason : null,
          },
          newStatus as WhatsAppTransition,
          restaurantName,
        )
      : null;

    // ── Guest notification email (non-blocking — failure never fails the PATCH) ─
    // NOTE: Guest emails (approve/decline/cancel) fire on admin actions identically
    // to owner actions. Per April 2026 decision: admin = full superuser parity,
    // no email guard. Do not add isAdmin suppression without revisiting this decision.
    // Awaited (not fire-and-forget): a fire-and-forget send can be truncated
    // when the serverless function freezes after the response returns, which
    // silently drops the email. Awaiting also lets us report the real outcome.
    // Email failure is still NON-FATAL — the status change already succeeded.
    const guestEmail = reservation.guest_email as string | null;
    const emailEligible =
      !!guestEmail && whatsAppTransitions.includes(newStatus as WhatsAppTransition);
    let guestEmailSent = false;
    let emailError: string | null = null;

    if (emailEligible && guestEmail) {
      try {
        const result = await sendGuestEmail({
          guestEmail,
          newStatus: newStatus as "approved" | "declined" | "cancelled",
          guestName: reservation.guest_name,
          restaurantName,
          partySize: reservation.party_size,
          reservedFor: reservation.reserved_for,
          contact,
          declineReason: newStatus === "declined" ? decline_reason : undefined,
        });
        guestEmailSent = !result.skipped;
      } catch (err) {
        emailError = err instanceof Error ? err.message : String(err);
        console.error(
          `[reservations PATCH] guest email failed (non-fatal) — reservation=${reservationId} status=${newStatus}:`,
          emailError,
        );
      }
    } else if (!guestEmail && whatsAppTransitions.includes(newStatus as WhatsAppTransition)) {
      console.warn(
        `[reservations PATCH] no guest_email on reservation=${reservationId} — confirmation email skipped`,
      );
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      whatsapp_url,
      guest_email_sent: guestEmailSent,
      email_error: emailError,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
