import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { adminClient } from "@/lib/supabase/admin";
import { normalizeKenyanPhone } from "@/lib/orders/phone";
import { parseCoordinates, isPlausible } from "@/lib/orders/location";
import {
  splitOrderMoney,
  DEFAULT_COMMISSION_DELIVERY_BPS,
  DEFAULT_COMMISSION_PICKUP_BPS,
} from "@/lib/orders/money";
import {
  findOpenSessionForTable,
  openSessionForTable,
  recomputeSessionTotals,
} from "@/app/api/menu/sessions/_lib/sessions";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import {
  distinctIds,
  requiredGroupsToEnforce,
  availableOptionCounts,
} from "@/lib/orders/placement";
import { notifyRestaurantOfOrder } from "@/lib/orders/notifyRestaurant";
import { sanityFetch } from "@/lib/sanity/client";
import { isOpenNow } from "@/lib/listings/openingHours";

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
  menu_id:        z.string().uuid(),
  order_type:     z.enum(["dine_in", "takeaway", "delivery"]).default("dine_in"),
  table_number:   z.string().min(1).max(20).optional(),
  table_id:       z.string().uuid().optional(), // registered table (optional)
  customer_name:  z.string().max(100).optional(),
  customer_phone: z.string().max(30).optional(),
  order_note:     z.string().max(500).optional(),
  // Free text on purpose. Kenyan coastal addresses are landmarks and
  // directions ("Beyond Sunset Lab, blue gate"), not house numbers, and a
  // structured form would reject the way people actually give directions.
  // Geocoding can come later via the dormant delivery_lat/lng columns.
  delivery_address: z.string().max(300).optional(),
  // Sent when the guest taps "use my current location". Optional: a written
  // address is always acceptable on its own.
  delivery_lat: z.number().optional(),
  delivery_lng: z.number().optional(),
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

/* ── POST — submit a new guest order (dine-in or takeaway) ── */

