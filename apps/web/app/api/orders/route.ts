import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { adminClient } from "@/lib/supabase/admin";

/* ── Validation schema ──────────────────────────────── */

const selectedOptionSchema = z.object({
  group:     z.string().max(200),
  choice:    z.string().max(200),
  price_add: z.number().min(0),
});

const orderSchema = z.object({
  menu_id: z.string().uuid(),
  table_number: z.string().min(1).max(20),
  customer_name: z.string().max(100).optional(),
  items: z
    .array(
      z.object({
        menu_item_id:     z.string().uuid(),
        quantity:         z.number().int().min(1).max(99),
        selected_options: z.array(selectedOptionSchema).max(20).optional(),
        allergy_notes:    z.string().max(300).optional(),
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
    // Join through menu_sections to confirm every item belongs to this menu.
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

    /* STEP 4 — Compute per-item line totals from DB base prices + client option snapshots
       selected_options is a client-provided snapshot — price_add values are what
       the customer saw. We trust the base price from DB but accept the option
       price_add from client (options don't have a server-side price check yet;
       full option validation can be added in V2 when option IDs are submitted). */
    const subtotal = data.items.reduce((sum, orderItem) => {
      const dbItem = itemMap.get(orderItem.menu_item_id)!;
      const optionTotal = (orderItem.selected_options ?? []).reduce(
        (s, o) => s + (o.price_add ?? 0), 0
      );
      return sum + (dbItem.price_kes + optionTotal) * orderItem.quantity;
    }, 0);

    const total = subtotal; // delivery_fee_kes = 0 for dine_in V1

    /* STEP 5 — Insert order */
    const { data: order, error: orderErr } = await adminClient
      .from("orders")
      .insert({
        menu_id: data.menu_id,
        order_type: "dine_in",
        status: "new",
        table_number: data.table_number,
        customer_name: data.customer_name ?? null,
        subtotal_kes: subtotal,
        delivery_fee_kes: 0,
        total_kes: total,
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      console.error("[orders] insert error:", orderErr);
      return NextResponse.json({ error: "Failed to place order." }, { status: 500 });
    }

    /* STEP 6 — Insert order items as snapshots (with option snapshot + line_total) */
    const orderItemRows = data.items.map((orderItem) => {
      const dbItem = itemMap.get(orderItem.menu_item_id)!;
      const selectedOptions = orderItem.selected_options ?? [];
      const optionTotal = selectedOptions.reduce((s, o) => s + (o.price_add ?? 0), 0);
      const lineTotal = (dbItem.price_kes + optionTotal) * orderItem.quantity;

      return {
        order_id:         order.id,
        menu_item_id:     orderItem.menu_item_id,
        item_name:        dbItem.name,             // SNAPSHOT
        item_price:       dbItem.price_kes,        // SNAPSHOT
        quantity:         orderItem.quantity,
        selected_options: selectedOptions,         // SNAPSHOT
        allergy_notes:    orderItem.allergy_notes ?? null,
        line_total:       lineTotal,
      };
    });

    const { error: itemsErr } = await adminClient
      .from("order_items")
      .insert(orderItemRows);

    if (itemsErr) {
      console.error("[orders] order_items insert error:", itemsErr);
    }

    /* STEP 7 — Return confirmation */
    return NextResponse.json({
      order_id: order.id,
      short_id: order.id.slice(0, 8).toUpperCase(),
      status: "new",
      estimated_minutes: 20,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid order data." }, { status: 400 });
    }
    console.error("[orders] unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
