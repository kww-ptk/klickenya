import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getPosOrOwnerAuth } from "@/app/api/pos/_lib/auth";
import { resolveManagerApproval, writeAuditLog } from "@/app/api/pos/_lib/managerOverride";
import { recomputeSessionTotals } from "../_lib/sessions";
import { computeBill } from "@/lib/pos/bill";

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
    .select("id, menu_id, status, table_id, opened_by, service_charge_pct, discount_pct, discount_amount_kes, split_count, subtotal_kes")
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
      service_charge_pct, discount_pct, discount_amount_kes,
      split_count, bill_notes,
      subtotal_kes, total_kes,
      payment_method, mpesa_ref, opened_by, notes,
      receipt_sent_at, receipt_sent_to,
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

  // Look up the menu's manager-discount threshold so the bill panel can
  // tell the waiter "above 10% needs a manager" up front.
  const { data: menuRow } = await adminClient
    .from("menus")
    .select("manager_discount_threshold_pct")
    .eq("id", full.menu_id)
    .single();
  const managerDiscountThresholdPct = Number(menuRow?.manager_discount_threshold_pct ?? 10);

  // TODO V3: auto-populate guest_email when check-in flow spawns the session
  // from a reservation. For now, look up reservations linked to this session
  // defensively — if a reservation has session_id = this id, surface its
  // guest_email so the bill panel can pre-fill the "Email bill" field.
  let linkedGuestEmail: string | null = null;
  {
    const { data: linked } = await adminClient
      .from("reservations")
      .select("guest_email")
      .eq("session_id", id)
      .not("guest_email", "is", null)
      .limit(1)
      .maybeSingle();
    linkedGuestEmail = linked?.guest_email ?? null;
  }

  const subtotal = Number(full.subtotal_kes ?? 0);
  const servicePct = Number(full.service_charge_pct ?? 0);
  const discountPct = Number(full.discount_pct ?? 0);
  const discountFlat = Number(full.discount_amount_kes ?? 0);
  const splitCount = Math.max(1, Number(full.split_count ?? 1));
  const discountPctAmount = Math.round(subtotal * (discountPct / 100) * 100) / 100;
  const totalDiscount = Math.round((discountPctAmount + discountFlat) * 100) / 100;
  const afterDiscount = Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100);
  const serviceAmt = Math.round(afterDiscount * (servicePct / 100) * 100) / 100;

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
      discount_amount_kes: discountFlat,
      service_charge_amount: serviceAmt,
      discount_amount:     discountPctAmount,
      total_discount:      totalDiscount,
      after_discount:      afterDiscount,
      split_count:         splitCount,
      bill_notes:          full.bill_notes ?? null,
      per_person:          Math.ceil(Number(full.total_kes ?? 0) / splitCount),
      subtotal_kes:        subtotal,
      total_kes:           Number(full.total_kes ?? 0),
      payment_method:      full.payment_method,
      mpesa_ref:           full.mpesa_ref ?? null,
      opened_by:           full.opened_by,
      opened_by_name:      openedByName,
      notes:               full.notes,
      receipt_sent_at:     full.receipt_sent_at ?? null,
      receipt_sent_to:     full.receipt_sent_to ?? null,
      linked_guest_email:  linkedGuestEmail,
      manager_discount_threshold_pct: managerDiscountThresholdPct,
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
  status?:              SessionStatus;
  payment_method?:      PaymentMethod;
  mpesa_ref?:           string | null;
  covers?:              number;
  service_charge_pct?:  number;
  discount_pct?:        number;
  discount_amount_kes?: number;
  bill_notes?:          string | null;
  split_count?:         number;
  notes?:               string | null;
  /**
   * Manager override PIN. Required when the requested change crosses a
   * manager-only threshold (large discount, void on a billed/paid session).
   * Ignored if the acting staff is a manager already.
   */
  manager_override_pin?: string | null;
  /**
   * Free-form reason logged alongside the override. Required for void on
   * billed/paid sessions; optional for discount overrides.
   */
  reason?:               string | null;
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

  // ── Audit-log accumulator ────────────────────────────────────────────────
  // Restricted actions (void after billed/paid, discount above threshold)
  // queue up audit entries here. Once the row is updated successfully we
  // flush them in one go — keeps the action atomic from the waiter's view
  // even if the audit insert later fails (write failure is logged, not
  // surfaced).
  const auditQueue: Parameters<typeof writeAuditLog>[0][] = [];

  // The role of the *acting* request — owner or one of the staff roles.
  // resolveManagerApproval() understands this shape.
  const actingRole = auth.type === "owner" ? "owner" : auth.role;
  const actingStaffId = auth.type === "staff" ? auth.staffId : null;

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
      if (pm === "mpesa" && body.mpesa_ref) {
        updates.mpesa_ref = String(body.mpesa_ref).trim().slice(0, 64);
      }
      if (currentStatus === "open") {
        // Quick-cash path — also stamp billed_at so the lifecycle is well-formed.
        updates.billed_at = now;
        needsTotalsRecompute = true;
      }
    } else if (target === "void") {
      // Voiding a session that's already billed or paid is a manager-only
      // action — it removes a real payable from the day's total. (Voiding
      // an "open" session is fine — it never reached the kitchen as a bill,
      // so the surface area for theft is just the items already sent, which
      // are gated separately on the order-cancel path.)
      if (currentStatus === "billed" || currentStatus === "paid") {
        const reason = (body.reason ?? "").trim();
        if (!reason) {
          return NextResponse.json(
            { error: "Reason required to void a billed or paid session" },
            { status: 400 },
          );
        }
        const approval = await resolveManagerApproval({
          actingRole,
          actingStaffId,
          menuId:      session.menu_id,
          overridePin: body.manager_override_pin,
        });
        if (!approval.ok) {
          return NextResponse.json({ error: approval.error }, { status: 403 });
        }
        auditQueue.push({
          menuId:           session.menu_id,
          actingStaffId,
          approvingStaffId: approval.approvingStaffId,
          action:           "void_session",
          targetType:       "session",
          targetId:         id,
          reason,
          metadata: {
            previous_status: currentStatus,
            payment_method:  session.status === "paid" ? null : null,
          },
        });
      }
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
  // Bill controls (discount_pct, discount_amount_kes, bill_notes, split_count)
  // are editable on open AND billed sessions — the waiter often tweaks the
  // discount after pressing "Mark as billed" but before payment lands.
  const billEditable = currentStatus === "open" || currentStatus === "billed";

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
    if (!billEditable) {
      return NextResponse.json(
        { error: "discount_pct can only change while session is open or billed" },
        { status: 400 },
      );
    }
    const v = body.discount_pct;
    if (v < 0 || v > 100) {
      return NextResponse.json({ error: "discount_pct must be 0–100" }, { status: 400 });
    }

    // Discounts above the menu's manager threshold need a manager approval.
    // We only check on the *raise* — a waiter lowering an existing high
    // discount back down to a normal value shouldn't be blocked.
    const previousDiscount = Number(session.discount_pct ?? 0);
    if (v > previousDiscount + 0.01) {
      const { data: menuRow } = await adminClient
        .from("menus")
        .select("manager_discount_threshold_pct")
        .eq("id", session.menu_id)
        .single();
      const threshold = Number(menuRow?.manager_discount_threshold_pct ?? 10);
      if (v > threshold + 0.01) {
        const approval = await resolveManagerApproval({
          actingRole,
          actingStaffId,
          menuId:      session.menu_id,
          overridePin: body.manager_override_pin,
        });
        if (!approval.ok) {
          return NextResponse.json(
            { error: approval.error, requires_manager: true, threshold },
            { status: 403 },
          );
        }
        auditQueue.push({
          menuId:           session.menu_id,
          actingStaffId,
          approvingStaffId: approval.approvingStaffId,
          action:           "discount_above_threshold",
          targetType:       "session",
          targetId:         id,
          reason:           (body.reason ?? "").trim() || null,
          metadata: {
            discount_pct: v,
            threshold,
          },
        });
      }
    }

    updates.discount_pct = Math.round(v * 100) / 100;
    needsTotalsRecompute = true;
  }
  if (typeof body.discount_amount_kes === "number") {
    if (!billEditable) {
      return NextResponse.json(
        { error: "discount_amount_kes can only change while session is open or billed" },
        { status: 400 },
      );
    }
    const v = body.discount_amount_kes;
    if (!isFinite(v) || v < 0) {
      return NextResponse.json({ error: "discount_amount_kes must be ≥ 0" }, { status: 400 });
    }
    updates.discount_amount_kes = Math.round(v * 100) / 100;
    needsTotalsRecompute = true;
  }
  if (body.bill_notes !== undefined) {
    if (!billEditable) {
      return NextResponse.json(
        { error: "bill_notes can only change while session is open or billed" },
        { status: 400 },
      );
    }
    updates.bill_notes = body.bill_notes ? String(body.bill_notes).slice(0, 500) : null;
  }
  if (typeof body.split_count === "number") {
    if (!billEditable) {
      return NextResponse.json(
        { error: "split_count can only change while session is open or billed" },
        { status: 400 },
      );
    }
    const v = Math.round(body.split_count);
    if (v < 1 || v > 20) {
      return NextResponse.json({ error: "split_count must be 1–20" }, { status: 400 });
    }
    updates.split_count = v;
  }
  if (body.notes !== undefined) {
    updates.notes = body.notes ? String(body.notes).slice(0, 500) : null;
  }

  // Combined discount sanity check: percentage + flat amount can't exceed
  // the live subtotal. We do this before persisting so the waiter sees a
  // 400 immediately rather than a silent zero total.
  const willHaveDiscountPct  = typeof updates.discount_pct === "number" ? Number(updates.discount_pct) : Number(session.discount_pct ?? 0);
  const willHaveDiscountFlat = typeof updates.discount_amount_kes === "number" ? Number(updates.discount_amount_kes) : Number(session.discount_amount_kes ?? 0);
  const subtotal = Number(session.subtotal_kes ?? 0);
  if (subtotal > 0) {
    const pctAmount = subtotal * (willHaveDiscountPct / 100);
    if (pctAmount + willHaveDiscountFlat > subtotal + 0.01) {
      return NextResponse.json(
        { error: "Combined discount cannot exceed the subtotal" },
        { status: 400 },
      );
    }
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

  // Flush the audit queue. Best-effort — writeAuditLog logs and swallows
  // any failure so a hiccup in the audit table doesn't break the bill flow.
  await Promise.all(auditQueue.map((entry) => writeAuditLog(entry)));

  // Return the updated row plus a fresh computeBill() snapshot so the client
  // can mirror the server's totals without a follow-up GET.
  const { data: updated } = await adminClient
    .from("table_sessions")
    .select(`
      id, status, covers, service_charge_pct, discount_pct,
      discount_amount_kes, split_count, bill_notes,
      subtotal_kes, total_kes, payment_method, mpesa_ref,
      opened_at, billed_at, paid_at, closed_at
    `)
    .eq("id", id)
    .single();

  return NextResponse.json({ session: updated, bill: await buildBillForSession(id) });
}

