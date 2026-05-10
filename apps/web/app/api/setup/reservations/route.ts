/**
 * POST /api/setup/reservations — Step 2 of the setup wizard.
 *
 * Atomically: insert the time window(s) AND flip menus.reservations_enabled
 * to true (with reservations_decided_at = now() and the party-size / lead /
 * max-advance values supplied by the form). The whole thing happens inside
 * fn_setup_enable_reservations (migration 071), so a CHECK violation on any
 * window row aborts the flag flip too.
 *
 * Body shape:
 *   {
 *     menu_id:           uuid,
 *     max_party_size:    1..50,
 *     lead_time_hours:   0..168,
 *     max_advance_days:  1..365,
 *     windows: [
 *       { open_time: "HH:MM", close_time: "HH:MM",
 *         label?: string, weekdays?: int[0..6], capacity?: int,
 *         display_order?: int }, ...
 *     ]
 *   }
 *
 * Errors:
 *   400 { error: "no_active_windows" }   — windows array empty
 *   400 { error: "invalid_window" }      — close ≤ open, or RPC raises a
 *                                          CHECK violation (transaction
 *                                          rolled back; flag stays false)
 *   400 { error: "invalid_input" }       — bad scalar field
 *   401 / 403 / 500 — standard
 */

import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getMenuAuth, verifyMenuAccess } from "../../menu/_lib/auth";

type Window = {
  open_time: string;
  close_time: string;
  label?: string;
  weekdays?: number[];
  capacity?: number | null;
  display_order?: number;
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, isAdmin, supabase } = await getMenuAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      menu_id,
      max_party_size,
      lead_time_hours,
      max_advance_days,
      windows,
    } = body as {
      menu_id?: unknown;
      max_party_size?: unknown;
      lead_time_hours?: unknown;
      max_advance_days?: unknown;
      windows?: unknown;
    };

    // ── Scalar input validation ──────────────────────────────────────────
    if (typeof menu_id !== "string" || !menu_id) {
      return NextResponse.json({ error: "invalid_input", field: "menu_id" }, { status: 400 });
    }
    const partySize = Number(max_party_size);
    if (!Number.isInteger(partySize) || partySize < 1 || partySize > 50) {
      return NextResponse.json({ error: "invalid_input", field: "max_party_size" }, { status: 400 });
    }
    const leadHours = Number(lead_time_hours);
    if (!Number.isInteger(leadHours) || leadHours < 0 || leadHours > 168) {
      return NextResponse.json({ error: "invalid_input", field: "lead_time_hours" }, { status: 400 });
    }
    const maxAdvance = Number(max_advance_days);
    if (!Number.isInteger(maxAdvance) || maxAdvance < 1 || maxAdvance > 365) {
      return NextResponse.json({ error: "invalid_input", field: "max_advance_days" }, { status: 400 });
    }

    // ── Windows validation ───────────────────────────────────────────────
    if (!Array.isArray(windows) || windows.length === 0) {
      return NextResponse.json(
        { error: "no_active_windows", message: "At least one time window is required." },
        { status: 400 },
      );
    }

    for (const w of windows as Window[]) {
      if (
        typeof w?.open_time !== "string" ||
        typeof w?.close_time !== "string" ||
        !HHMM.test(w.open_time) ||
        !HHMM.test(w.close_time) ||
        timeToMinutes(w.open_time) >= timeToMinutes(w.close_time)
      ) {
        return NextResponse.json(
          { error: "invalid_window", message: "Each window needs valid open and close times with open < close." },
          { status: 400 },
        );
      }
    }

    // ── Ownership check ──────────────────────────────────────────────────
    const access = await verifyMenuAccess(supabase, menu_id, userId, isAdmin);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // ── Atomic write via RPC ────────────────────────────────────────────
    const { error } = await adminClient.rpc("fn_setup_enable_reservations", {
      p_menu_id: menu_id,
      p_max_party_size: partySize,
      p_lead_time_hours: leadHours,
      p_max_advance_days: maxAdvance,
      p_windows: windows,
    });

    if (error) {
      // RAISE EXCEPTION 'no_active_windows' (race) → 400
      if (error.message === "no_active_windows") {
        return NextResponse.json({ error: "no_active_windows" }, { status: 400 });
      }
      // CHECK constraint violation (e.g. open ≥ close at the row level) → 400
      // Postgres SQLSTATE 23514 is the check_violation code.
      if (error.code === "23514") {
        return NextResponse.json({ error: "invalid_window" }, { status: 400 });
      }
      console.error("[setup/reservations POST] RPC error:", error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[setup/reservations POST] unexpected:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
