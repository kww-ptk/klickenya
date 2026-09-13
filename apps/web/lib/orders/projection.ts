/**
 * The one PostgREST projection for reading orders into an owner-facing queue.
 *
 * CLAUDE.md asks for this: `orders` is read from four+ places and the
 * projection had been copy-pasted into each. That is the drift that has
 * already cost this codebase three production bugs — PostgREST answers a
 * missing column with a 400, our adminClient reads `data` as null, and the
 * UI quietly degrades to an empty state instead of failing loudly.
 *
 * `delivery_address` is the live example. It has existed on the table since
 * 043 as a dormant stub, but no display projection selected it, so the first
 * delivery order would have rendered with nowhere to deliver it to.
 *
 * Add a column here, not in the call sites.
 */
export const ORDER_QUEUE_SELECT = `
  id, status, order_type, table_number, customer_name, customer_phone,
  estimated_ready_at, notes, total_kes, created_at, waiter_id,
  delivery_address, delivery_fee_kes, delivery_lat, delivery_lng,
  rider_id, picked_up_at, delivered_at, cash_collected_kes,
  order_items (
    id, item_name, item_price, quantity, notes,
    selected_options, allergy_notes, line_total,
    station, station_status, is_voided
  )
`;

/** Statuses an owner is actively working: the kitchen-active set. */
export const ACTIVE_ORDER_STATUSES = ["new", "preparing", "ready"] as const;
