import { adminClient } from "@/lib/supabase/admin";
import type { BillOutput, BillRestaurantMeta } from "@/lib/pos/bill";
import { computeBill } from "@/lib/pos/bill";

/**
 * Shared helpers for reading/writing table_sessions.
 *
 * `recomputeSessionTotals` is the authoritative way to refresh the cached
 * subtotal_kes / total_kes on a session row. It re-aggregates orders +
 * order_items for the session and runs them through computeBill() — the
 * single source of truth for bill arithmetic — then writes the result back.
 * Cancelled orders are excluded.
 */

export interface SessionTotals {
  subtotal_kes: number;
  total_kes:    number;
}

/**
 * Re-aggregate cached totals for a single session via computeBill().
 * Called whenever an order is added / changed / removed against a session,
 * and when discount/service-charge/split fields change.
 */
export async function recomputeSessionTotals(sessionId: string): Promise<SessionTotals | null> {
  const { data: session } = await adminClient
    .from("table_sessions")
    .select("id, service_charge_pct, discount_pct, discount_amount_kes, split_count")
    .eq("id", sessionId)
    .single();
  if (!session) return null;

  const { data: orders } = await adminClient
    .from("orders")
    .select("id, status, created_at")
    .eq("table_session_id", sessionId);

  const liveOrders = (orders ?? []).filter((o) => o.status !== "cancelled");
  const liveOrderIds = liveOrders.map((o) => o.id);

  type ItemRow = {
    order_id:         string;
    item_name:        string;
    item_price:       number | string;
    quantity:         number;
    selected_options: unknown;
    allergy_notes:    string | null;
  };
  let items: ItemRow[] = [];
  if (liveOrderIds.length > 0) {
    const { data } = await adminClient
      .from("order_items")
      .select("order_id, item_name, item_price, quantity, selected_options, allergy_notes")
      .in("order_id", liveOrderIds)
      // Exclude voided lines from the bill aggregation. They stay in the
      // table for the audit trail; they just stop counting toward totals.
      .eq("is_voided", false);
    items = (data ?? []) as ItemRow[];
  }

  // Group items back under their orders so computeBill's option/notes
  // handling stays consistent with the receipt rendering.
  const itemsByOrder = new Map<string, ItemRow[]>();
  for (const it of items) {
    const arr = itemsByOrder.get(it.order_id) ?? [];
    arr.push(it);
    itemsByOrder.set(it.order_id, arr);
  }

  const bill = computeBill({
    orders: liveOrders.map((o) => ({
      created_at: o.created_at,
      items: (itemsByOrder.get(o.id) ?? []).map((it) => ({
        item_name:  it.item_name,
        item_price: Number(it.item_price ?? 0),
        quantity:   Number(it.quantity ?? 0),
        selected_options: normaliseOptions(it.selected_options),
        allergy_notes: it.allergy_notes,
      })),
    })),
    service_charge_pct:  Number(session.service_charge_pct ?? 0),
    discount_pct:        Number(session.discount_pct ?? 0),
    discount_amount_kes: Number(session.discount_amount_kes ?? 0),
    split_count:         Number(session.split_count ?? 1),
  });

  const totals: SessionTotals = {
    subtotal_kes: bill.subtotal,
    total_kes:    bill.grand_total,
  };

  await adminClient
    .from("table_sessions")
    .update(totals)
    .eq("id", sessionId);

  return totals;
}

/**
 * order_items.selected_options is jsonb. Two shapes are observed in the wild:
 *   1. Old POS V1 — array of { group, choice, price_add }
 *   2. Guest path — array of { name, price_modifier }
 * computeBill speaks shape #2; normalise here so the bill stays consistent
 * regardless of who placed the order.
 */
export function normaliseOptions(raw: unknown): { name: string; price_modifier: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((o) => {
    const r = o as Record<string, unknown>;
    const name = (r.name ?? r.choice ?? "") as string;
    const price = Number(r.price_modifier ?? r.price_add ?? 0);
    return { name: String(name), price_modifier: price };
  });
}

