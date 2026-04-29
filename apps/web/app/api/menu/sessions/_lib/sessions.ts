import { adminClient } from "@/lib/supabase/admin";

/**
 * Shared helpers for reading/writing table_sessions.
 *
 * `recomputeSessionTotals` is the authoritative way to refresh the cached
 * subtotal_kes / total_kes on a session row. It re-aggregates orders +
 * order_items for the session and writes the result back. Cancelled orders
 * are excluded.
 */

export interface SessionTotals {
  subtotal_kes: number;
  total_kes:    number;
}

/**
 * Re-aggregate cached totals for a single session.
 * Called whenever an order is added / changed / removed against a session,
 * and when service_charge_pct / discount_pct change.
 */
export async function recomputeSessionTotals(sessionId: string): Promise<SessionTotals | null> {
  const { data: session } = await adminClient
    .from("table_sessions")
    .select("id, service_charge_pct, discount_pct")
    .eq("id", sessionId)
    .single();
  if (!session) return null;

  // Sum line_total over non-cancelled orders for this session.
  const { data: orders } = await adminClient
    .from("orders")
    .select("id, status")
    .eq("table_session_id", sessionId);

  const liveOrderIds = (orders ?? [])
    .filter((o) => o.status !== "cancelled")
    .map((o) => o.id);

  let subtotal = 0;
  if (liveOrderIds.length > 0) {
    const { data: items } = await adminClient
      .from("order_items")
      .select("order_id, line_total, item_price, quantity")
      .in("order_id", liveOrderIds);

    for (const it of items ?? []) {
      // line_total may be null on legacy rows — fall back to price × qty.
      const lt =
        typeof it.line_total === "number"
          ? Number(it.line_total)
          : Number(it.item_price ?? 0) * Number(it.quantity ?? 0);
      subtotal += lt;
    }
  }

  const servicePct  = Number(session.service_charge_pct ?? 0);
  const discountPct = Number(session.discount_pct ?? 0);
  const serviceAmt  = subtotal * (servicePct / 100);
  const discountAmt = subtotal * (discountPct / 100);
  const total = Math.max(0, subtotal + serviceAmt - discountAmt);

  // Round to 2 decimals to keep numeric(12,2) clean.
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const totals: SessionTotals = {
    subtotal_kes: round2(subtotal),
    total_kes:    round2(total),
  };

  await adminClient
    .from("table_sessions")
    .update(totals)
    .eq("id", sessionId);

  return totals;
}

/**
 * Find the open session for a given table (or null).
 */
export async function findOpenSessionForTable(tableId: string) {
  const { data } = await adminClient
    .from("table_sessions")
    .select("id, menu_id, table_id, status, opened_at, covers")
    .eq("table_id", tableId)
    .eq("status", "open")
    .maybeSingle();
  return data;
}

/**
 * Open a new session for a table. Used both by the POS (staff-initiated) and
 * by the guest order auto-creation path. Caller must have already verified no
 * other open session exists for the table.
 */
export async function openSessionForTable(args: {
  menuId:           string;
  tableId:          string;
  covers?:          number;
  openedByStaffId?: string | null;
  serviceChargePct: number;
}): Promise<{ id: string } | null> {
  const { data, error } = await adminClient
    .from("table_sessions")
    .insert({
      menu_id:            args.menuId,
      table_id:           args.tableId,
      status:             "open",
      covers:             Math.max(1, args.covers ?? 1),
      opened_by:          args.openedByStaffId ?? null,
      service_charge_pct: args.serviceChargePct,
      discount_pct:       0,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[sessions] openSessionForTable error:", error);
    return null;
  }
  return data;
}
