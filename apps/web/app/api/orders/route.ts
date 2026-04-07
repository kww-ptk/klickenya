import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { adminClient } from "@/lib/supabase/admin";

/* ── Helpers ────────────────────────────────────────── */

/** Strip HTML tags, trim, cap at 500 chars. Returns null if empty. */
function sanitizeNotes(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const stripped = raw.replace(/<[^>]*>/g, "");
  const trimmed = stripped.trim().slice(0, 500);
  return trimmed || null;
}

/* ── Validation schema ──────────────────────────────── */

// Client submits option IDs + display labels only — NO price_add.
// Server fetches option names and price_modifier from DB.
const selectedOptionSchema = z.object({
  option_id: z.string().uuid(),
  group:     z.string().max(200),  // label snapshot (overwritten by DB value on save)
  choice:    z.string().max(200),  // label snapshot (overwritten by DB value on save)
});

const orderSchema = z.object({
  menu_id:       z.string().uuid(),
  table_number:  z.string().min(1).max(20),
  table_id:      z.string().uuid().optional(), // registered table (optional)
  customer_name: z.string().max(100).optional(),
  items: z
    .array(
      z.object({
        menu_item_id:     z.string().uuid(),
        quantity:         z.number().int().min(1).max(99),
        selected_options: z.array(selectedOptionSchema).max(30).optional().default([]),
        allergy_notes:    z.string().max(500).optional(),
      })
    )
    .min(1)
    .max(50),
});

