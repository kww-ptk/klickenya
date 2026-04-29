import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getPosOrOwnerAuth } from "@/app/api/pos/_lib/auth";
import { recomputeSessionTotals } from "../_lib/sessions";

/* ── Types ───────────────────────────────────────────────────────────────────── */

type SessionStatus = "open" | "billed" | "paid" | "void";
type PaymentMethod = "cash" | "card" | "mpesa";

interface OrderItemRow {
  id: string;
  item_name: string;
  item_price: number | string;
  quantity: number;
  line_total: number | string | null;
  selected_options: unknown;
  allergy_notes: string | null;
}

interface OrderRow {
  id: string;
  status: string;
  created_at: string;
  table_session_id: string | null;
  customer_name: string | null;
  notes: string | null;
  total_kes: number | string | null;
  waiter_id: string | null;
  order_items: OrderItemRow[];
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

async function loadSessionForAuth(id: string) {
  const { data } = await adminClient
    .from("table_sessions")
    .select("id, menu_id, status, table_id, opened_by, service_charge_pct, discount_pct")
    .eq("id", id)
    .single();
  return data;
}

/* ── GET — full session detail with all orders + items ──────────────────────── */

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  const session = await loadSessionForAuth(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const auth = await getPosOrOwnerAuth(req, session.menu_id);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: full } = await adminClient
    .from("table_sessions")
    .select(`
      id, menu_id, table_id, status, covers,
      service_charge_pct, discount_pct,
      subtotal_kes, total_kes,
      payment_method, opened_by, notes,
      opened_at, billed_at, paid_at, closed_at, created_at,
      restaurant_tables ( id, table_number )
    `)
    .eq("id", id)
    .single();

  if (!full) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const { data: orders } = await adminClient
    .from("orders")
    .select(`
      id, status, created_at, table_session_id, customer_name, notes,
      total_kes, waiter_id,
      order_items (
        id, item_name, item_price, quantity, line_total,
        selected_options, allergy_notes
      )
    `)
    .eq("table_session_id", id)
    .order("created_at", { ascending: true });

  // Resolve waiter names if any.
  const waiterIds = Array.from(
    new Set(((orders ?? []) as OrderRow[]).map((o) => o.waiter_id).filter((x): x is string => !!x)),
  );
  const waiterMap = new Map<string, string>();
  if (waiterIds.length > 0) {
    const { data: waiters } = await adminClient
      .from("restaurant_staff")
      .select("id, name")
      .in("id", waiterIds);
    for (const w of waiters ?? []) waiterMap.set(w.id, w.name);
  }

  // Resolve opened_by name.
  let openedByName: string | null = null;
  if (full.opened_by) {
    const { data: s } = await adminClient
      .from("restaurant_staff")
      .select("name")
      .eq("id", full.opened_by)
      .maybeSingle();
    openedByName = s?.name ?? null;
  }

  const subtotal = Number(full.subtotal_kes ?? 0);
  const servicePct = Number(full.service_charge_pct ?? 0);
  const discountPct = Number(full.discount_pct ?? 0);
  const serviceAmt = Math.round(subtotal * (servicePct / 100) * 100) / 100;
  const discountAmt = Math.round(subtotal * (discountPct / 100) * 100) / 100;

  const tableJoin = Array.isArray(full.restaurant_tables)
    ? full.restaurant_tables[0]
    : full.restaurant_tables;

  return NextResponse.json({
    session: {
      id:                  full.id,
      menu_id:             full.menu_id,
      table_id:            full.table_id,
      table_number:        tableJoin?.table_number ?? null,
      status:              full.status,
      covers:              full.covers,
      service_charge_pct:  servicePct,
      discount_pct:        discountPct,
      service_charge_amount: serviceAmt,
      discount_amount:     discountAmt,
      subtotal_kes:        subtotal,
      total_kes:           Number(full.total_kes ?? 0),
      payment_method:      full.payment_method,
      opened_by:           full.opened_by,
      opened_by_name:      openedByName,
      notes:               full.notes,
      opened_at:           full.opened_at,
      billed_at:           full.billed_at,
      paid_at:             full.paid_at,
      closed_at:           full.closed_at,
      orders: ((orders ?? []) as OrderRow[]).map((o) => ({
        id:            o.id,
        status:        o.status,
        created_at:    o.created_at,
        customer_name: o.customer_name,
        notes:         o.notes,
        total_kes:     Number(o.total_kes ?? 0),
        waiter_id:     o.waiter_id,
        waiter_name:   o.waiter_id ? waiterMap.get(o.waiter_id) ?? null : null,
        source:        o.waiter_id ? "waiter" : "guest",
        items: (o.order_items ?? []).map((it) => ({
          id:               it.id,
          name:             it.item_name,
          item_price:       Number(it.item_price ?? 0),
          quantity:         it.quantity,
          line_total:       it.line_total == null ? null : Number(it.line_total),
          selected_options: it.selected_options ?? [],
          allergy_notes:    it.allergy_notes,
        })),
      })),
    },
  });
}

