import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
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

function guestApproveHtml(opts: {
  guestName: string;
  restaurantName: string;
  partySize: number;
  formattedDate: string;
  formattedTime: string;
}): string {
  const { guestName, restaurantName, partySize, formattedDate, formattedTime } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Reservation confirmed</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
  <tr><td align="center" style="padding:24px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0"
      style="max-width:600px;width:100%;background-color:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
      <tr><td style="background-color:#16A34A;padding:24px 32px;">
        <span style="color:#fff;font-size:24px;font-weight:700;letter-spacing:-.5px;">Klickenya</span>
      </td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Reservation confirmed!</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.6;">
          Hi ${guestName}, your reservation at <strong>${restaurantName}</strong> for
          ${partySize} on <strong>${formattedDate}</strong> at <strong>${formattedTime}</strong>
          is confirmed. We look forward to seeing you!
        </p>
        <div style="padding:16px;background-color:#f0fdf4;border-radius:6px;border:1px solid #bbf7d0;">
          <p style="margin:0;font-size:13px;color:#166534;">
            Please arrive on time. If you need to cancel or change your booking, contact the restaurant directly.
          </p>
        </div>
      </td></tr>
      <tr><td style="padding:20px 32px;background-color:#fafafa;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#999;text-align:center;">&copy; 2026 Klickenya &middot; klickenya.com</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function guestDeclineHtml(opts: {
  guestName: string;
  restaurantName: string;
  partySize: number;
  formattedDate: string;
  formattedTime: string;
  declineReason: string;
}): string {
  const { guestName, restaurantName, partySize, formattedDate, formattedTime, declineReason } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Reservation update</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
  <tr><td align="center" style="padding:24px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0"
      style="max-width:600px;width:100%;background-color:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
      <tr><td style="background-color:#E8A020;padding:24px 32px;">
        <span style="color:#fff;font-size:24px;font-weight:700;letter-spacing:-.5px;">Klickenya</span>
      </td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Reservation update</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.6;">
          Hi ${guestName}, unfortunately we can't confirm your reservation at
          <strong>${restaurantName}</strong> for ${partySize} on <strong>${formattedDate}</strong>
          at <strong>${formattedTime}</strong>.
        </p>
        <div style="padding:16px;background-color:#fef9ec;border-radius:6px;border:1px solid #fde68a;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.05em;">Reason</p>
          <p style="margin:0;font-size:14px;color:#78350f;">${declineReason}</p>
        </div>
        <p style="margin:0;font-size:14px;color:#666;">
          Please try another time or contact the restaurant directly.
        </p>
      </td></tr>
      <tr><td style="padding:20px 32px;background-color:#fafafa;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#999;text-align:center;">&copy; 2026 Klickenya &middot; klickenya.com</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function guestCancelHtml(opts: {
  guestName: string;
  restaurantName: string;
  partySize: number;
  formattedDate: string;
  formattedTime: string;
}): string {
  const { guestName, restaurantName, partySize, formattedDate, formattedTime } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Reservation cancelled</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
  <tr><td align="center" style="padding:24px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0"
      style="max-width:600px;width:100%;background-color:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
      <tr><td style="background-color:#6B7280;padding:24px 32px;">
        <span style="color:#fff;font-size:24px;font-weight:700;letter-spacing:-.5px;">Klickenya</span>
      </td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Reservation cancelled</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.6;">
          Hi ${guestName}, we need to cancel your reservation at <strong>${restaurantName}</strong>
          for ${partySize} on <strong>${formattedDate}</strong> at <strong>${formattedTime}</strong>.
          We're sorry for the inconvenience.
        </p>
        <p style="margin:0;font-size:14px;color:#666;">
          Please contact the restaurant directly to rebook.
        </p>
      </td></tr>
      <tr><td style="padding:20px 32px;background-color:#fafafa;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#999;text-align:center;">&copy; 2026 Klickenya &middot; klickenya.com</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/* ── Guest email sender (non-blocking — failure never fails the PATCH) ────── */

async function sendGuestEmail(opts: {
  guestEmail: string;
  newStatus: "approved" | "declined" | "cancelled";
  guestName: string;
  restaurantName: string;
  partySize: number;
  reservedFor: string;
  declineReason?: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const { guestEmail, newStatus, guestName, restaurantName, partySize, reservedFor, declineReason } = opts;
  const formattedDate = formatNairobiDate(reservedFor);
  const formattedTime = formatNairobiTime(reservedFor);

  let subject: string;
  let html: string;

  if (newStatus === "approved") {
    subject = `Reservation confirmed at ${restaurantName} — ${formattedDate}`;
    html = guestApproveHtml({ guestName, restaurantName, partySize, formattedDate, formattedTime });
  } else if (newStatus === "declined") {
    subject = `Reservation update — ${restaurantName}`;
    html = guestDeclineHtml({ guestName, restaurantName, partySize, formattedDate, formattedTime, declineReason: declineReason ?? "" });
  } else {
    subject = `Reservation cancelled — ${restaurantName}`;
    html = guestCancelHtml({ guestName, restaurantName, partySize, formattedDate, formattedTime });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "Klickenya Bookings <bookings@klickenya.com>",
    to: guestEmail,
    subject,
    html,
  });
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

    // ── Fetch menu name for WhatsApp template + email ──────────────────────
    const { data: menuData } = await adminClient
      .from("menus")
      .select("name")
      .eq("id", reservation.menu_id)
      .single();

    const restaurantName = menuData?.name ?? "the restaurant";

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
    const guestEmail = reservation.guest_email as string | null;
    if (
      guestEmail &&
      whatsAppTransitions.includes(newStatus as WhatsAppTransition)
    ) {
      void sendGuestEmail({
        guestEmail,
        newStatus: newStatus as "approved" | "declined" | "cancelled",
        guestName: reservation.guest_name,
        restaurantName,
        partySize: reservation.party_size,
        reservedFor: reservation.reserved_for,
        declineReason: newStatus === "declined" ? decline_reason : undefined,
      }).catch((err) => {
        console.error("[reservations PATCH] guest email error (non-fatal):", err);
      });
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      whatsapp_url,
      guest_email_sent: !!(guestEmail && whatsAppTransitions.includes(newStatus as WhatsAppTransition)),
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
