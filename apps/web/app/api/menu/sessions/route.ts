import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getPosOrOwnerAuth } from "@/app/api/pos/_lib/auth";
import {
  findOpenSessionForTable,
  openSessionForTable,
} from "./_lib/sessions";

/* ── Types for the GET response ─────────────────────────────────────────────── */

type StatusFilter = "open" | "billed" | "paid" | "void" | "all";

interface SessionRowJoined {
  id: string;
  menu_id: string;
  table_id: string;
  status: "open" | "billed" | "paid" | "void";
  covers: number;
  service_charge_pct: number | string;
  discount_pct: number | string;
  subtotal_kes: number | string | null;
  total_kes: number | string | null;
  payment_method: string | null;
  opened_by: string | null;
  opened_at: string;
  billed_at: string | null;
  paid_at: string | null;
  closed_at: string | null;
  restaurant_tables: {
    id: string;
    table_number: string;
  } | { id: string; table_number: string }[] | null;
}

function unwrapJoin<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

/* ── GET — list sessions for a menu, with live aggregates ───────────────────── */

export async function GET(req: NextRequest) {
  const menuId = req.nextUrl.searchParams.get("menu_id");
  const statusParam = (req.nextUrl.searchParams.get("status") ?? "open") as StatusFilter;

  if (!menuId) {
    return NextResponse.json({ error: "menu_id required" }, { status: 400 });
  }

  const auth = await getPosOrOwnerAuth(req, menuId);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let q = adminClient
    .from("table_sessions")
    .select(`
      id, menu_id, table_id, status, covers,
      service_charge_pct, discount_pct,
      subtotal_kes, total_kes,
      payment_method, opened_by,
      opened_at, billed_at, paid_at, closed_at,
      restaurant_tables ( id, table_number )
    `)
    .eq("menu_id", menuId)
    .order("opened_at", { ascending: false });

  if (statusParam !== "all") {
    q = q.eq("status", statusParam);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[menu/sessions GET] error:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }

  // Attach live order/item counts (cheap — single query for all sessions).
  const sessionIds = (data ?? []).map((r) => r.id);
  let orderCounts = new Map<string, { order_count: number; item_count: number }>();
  if (sessionIds.length > 0) {
    const { data: orderRows } = await adminClient
      .from("orders")
      .select("id, table_session_id, status")
      .in("table_session_id", sessionIds);

    const liveOrderIds: string[] = [];
    const orderToSession = new Map<string, string>();
    for (const o of orderRows ?? []) {
      if (o.status === "cancelled") continue;
      if (!o.table_session_id) continue;
      liveOrderIds.push(o.id);
      orderToSession.set(o.id, o.table_session_id);
    }

    let itemRows: { order_id: string; quantity: number | null }[] = [];
    if (liveOrderIds.length > 0) {
      const { data } = await adminClient
        .from("order_items")
        .select("order_id, quantity")
        .in("order_id", liveOrderIds);
      itemRows = data ?? [];
    }

    orderCounts = new Map();
    for (const sid of sessionIds) {
      orderCounts.set(sid, { order_count: 0, item_count: 0 });
    }
    for (const id of liveOrderIds) {
      const sid = orderToSession.get(id);
      if (!sid) continue;
      const cur = orderCounts.get(sid);
      if (cur) cur.order_count += 1;
    }
    for (const it of itemRows) {
      const sid = orderToSession.get(it.order_id);
      if (!sid) continue;
      const cur = orderCounts.get(sid);
      if (cur) cur.item_count += Number(it.quantity ?? 0);
    }
  }

  // Fetch staff names for any opened_by ids, in a single query.
  const staffIds = Array.from(
    new Set((data ?? []).map((r) => r.opened_by).filter((v): v is string => !!v)),
  );
  const staffMap = new Map<string, { id: string; name: string; role: string }>();
  if (staffIds.length > 0) {
    const { data: staffRows } = await adminClient
      .from("restaurant_staff")
      .select("id, name, role")
      .in("id", staffIds);
    for (const s of staffRows ?? []) staffMap.set(s.id, s);
  }

  const now = Date.now();
  const sessions = (data as SessionRowJoined[] | null ?? []).map((row) => {
    const table = unwrapJoin(row.restaurant_tables);
    const staff = row.opened_by ? staffMap.get(row.opened_by) ?? null : null;
    const counts = orderCounts.get(row.id) ?? { order_count: 0, item_count: 0 };
    const openedAt = new Date(row.opened_at).getTime();
    const openMins = Math.max(0, Math.round((now - openedAt) / 60000));

    return {
      id:                  row.id,
      table_id:            row.table_id,
      table_number:        table?.table_number ?? null,
      status:              row.status,
      covers:              row.covers,
      service_charge_pct:  Number(row.service_charge_pct ?? 0),
      discount_pct:        Number(row.discount_pct ?? 0),
      subtotal_kes:        row.subtotal_kes == null ? 0 : Number(row.subtotal_kes),
      total_kes:           row.total_kes    == null ? 0 : Number(row.total_kes),
      payment_method:      row.payment_method,
      opened_at:           row.opened_at,
      billed_at:           row.billed_at,
      paid_at:             row.paid_at,
      closed_at:           row.closed_at,
      open_duration_minutes: openMins,
      order_count:         counts.order_count,
      item_count:          counts.item_count,
      opened_by_staff:     staff
        ? { id: staff.id, name: staff.name, role: staff.role }
        : null,
    };
  });

  return NextResponse.json({ sessions });
}

