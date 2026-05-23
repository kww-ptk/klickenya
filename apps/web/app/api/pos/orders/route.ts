import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { adminClient } from "@/lib/supabase/admin";
import { getPosStaffSession } from "@/app/api/pos/_lib/auth";
import { recomputeSessionTotals } from "@/app/api/menu/sessions/_lib/sessions";

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function sanitizeNotes(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const stripped = raw.replace(/<[^>]*>/g, "");
  const trimmed = stripped.trim().slice(0, 500);
  return trimmed || null;
}

/* ── Validation schema ──────────────────────────────────────────────────────── */
//
// Mirrors POST /api/orders item shape. The waiter UI sends option_ids only —
// the server resolves prices, group names, and option names from the DB so
// the client can never tamper with the snapshot.

const selectedOptionSchema = z.object({
  option_id: z.string().uuid(),
});

const bodySchema = z.object({
  session_id: z.string().uuid(),
  items: z
    .array(
      z.object({
        menu_item_id:     z.string().uuid(),
        quantity:         z.number().int().min(1).max(99),
        notes:            z.string().max(500).optional(),
        selected_options: z.array(selectedOptionSchema).max(30).optional().default([]),
      }),
    )
    .min(1)
    .max(50),
});

/* ── POST — submit a waiter-built order against an open session ─────────────── */
//
// Mirrors POST /api/orders insert logic so the kitchen dashboard treats waiter
// and guest orders identically. Differences:
//   - auth via the POS staff cookie (no Supabase Auth user)
//   - target session is provided directly (no auto-create)
//   - sets waiter_id from the cookie
//
// TODO V3: Add 'hold' mode — waiter builds order but doesn't send to kitchen
// until explicitly fired. Useful for course sequencing.