/* ── POST — submit a new dine-in order ──────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = orderSchema.parse(body);

    /* STEP 1 — Verify menu exists and table ordering is enabled */
    const { data: menu } = await adminClient
      .from("menus")
      .select("id, table_ordering, is_published")
      .eq("id", data.menu_id)
      .single();

    if (!menu) {
      return NextResponse.json({ error: "Menu not found." }, { status: 404 });
    }

    if (!menu.table_ordering) {
      return NextResponse.json(
        { error: "Table ordering is not enabled for this menu." },
        { status: 400 }
      );
    }

    /* STEP 2 — Fetch all submitted items from DB (never trust client prices) */
    const itemIds = data.items.map((i) => i.menu_item_id);

    const { data: dbItems } = await adminClient
      .from("menu_items")
      .select("id, name, price_kes, is_available, menu_sections!inner(menu_id)")
      .in("id", itemIds)
      .eq("menu_sections.menu_id", data.menu_id);

    if (!dbItems || dbItems.length === 0) {
      return NextResponse.json({ error: "No valid items found." }, { status: 400 });
    }

    if (dbItems.length !== itemIds.length) {
      return NextResponse.json(
        { error: "One or more items do not belong to this menu." },
        { status: 400 }
      );
    }

    const itemMap = new Map(dbItems.map((i) => [i.id, i]));

    /* STEP 3 — Validate every submitted item is available */
    for (const orderItem of data.items) {
      const dbItem = itemMap.get(orderItem.menu_item_id);
      if (!dbItem) {
        return NextResponse.json(
          { error: "One or more items are no longer on the menu." },
          { status: 400 }
        );
      }
      if (!dbItem.is_available) {
        return NextResponse.json(
          { error: `"${dbItem.name}" is currently unavailable.` },
          { status: 400 }
        );
      }
    }

    /* STEP 4 — Fetch option data from DB.
       For each submitted option_id: get name, price_modifier, and parent group
       details (group id, name, menu_item_id, is_required).
       This data is used for:
         a) cross-item validation (option belongs to correct menu_item)
         b) required-group validation
         c) building the snapshot (group name + choice name come from DB, not client) */
    const allOptionIds = data.items.flatMap((i) => i.selected_options.map((o) => o.option_id));

    type DbOption = {
      name: string;
      price_modifier: number;
      group_id: string;
      group_name: string;
      group_is_required: boolean;
      menu_item_id: string;
    };

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

      if (dbOptions) {
        for (const opt of dbOptions) {
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
      }

      // Validate every submitted option exists and belongs to the correct item
      for (const orderItem of data.items) {
        for (const sel of orderItem.selected_options) {
          const dbOpt = dbOptionMap.get(sel.option_id);
          if (!dbOpt) {
            return NextResponse.json(
              { error: `Invalid option: ${sel.option_id}` },
              { status: 400 }
            );
          }
          if (dbOpt.menu_item_id !== orderItem.menu_item_id) {
            return NextResponse.json(
              { error: "Option does not belong to this item." },
              { status: 400 }
            );
          }
        }
      }
    }

    /* STEP 5 — Validate required option groups are satisfied.
       Fetch all is_required groups for the submitted menu_item_ids in one query. */
    const { data: requiredGroups } = await adminClient
      .from("item_option_groups")
      .select("id, name, menu_item_id")
      .in("menu_item_id", itemIds)
      .eq("is_required", true);

    if (requiredGroups && requiredGroups.length > 0) {
      for (const orderItem of data.items) {
        // Build set of group_ids that this item's submission covers
        const coveredGroupIds = new Set(
          orderItem.selected_options
            .map((o) => dbOptionMap.get(o.option_id)?.group_id)
            .filter(Boolean) as string[]
        );

        const itemRequiredGroups = requiredGroups.filter(
          (g) => g.menu_item_id === orderItem.menu_item_id
        );
        for (const req of itemRequiredGroups) {
          if (!coveredGroupIds.has(req.id)) {
            return NextResponse.json(
              { error: `Required option group '${req.name}' has no selection.` },
              { status: 400 }
            );
          }
        }
      }
    }

    /* STEP 6 — Validate table_id if provided */
    let tableDisplayNumber = data.table_number;
    let resolvedTableId: string | null = null;

    if (data.table_id) {
      const { data: tableRow } = await adminClient
        .from("restaurant_tables")
        .select("id, table_number, menu_id, is_active")
        .eq("id", data.table_id)
        .single();

      if (!tableRow || tableRow.menu_id !== data.menu_id) {
        return NextResponse.json({ error: "Invalid table." }, { status: 400 });
      }
      if (!tableRow.is_active) {
        return NextResponse.json({ error: "Table is not active." }, { status: 400 });
      }

      tableDisplayNumber = tableRow.table_number;
      resolvedTableId = tableRow.id;
    }

    /* STEP 7 — Build per-item snapshots and compute totals using DB prices only */
    const orderItemRows = data.items.map((orderItem) => {
      const dbItem = itemMap.get(orderItem.menu_item_id)!;

      // Snapshot built entirely from DB values — client labels are discarded
      const selectedOptions = orderItem.selected_options.map((o) => {
        const dbOpt = dbOptionMap.get(o.option_id)!;
        return {
          group:     dbOpt.group_name,      // from DB
          choice:    dbOpt.name,            // from DB
          price_add: dbOpt.price_modifier,  // from DB
        };
      });

      const optionTotal = selectedOptions.reduce((s, o) => s + o.price_add, 0);
      const lineTotal = (dbItem.price_kes + optionTotal) * orderItem.quantity;

      return {
        menu_item_id:     orderItem.menu_item_id,
        item_name:        dbItem.name,       // SNAPSHOT
        item_price:       dbItem.price_kes,  // SNAPSHOT
        quantity:         orderItem.quantity,
        selected_options: selectedOptions,   // SNAPSHOT — all values from DB
        allergy_notes:    sanitizeNotes(orderItem.allergy_notes),
        line_total:       lineTotal,
      };
    });

    const subtotal = orderItemRows.reduce((s, r) => s + r.line_total, 0);
    const total = subtotal; // delivery_fee_kes = 0 for dine_in V1

    /* STEP 8 — Insert order */
    const { data: order, error: orderErr } = await adminClient
      .from("orders")
      .insert({
        menu_id:          data.menu_id,
        order_type:       "dine_in",
        status:           "new",
        table_number:     tableDisplayNumber,
        table_id:         resolvedTableId,
        customer_name:    data.customer_name ?? null,
        subtotal_kes:     subtotal,
        delivery_fee_kes: 0,
        total_kes:        total,
        payment_status:   "pending",
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      console.error("[orders] insert error:", orderErr);
      return NextResponse.json({ error: "Failed to place order." }, { status: 500 });
    }

    /* STEP 9 — Insert order items */
    const { error: itemsErr } = await adminClient
      .from("order_items")
      .insert(
        orderItemRows.map((r) => ({ ...r, order_id: order.id }))
      );

    if (itemsErr) {
      console.error("[orders] order_items insert error:", itemsErr);
    }

    /* STEP 10 — Return enriched confirmation */
    const line_items = orderItemRows.map((row) => {
      const opts = row.selected_options as Array<{ group: string; choice: string; price_add: number }>;
      const options_summary = opts
        .map((o) => `${o.group}: ${o.choice}`)
        .join(" · ");
      return {
        name:            row.item_name,
        options_summary: options_summary || null,
        line_total:      row.line_total,
        quantity:        row.quantity,
      };
    });

    return NextResponse.json({
      order_id:          order.id,
      short_id:          order.id.slice(0, 8).toUpperCase(),
      estimated_minutes: 20,
      table_number:      tableDisplayNumber,
      line_items,
      order_total:       total,
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid order data." }, { status: 400 });
    }
    console.error("[orders] unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