async function buildBillForSession(sessionId: string) {
  const { data: s } = await adminClient
    .from("table_sessions")
    .select("service_charge_pct, discount_pct, discount_amount_kes, split_count")
    .eq("id", sessionId)
    .single();
  if (!s) return null;

  const { data: orders } = await adminClient
    .from("orders")
    .select("id, status, created_at")
    .eq("table_session_id", sessionId);
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
      .in("order_id", orderIds);
    items = (data ?? []) as ItemRow[];
  }
  const itemsByOrder = new Map<string, ItemRow[]>();
  for (const it of items) {
    const arr = itemsByOrder.get(it.order_id) ?? [];
    arr.push(it);
    itemsByOrder.set(it.order_id, arr);
  }
  return computeBill({
    orders: liveOrders.map((o) => ({
      created_at: o.created_at,
      items: (itemsByOrder.get(o.id) ?? []).map((it) => ({
        item_name:  it.item_name,
        item_price: Number(it.item_price ?? 0),
        quantity:   Number(it.quantity ?? 0),
        selected_options: Array.isArray(it.selected_options)
          ? (it.selected_options as Array<Record<string, unknown>>).map((o) => ({
              name:           String(o.name ?? o.choice ?? ""),
              price_modifier: Number(o.price_modifier ?? o.price_add ?? 0),
            }))
          : [],
        allergy_notes: it.allergy_notes,
      })),
    })),
    service_charge_pct:  Number(s.service_charge_pct ?? 0),
    discount_pct:        Number(s.discount_pct ?? 0),
    discount_amount_kes: Number(s.discount_amount_kes ?? 0),
    split_count:         Number(s.split_count ?? 1),
  });
}
