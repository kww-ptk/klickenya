import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
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
        "id, menu_id, status, guest_name, guest_phone, party_size, reserved_for",
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

    // ── Fetch menu name for WhatsApp template ──────────────────────────────
    const { data: menuData } = await adminClient
      .from("menus")
      .select("name")
      .eq("id", reservation.menu_id)
      .single();

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
          menuData?.name ?? "the restaurant",
        )
      : null;

    return NextResponse.json({
      success: true,
      status: newStatus,
      whatsapp_url,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