export async function POST(req: NextRequest) {
  try {
    // Anonymous endpoint, public menu ids. Without a ceiling a script could
    // fill a kitchen's tablet and every rider's job list with junk in a
    // minute. Per connection here; per phone once the number is known.
    const ip = clientIp(req);
    if (!rateLimit(`orders:ip:${ip}`, { limit: 10, windowMs: 60_000 }).ok) {
      return NextResponse.json(
        { error: "Too many orders from this connection. Try again in a minute." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const data = orderSchema.parse(body);

    /* STEP 1 — Verify menu exists and the requested ordering mode is enabled */
    const { data: menu } = await adminClient
      .from("menus")
      .select(
        "id, name, listing_slug, table_ordering, takeaway_enabled, delivery_enabled, is_published, min_order_kes, default_service_charge_pct, delivery_fee_kes, commission_delivery_bps, commission_pickup_bps",
      )
      .eq("id", data.menu_id)
      .single();

    if (!menu || menu.is_published === false) {
      return NextResponse.json({ error: "Menu not found." }, { status: 404 });
    }
    const restaurantName = String(menu.name ?? "The restaurant").replace(/\s+menu\s*$/i, "").trim();

    let normalizedPhone: string | null = null;

    if (data.order_type === "delivery") {
      if (!menu.delivery_enabled) {
        return NextResponse.json(
          { error: "This kitchen isn't delivering yet." },
          { status: 400 }
        );
      }
      if (!data.customer_name?.trim()) {
        return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
      }
      normalizedPhone = normalizeKenyanPhone(data.customer_phone ?? "");
      if (!normalizedPhone) {
        return NextResponse.json(
          { error: "Enter a valid phone number (e.g. 0712 345 678 or +254712345678)." },
          { status: 400 }
        );
      }
      // A delivery with no address is not an order anyone can fulfil.
      if (!data.delivery_address?.trim()) {
        return NextResponse.json(
          { error: "Please say where the order should go." },
          { status: 400 }
        );
      }
    } else if (data.order_type === "takeaway") {
      if (!menu.takeaway_enabled) {
        return NextResponse.json(
          { error: "Takeaway ordering is not enabled for this menu." },
          { status: 400 }
        );
      }
      if (!data.customer_name?.trim()) {
        return NextResponse.json(
          { error: "Please enter your name." },
          { status: 400 }
        );
      }
      normalizedPhone = normalizeKenyanPhone(data.customer_phone ?? "");
      if (!normalizedPhone) {
        return NextResponse.json(
          { error: "Enter a valid phone number (e.g. 0712 345 678 or +254712345678)." },
          { status: 400 }
        );
      }
    } else {
      if (!menu.table_ordering) {
        return NextResponse.json(
          { error: "Table ordering is not enabled for this menu." },
          { status: 400 }
        );
      }
      if (!data.table_number) {
        return NextResponse.json(
          { error: "Please enter your table number." },
          { status: 400 }
        );
      }
    }

    if (
      normalizedPhone &&
      !rateLimit(`orders:phone:${normalizedPhone}`, { limit: 5, windowMs: 10 * 60_000 }).ok
    ) {
      return NextResponse.json(
        { error: "That phone number has placed several orders just now. Please wait a few minutes." },
        { status: 429 },
      );
    }

    /* STEP 1.5 — Opening hours. The app shows "Closed" on the card and lets
       the guest order anyway; the order then sits at 'new' all night on a
       phone nobody is watching. The listing's hours are the source of truth;
       unknown hours (null) never block an order. Read through the 60 s data
       cache so this costs one Sanity call a minute, not one per order. */
    if (data.order_type !== "dine_in" && menu.listing_slug) {
      try {
        const { data: listing } = await sanityFetch<{ openingHours?: string | null } | null>({
          query: `*[_type == "listing" && slug.current == $slug][0]{ openingHours }`,
          params: { slug: menu.listing_slug },
          tags: ["listings"],
        });
        if (isOpenNow(listing?.openingHours) === false) {
          return NextResponse.json(
            { error: `${restaurantName} is closed right now. Their hours: ${listing?.openingHours}` },
            { status: 400 },
          );
        }
      } catch (err) {
        console.warn("[orders] opening hours check skipped:", err);
      }
    }

    /* STEP 2 — Fetch all submitted items from DB (never trust client prices).
       Distinct ids: the same dish twice with different add-ons is two lines
       in the basket and one row from PostgREST. */
    const itemIds = distinctIds(data.items.map((i) => i.menu_item_id));

    const { data: dbItems } = await adminClient
      .from("menu_items")
      .select("id, name, price_kes, is_available, menu_sections!inner(menu_id, station)")
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
      is_available: boolean | null;
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
            is_available:      opt.is_available ?? null,
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
          // Availability was selected and never checked: an add-on switched
          // off at 6pm was still accepted from a basket built at 5pm.
          if (dbOpt.is_available === false) {
            return NextResponse.json(
              { error: `"${dbOpt.name}" is not available right now.` },
              { status: 400 }
            );
          }
        }
      }
    }

    /* STEP 5 — Validate required option groups are satisfied.
       Fetch all is_required groups for the submitted menu_item_ids in one query. */
    type RequiredGroupRow = {
      id: string;
      name: string;
      menu_item_id: string;
      item_options: { id: string; is_available: boolean | null }[] | null;
    };
    const { data: requiredGroupRows } = await adminClient
      .from("item_option_groups")
      .select("id, name, menu_item_id, item_options ( id, is_available )")
      .in("menu_item_id", itemIds)
      .eq("is_required", true);

    // A required group with no available option is hidden from the guest
    // (lib/eat/menus.ts drops it), so it cannot be answered and must not be
    // enforced — or every basket with that dish fails at checkout.
    const requiredRows = (requiredGroupRows ?? []) as unknown as RequiredGroupRow[];
    const requiredGroups = requiredGroupsToEnforce(
      requiredRows,
      availableOptionCounts(requiredRows),
    );

    if (requiredGroups.length > 0) {
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

    /* STEP 6 — Validate table_id if provided, otherwise try to resolve by
       table_number so we can attach to a session even when the QR predates
       table registration. Takeaway orders are tableless — skip entirely. */
    let tableDisplayNumber: string | null = data.table_number ?? null;
    let resolvedTableId: string | null = null;

    if (data.order_type === "takeaway" || data.order_type === "delivery") {
      // Tableless by definition. Explicit rather than relying on the client
      // omitting table_number: a stray value would otherwise attach the
      // order to a table session and land it on the floor plan.
      tableDisplayNumber = null;
    } else if (data.table_id) {
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
    } else if (data.table_number) {
      // Best-effort lookup by table_number; if the table isn't registered the
      // order still proceeds (resolvedTableId stays null) and no session is
      // attached — preserving V1 behaviour for restaurants without table rows.
      const { data: tableRow } = await adminClient
        .from("restaurant_tables")
        .select("id, table_number, menu_id, is_active")
        .eq("menu_id", data.menu_id)
        .eq("table_number", data.table_number)
        .eq("is_active", true)
        .maybeSingle();
      if (tableRow) {
        resolvedTableId = tableRow.id;
        tableDisplayNumber = tableRow.table_number;
      }
    }

    /* Resolve the delivery pin, if there is one to resolve. */
    let deliveryCoords: { lat: number; lng: number } | null = null;
    if (data.order_type === "delivery") {
      if (
        typeof data.delivery_lat === "number" &&
        typeof data.delivery_lng === "number" &&
        isPlausible(data.delivery_lat, data.delivery_lng)
      ) {
        deliveryCoords = { lat: data.delivery_lat, lng: data.delivery_lng };
      } else {
        deliveryCoords = parseCoordinates(data.delivery_address);
      }
    }

    /* STEP 7 — Build per-item snapshots and compute totals using DB prices only */
    const orderItemRows = data.items.map((orderItem) => {
      const dbItem = itemMap.get(orderItem.menu_item_id)!;

      // station is read from the joined menu_sections row; the client value
      // is ignored. PostgREST returns the join as either an array or single
      // object depending on cardinality; handle both shapes.
      const sectionRaw = (dbItem as unknown as { menu_sections: unknown }).menu_sections;
      const section = Array.isArray(sectionRaw) ? sectionRaw[0] : sectionRaw;
      const station: "kitchen" | "bar" =
        (section as { station?: string } | undefined)?.station === "bar" ? "bar" : "kitchen";

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
        station,                          // SNAPSHOT — server-derived
        station_status:   "new" as const, // explicit for clarity
      };
    });

    const subtotal = orderItemRows.reduce((s, r) => s + r.line_total, 0);

    if (
      data.order_type === "delivery" &&
      menu.min_order_kes != null &&
      subtotal < Number(menu.min_order_kes)
    ) {
      return NextResponse.json(
        { error: `Minimum order for delivery is KSh ${Number(menu.min_order_kes).toLocaleString()}.` },
        { status: 400 },
      );
    }

    // ── Split the money, and freeze it onto the order ──────────────────
    // A delivery order carries the restaurant's configured delivery fee; the
    // guest is charged food + fee, the rider is owed their share of the fee,
    // and Klickenya keeps a commission on the food plus the rest of the fee.
    const money = splitOrderMoney({
      subtotalKes: subtotal,
      deliveryFeeKes: Number(menu.delivery_fee_kes ?? 0),
      isDelivery: data.order_type === "delivery",
      commissionDeliveryBps: Number(
        menu.commission_delivery_bps ?? DEFAULT_COMMISSION_DELIVERY_BPS,
      ),
      commissionPickupBps: Number(
        menu.commission_pickup_bps ?? DEFAULT_COMMISSION_PICKUP_BPS,
      ),
    });
    const total = money.totalKes;

    /* STEP 7.5 — Attach to (or auto-create) a table session.
       Backward-compat bridge: every order with a registered table_id now lives
       under a table_session. Restaurants that don't use the POS still get
       sessions silently attached — invisible to them unless they look.
       If we couldn't resolve a registered table (resolvedTableId null), the
       order is left session-less.
       Takeaway orders (order_type='takeaway') are intentionally session-less. */
    let sessionId: string | null = null;
    if (resolvedTableId) {
      const existing = await findOpenSessionForTable(resolvedTableId);
      if (existing && existing.menu_id === data.menu_id) {
        sessionId = existing.id;
      } else {
        const created = await openSessionForTable({
          menuId:           data.menu_id,
          tableId:          resolvedTableId,
          covers:           1,
          openedByStaffId:  null, // guest-initiated
          serviceChargePct: Number(menu.default_service_charge_pct ?? 0),
        });
        sessionId = created?.id ?? null;
      }
    }

    /* STEP 8 — Insert order */
    const { data: order, error: orderErr } = await adminClient
      .from("orders")
      .insert({
        menu_id:          data.menu_id,
        order_type:       data.order_type,
        status:           "new",
        table_number:     tableDisplayNumber,
        table_id:         resolvedTableId,
        table_session_id: sessionId,
        customer_name:    data.customer_name ?? null,
        customer_phone:   normalizedPhone,
        notes:            sanitizeNotes(data.order_note),
        delivery_address: data.order_type === "delivery"
          ? sanitizeNotes(data.delivery_address)
          : null,
        // Prefer the device's own fix; otherwise try to read a pin out of
        // whatever was pasted. Either way the written address is kept — the
        // pin is a bonus for the rider, not a replacement for directions.
        delivery_lat: deliveryCoords?.lat ?? null,
        delivery_lng: deliveryCoords?.lng ?? null,
        // Handover code. Random, not derived from the id: a derived code
        // cannot be rotated, and working out the derivation once would let
        // someone collect any order.
        pickup_code:
          data.order_type === "delivery"
            ? String(Math.floor(1000 + Math.random() * 9000))
            : null,
        subtotal_kes:     subtotal,
        delivery_fee_kes: money.deliveryFeeKes,
        total_kes:        total,
        commission_bps:            money.commissionBps,
        commission_kes:            money.commissionKes,
        restaurant_payout_kes:     money.restaurantPayoutKes,
        rider_fee_kes:             money.riderFeeKes,
        platform_delivery_fee_kes: money.platformDeliveryFeeKes,
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
      // Never leave a ticket with a total and no lines. The two inserts are
      // not one transaction, so compensate: remove the order row and fail
      // the request rather than confirm an order the kitchen cannot read.
      await adminClient.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: "Could not save the order lines. Please try again." },
        { status: 500 },
      );
    }

    /* STEP 9.5 — Refresh cached session totals so the POS table grid sees
       this order on its next 8s poll. Best-effort: failure here doesn't
       break the order flow, the next session-side write will heal totals. */
    if (sessionId) {
      try {
        await recomputeSessionTotals(sessionId);
      } catch (e) {
        console.error("[orders] session totals recompute failed:", e);
      }
    }

    /* STEP 9.7 — Tell the restaurant. Until now nothing did: the only signal
       was the guest pressing Send inside WhatsApp, which is how orders sat at
       'new' for hours. Email is the channel every listing already has for
       reservations. Awaited (Vercel may stop the function after the response),
       but never allowed to fail the order. */
    if (data.order_type !== "dine_in") {
      try {
        await notifyRestaurantOfOrder({
          menuId: data.menu_id,
          orderId: order.id,
          shortId: order.id.slice(0, 8).toUpperCase(),
          orderType: data.order_type,
          customerName: data.customer_name ?? null,
          customerPhone: normalizedPhone,
          deliveryAddress: data.order_type === "delivery" ? sanitizeNotes(data.delivery_address) : null,
          note: sanitizeNotes(data.order_note),
          lines: orderItemRows.map((row) => ({
            name: row.item_name,
            quantity: row.quantity,
            lineTotal: row.line_total,
            options:
              row.selected_options.map((o) => `${o.group}: ${o.choice}`).join(" · ") || null,
          })),
          subtotalKes: money.subtotalKes,
          deliveryFeeKes: money.deliveryFeeKes,
          totalKes: money.totalKes,
        });
      } catch (err) {
        console.error("[orders] restaurant notification failed:", err);
      }
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
      order_type:        data.order_type,
      estimated_minutes: 20,
      table_number:      tableDisplayNumber,
      line_items,
      subtotal_kes:      money.subtotalKes,
      delivery_fee_kes:  money.deliveryFeeKes,
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