export async function POST(req: NextRequest) {
  try {
    /* STEP 0 — Staff auth */
    const staff = getPosStaffSession(req);
    if (!staff) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const data = bodySchema.parse(body);

    /* STEP 1 — Resolve session + menu + verify it belongs to this staff's menu */
    const { data: session } = await adminClient
      .from("table_sessions")
      .select("id, menu_id, status, table_id")
      .eq("id", data.session_id)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.menu_id !== staff.menu_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.status !== "open") {
      return NextResponse.json({ error: "Session is not open" }, { status: 400 });
    }

    /* STEP 2 — Verify staff is still active in DB */
    const { data: staffRow } = await adminClient
      .from("restaurant_staff")
      .select("id, is_active, menu_id")
      .eq("id", staff.staff_id)
      .single();
    if (!staffRow || !staffRow.is_active || staffRow.menu_id !== session.menu_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* STEP 3 — Fetch the table for table_number snapshot */
    const { data: tableRow } = await adminClient
      .from("restaurant_tables")
      .select("id, table_number, menu_id")
      .eq("id", session.table_id)
      .single();
    const tableDisplayNumber = tableRow?.table_number ?? null;

    /* STEP 4 — Fetch all items from DB (never trust client prices) */
    const itemIds = data.items.map((i) => i.menu_item_id);

    const { data: dbItems } = await adminClient
      .from("menu_items")
      .select("id, name, price_kes, is_available, menu_sections!inner(menu_id)")
      .in("id", itemIds)
      .eq("menu_sections.menu_id", session.menu_id);

    if (!dbItems || dbItems.length !== itemIds.length) {
      return NextResponse.json(
        { error: "One or more items do not belong to this menu." },
        { status: 400 },
      );
    }

    const itemMap = new Map(dbItems.map((i) => [i.id, i]));

    for (const orderItem of data.items) {
      const dbItem = itemMap.get(orderItem.menu_item_id);
      if (!dbItem) {
        return NextResponse.json(
          { error: "One or more items are no longer on the menu." },
          { status: 400 },
        );
      }
      if (!dbItem.is_available) {
        return NextResponse.json(
          { error: `"${dbItem.name}" is currently unavailable.` },
          { status: 400 },
        );
      }
    }

    /* STEP 5 — Fetch option data from DB (mirrors POST /api/orders STEP 4) */
    type DbOption = {
      name: string;
      price_modifier: number;
      group_id: string;
      group_name: string;
      group_is_required: boolean;
      menu_item_id: string;
    };

    const allOptionIds = data.items.flatMap((i) =>
      (i.selected_options ?? []).map((o) => o.option_id),
    );
    const dbOptionMap = new Map<string, DbOption>();

    if (allOptionIds.length > 0) {
      const { data: dbOptions } = await adminClient
        .from("item_options")
        .select(`
          id,
          name,
          price_modifier,
          is_available,
          item_option_groups!inner (
            id,
            name,
            menu_item_id,
            is_required
          )
        `)
        .in("id", allOptionIds);

      for (const opt of dbOptions ?? []) {
        const _grpRaw = Array.isArray(opt.item_option_groups)
          ? opt.item_option_groups[0]
          : opt.item_option_groups;
        const grp = _grpRaw as {
          id: string;
          name: string;
          menu_item_id: string;
          is_required: boolean;
        };
        dbOptionMap.set(opt.id, {
          name:              opt.name,
          price_modifier:    opt.price_modifier,
          group_id:          grp.id,
          group_name:        grp.name,
          group_is_required: grp.is_required,
          menu_item_id:      grp.menu_item_id,
        });
      }

      for (const orderItem of data.items) {
        for (const sel of orderItem.selected_options ?? []) {
          const dbOpt = dbOptionMap.get(sel.option_id);
          if (!dbOpt) {
            return NextResponse.json(
              { error: `Invalid option: ${sel.option_id}` },
              { status: 400 },
            );
          }
          if (dbOpt.menu_item_id !== orderItem.menu_item_id) {
            return NextResponse.json(
              { error: "Option does not belong to this item." },
              { status: 400 },
            );
          }
        }
      }
    }

    /* STEP 6 — Validate required option groups */
    const { data: requiredGroups } = await adminClient
      .from("item_option_groups")
      .select("id, name, menu_item_id")
      .in("menu_item_id", itemIds)
      .eq("is_required", true);

    if (requiredGroups && requiredGroups.length > 0) {
      for (const orderItem of data.items) {
        const coveredGroupIds = new Set(
          (orderItem.selected_options ?? [])
            .map((o) => dbOptionMap.get(o.option_id)?.group_id)
            .filter(Boolean) as string[],
        );
        const itemRequiredGroups = requiredGroups.filter(
          (g) => g.menu_item_id === orderItem.menu_item_id,
        );
        for (const req of itemRequiredGroups) {
          if (!coveredGroupIds.has(req.id)) {
            return NextResponse.json(
              { error: `Required option group '${req.name}' has no selection.` },
              { status: 400 },
            );
          }
        }
      }
    }

    /* STEP 7 — Build per-item snapshots + totals (DB-sourced) */
    const orderItemRows = data.items.map((orderItem) => {
      const dbItem = itemMap.get(orderItem.menu_item_id)!;
      const selectedOptions = (orderItem.selected_options ?? []).map((o) => {
        const dbOpt = dbOptionMap.get(o.option_id)!;
        return {
          group:     dbOpt.group_name,
          choice:    dbOpt.name,
          price_add: dbOpt.price_modifier,
        };
      });
      const optionTotal = selectedOptions.reduce((s, o) => s + o.price_add, 0);
      const lineTotal = (dbItem.price_kes + optionTotal) * orderItem.quantity;
      return {
        menu_item_id:     orderItem.menu_item_id,
        item_name:        dbItem.name,
        item_price:       dbItem.price_kes,
        quantity:         orderItem.quantity,
        selected_options: selectedOptions,
        // Per-item notes from the waiter end up in allergy_notes for now —
        // matches the column the kitchen dashboard already renders.
        allergy_notes:    sanitizeNotes(orderItem.notes),
        line_total:       lineTotal,
      };
    });

    const subtotal = orderItemRows.reduce((s, r) => s + r.line_total, 0);
    const total = subtotal;

    /* STEP 8 — Insert order. Same column shape as POST /api/orders so the
       kitchen dashboard query that powers StationDashboard.tsx returns waiter
       and guest orders identically. waiter_id is the only addition. */
    const { data: order, error: orderErr } = await adminClient
      .from("orders")
      .insert({
        menu_id:          session.menu_id,
        order_type:       "dine_in",
        status:           "new",
        table_number:     tableDisplayNumber,
        table_id:         session.table_id,
        table_session_id: session.id,
        waiter_id:        staff.staff_id,
        customer_name:    null,
        notes:            null,
        subtotal_kes:     subtotal,
        delivery_fee_kes: 0,
        total_kes:        total,
        payment_status:   "pending",
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      console.error("[pos/orders] insert error:", orderErr);
      return NextResponse.json({ error: "Failed to place order." }, { status: 500 });
    }

    /* STEP 9 — Insert order items */
    const { error: itemsErr } = await adminClient
      .from("order_items")
      .insert(orderItemRows.map((r) => ({ ...r, order_id: order.id })));

    if (itemsErr) {
      console.error("[pos/orders] order_items insert error:", itemsErr);
    }

    /* STEP 10 — Refresh cached session totals so the grid reflects the new
       order on the next 8s poll. Best-effort. */
    try {
      await recomputeSessionTotals(session.id);
    } catch (e) {
      console.error("[pos/orders] session totals recompute failed:", e);
    }

    return NextResponse.json({
      order_id:     order.id,
      items_count:  orderItemRows.reduce((s, r) => s + r.quantity, 0),
      total_amount: total,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid order data." }, { status: 400 });
    }
    console.error("[pos/orders] unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