/* ── PATCH — status transitions + field updates ─────────────────────────────── */
//
// Allowed transitions:
//   open    -> billed   (no payment_method required)
//   billed  -> paid     (payment_method REQUIRED)
//   open    -> paid     (payment_method REQUIRED — quick cash flow)
//   open    -> void     (no payment_method)
//
// Plus: covers / service_charge_pct / discount_pct can be updated on OPEN
// sessions without a status change. Updating service or discount triggers a
// totals recompute.
//
// TODO V3: M-Pesa Daraja integration: on paid with method=mpesa, trigger STK
// push via Daraja API. Requires sandbox credentials + webhook receiver.

const VALID_PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "mpesa"];

interface PatchBody {
  status?:             SessionStatus;
  payment_method?:     PaymentMethod;
  covers?:             number;
  service_charge_pct?: number;
  discount_pct?:       number;
  notes?:              string | null;
}

function isValidTransition(from: SessionStatus, to: SessionStatus): boolean {
  if (from === to) return true;
  if (from === "open"   && to === "billed") return true;
  if (from === "open"   && to === "paid")   return true;
  if (from === "open"   && to === "void")   return true;
  if (from === "billed" && to === "paid")   return true;
  return false;
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  const session = await loadSessionForAuth(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const auth = await getPosOrOwnerAuth(req, session.menu_id);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  let needsTotalsRecompute = false;
  const currentStatus = session.status as SessionStatus;
  const now = new Date().toISOString();

  // ── Status transition ────────────────────────────────────────────────────
  if (body.status) {
    const target = body.status as SessionStatus;
    if (!["open", "billed", "paid", "void"].includes(target)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (!isValidTransition(currentStatus, target)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${target}` },
        { status: 400 },
      );
    }

    if (target === "billed" && currentStatus === "open") {
      updates.status = "billed";
      updates.billed_at = now;
      // Snapshot the latest totals into the cached columns at billing time.
      needsTotalsRecompute = true;
    } else if (target === "paid") {
      const pm = body.payment_method;
      if (!pm || !VALID_PAYMENT_METHODS.includes(pm)) {
        return NextResponse.json(
          { error: "payment_method required (cash | card | mpesa)" },
          { status: 400 },
        );
      }
      updates.status = "paid";
      updates.payment_method = pm;
      updates.paid_at = now;
      updates.closed_at = now;
      if (currentStatus === "open") {
        // Quick-cash path — also stamp billed_at so the lifecycle is well-formed.
        updates.billed_at = now;
        needsTotalsRecompute = true;
      }
    } else if (target === "void") {
      updates.status = "void";
      updates.closed_at = now;
    }
  }

  // ── Field updates valid only on OPEN sessions ────────────────────────────
  if (typeof body.covers === "number") {
    if (currentStatus !== "open" && updates.status !== "billed" && updates.status !== "paid") {
      return NextResponse.json(
        { error: "covers can only change while session is open" },
        { status: 400 },
      );
    }
    updates.covers = Math.max(1, Math.min(99, Math.round(body.covers)));
  }
  if (typeof body.service_charge_pct === "number") {
    if (currentStatus !== "open") {
      return NextResponse.json(
        { error: "service_charge_pct can only change while session is open" },
        { status: 400 },
      );
    }
    const v = body.service_charge_pct;
    if (v < 0 || v > 100) {
      return NextResponse.json({ error: "service_charge_pct must be 0–100" }, { status: 400 });
    }
    updates.service_charge_pct = Math.round(v * 100) / 100;
    needsTotalsRecompute = true;
  }
  if (typeof body.discount_pct === "number") {
    if (currentStatus !== "open") {
      return NextResponse.json(
        { error: "discount_pct can only change while session is open" },
        { status: 400 },
      );
    }
    const v = body.discount_pct;
    if (v < 0 || v > 100) {
      return NextResponse.json({ error: "discount_pct must be 0–100" }, { status: 400 });
    }
    updates.discount_pct = Math.round(v * 100) / 100;
    needsTotalsRecompute = true;
  }
  if (body.notes !== undefined) {
    updates.notes = body.notes ? String(body.notes).slice(0, 500) : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error: updateErr } = await adminClient
    .from("table_sessions")
    .update(updates)
    .eq("id", id);

  if (updateErr) {
    console.error("[menu/sessions PATCH] error:", updateErr);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }

  if (needsTotalsRecompute) {
    await recomputeSessionTotals(id);
  }

  // Return the updated row.
  const { data: updated } = await adminClient
    .from("table_sessions")
    .select(`
      id, status, covers, service_charge_pct, discount_pct,
      subtotal_kes, total_kes, payment_method,
      opened_at, billed_at, paid_at, closed_at
    `)
    .eq("id", id)
    .single();

  return NextResponse.json({ session: updated });
}