/* ── POST — open a session for a table ──────────────────────────────────────── */

export async function POST(req: NextRequest) {
  let body: { menu_id?: string; table_id?: string; covers?: number; waiter_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { menu_id, table_id, covers, waiter_id } = body;
  if (!menu_id || !table_id) {
    return NextResponse.json({ error: "menu_id and table_id required" }, { status: 400 });
  }

  const auth = await getPosOrOwnerAuth(req, menu_id);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the table belongs to this menu.
  const { data: table } = await adminClient
    .from("restaurant_tables")
    .select("id, menu_id, is_active")
    .eq("id", table_id)
    .single();
  if (!table || table.menu_id !== menu_id) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }
  if (!table.is_active) {
    return NextResponse.json({ error: "Table is not active" }, { status: 400 });
  }

  // Reject if there's already an open session for this table.
  const existing = await findOpenSessionForTable(table_id);
  if (existing) {
    return NextResponse.json(
      { error: "This table already has an open session", session_id: existing.id },
      { status: 409 },
    );
  }

  // Resolve service charge default from the menu.
  const { data: menu } = await adminClient
    .from("menus")
    .select("default_service_charge_pct")
    .eq("id", menu_id)
    .single();
  const servicePct = Number(menu?.default_service_charge_pct ?? 0);

  // opened_by — when staff calls this, pin to their staff_id; when the owner
  // calls it via the dashboard, pin to the explicit waiter_id (if supplied
  // and valid for this menu) or leave null.
  let openedByStaffId: string | null = null;
  if (auth.type === "staff") {
    openedByStaffId = auth.staffId;
  } else if (waiter_id) {
    const { data: w } = await adminClient
      .from("restaurant_staff")
      .select("id, menu_id, is_active")
      .eq("id", waiter_id)
      .maybeSingle();
    if (w && w.menu_id === menu_id && w.is_active) {
      openedByStaffId = w.id;
    }
  }

  const created = await openSessionForTable({
    menuId:           menu_id,
    tableId:          table_id,
    covers:           typeof covers === "number" ? covers : 1,
    openedByStaffId,
    serviceChargePct: servicePct,
  });
  if (!created) {
    return NextResponse.json({ error: "Failed to open session" }, { status: 500 });
  }

  // Re-read the row in the same shape GET returns so the client can render
  // immediately without a refetch.
  const { data: full } = await adminClient
    .from("table_sessions")
    .select(`
      id, menu_id, table_id, status, covers,
      service_charge_pct, discount_pct, subtotal_kes, total_kes,
      payment_method, opened_at, billed_at, paid_at, closed_at,
      restaurant_tables ( id, table_number )
    `)
    .eq("id", created.id)
    .single();

  return NextResponse.json({ session: full });
}