/**
 * Load a fully-resolved bill for a session: restaurant meta, table info,
 * the BillOutput from computeBill, plus payment metadata. Used by the
 * receipt API (JSON / PDF / HTML) and the email + WhatsApp share paths so
 * everything renders the same numbers.
 */
export interface FullBill {
  session_id:     string;
  restaurant:     BillRestaurantMeta & { name: string };
  table_number:   string;
  covers:         number;
  opened_at:      string;
  closed_at:      string | null;
  payment_method: string | null;
  mpesa_ref:      string | null;
  bill_notes:     string | null;
  opened_by_name: string | null;
  bill:           BillOutput;
}

export async function loadFullBillForSession(sessionId: string): Promise<FullBill | null> {
  const { data: full } = await adminClient
    .from("table_sessions")
    .select(`
      id, menu_id, status, covers, opened_at, closed_at,
      service_charge_pct, discount_pct, discount_amount_kes, split_count,
      bill_notes, payment_method, mpesa_ref, opened_by,
      restaurant_tables ( table_number )
    `)
    .eq("id", sessionId)
    .single();
  if (!full) return null;

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, name, display_name")
    .eq("id", full.menu_id)
    .single();

  let openedByName: string | null = null;
  if (full.opened_by) {
    const { data: s } = await adminClient
      .from("restaurant_staff")
      .select("name")
      .eq("id", full.opened_by)
      .maybeSingle();
    openedByName = s?.name ?? null;
  }

  const { data: orders } = await adminClient
    .from("orders")
    .select("id, status, created_at, waiter_id")
    .eq("table_session_id", sessionId)
    .order("created_at", { ascending: true });
  const liveOrders = (orders ?? []).filter((o) => o.status !== "cancelled");
  const orderIds = liveOrders.map((o) => o.id);

  type ItemRow = {
    order_id: string; item_name: string; item_price: number | string;
    quantity: number; selected_options: unknown; allergy_notes: string | null;
  };
  let items: ItemRow[] = [];
  if (orderIds.length > 0) {
    const { data } = await adminClient
      .from("order_items")
      .select("order_id, item_name, item_price, quantity, selected_options, allergy_notes")
      .in("order_id", orderIds)
      // Voided items don't appear on the receipt — they stay in the DB for
      // audit but the customer's bill drops them.
      .eq("is_voided", false);
    items = (data ?? []) as ItemRow[];
  }
  const itemsByOrder = new Map<string, ItemRow[]>();
  for (const it of items) {
    const arr = itemsByOrder.get(it.order_id) ?? [];
    arr.push(it);
    itemsByOrder.set(it.order_id, arr);
  }

  const bill = computeBill({
    orders: liveOrders.map((o) => ({
      created_at: o.created_at,
      items: (itemsByOrder.get(o.id) ?? []).map((it) => ({
        item_name:        it.item_name,
        item_price:       Number(it.item_price ?? 0),
        quantity:         Number(it.quantity ?? 0),
        selected_options: normaliseOptions(it.selected_options),
        allergy_notes:    it.allergy_notes,
      })),
    })),
    service_charge_pct:  Number(full.service_charge_pct ?? 0),
    discount_pct:        Number(full.discount_pct ?? 0),
    discount_amount_kes: Number(full.discount_amount_kes ?? 0),
    split_count:         Number(full.split_count ?? 1),
  });

  const tableJoin = Array.isArray(full.restaurant_tables)
    ? full.restaurant_tables[0]
    : full.restaurant_tables;

  return {
    session_id:     full.id,
    restaurant: {
      name: menu?.display_name || menu?.name || "Restaurant",
    },
    table_number:   tableJoin?.table_number ?? "—",
    covers:         full.covers,
    opened_at:      full.opened_at,
    closed_at:      full.closed_at,
    payment_method: full.payment_method,
    mpesa_ref:      full.mpesa_ref ?? null,
    bill_notes:     full.bill_notes ?? null,
    opened_by_name: openedByName,
    bill,
  };
}

export async function getMenuIdForSession(sessionId: string): Promise<string | null> {
  const { data } = await adminClient
    .from("table_sessions")
    .select("menu_id")
    .eq("id", sessionId)
    .single();
  return data?.menu_id ?? null;
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
