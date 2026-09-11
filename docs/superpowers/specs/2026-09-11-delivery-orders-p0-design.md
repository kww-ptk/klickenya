# Delivery Orders (P0) — Design Spec

Date: 2026-09-11 · Branch: `feat/delivery-orders` · Migration: **085**
Programme: `docs/food-delivery-program-plan.md` — this is **P0 of Phase A**.

## What we're building

Guests order for **delivery** from the public menu (`/m/[slug]`). The restaurant accepts
with a ready time, prepares, then marks the order **out for delivery** and finally
**delivered**. Delivery areas are **named zones with a flat fee each** — no coordinates, no
map, no geocoding. The restaurant dispatches its own rider; Klickenya has no fleet in P0.

This is takeaway plus an address, a fee, and one extra status. It reuses the takeaway flow
end to end (`docs/superpowers/specs/2026-07-20-takeaway-ordering-design.md`) and activates
the `order_type = 'delivery'` path that migration `043` has allowed since day one.

## Decisions made (with the user)

1. **Zones, not radius.** Restaurant defines named zones with a per-zone fee. Guest picks a
   zone and types landmark directions. Right model for Watamu and Kilifi, where people
   navigate by landmark, not street address.
2. **Pins deferred to P5**, when riders need turn-by-turn navigation. `delivery_lat` /
   `delivery_lng` stay dormant.
3. **Restaurant's own rider.** No Klickenya riders, no dispatch, no tracking in P0.
4. **Payment stays at handover** (cash or whatever the restaurant already does). Prepayment
   is P1 — deliberately not bundled, so P0 can ship alone.
5. **One new status:** `out_for_delivery`, between `ready` and `delivered`.
6. Consumer surface at `klickenya.com/eat` is **P2**. P0 ships on the existing `/m/[slug]`
   menu page only.

## Schema — migration `085_delivery_orders.sql`

### New table: `delivery_zones`

`menus.delivery_fee_kes` is a single scalar and cannot express per-zone pricing, so zones
need their own table.

```sql
create table delivery_zones (
  id          uuid primary key default gen_random_uuid(),
  menu_id     uuid not null references menus(id) on delete cascade,
  name        text not null,                    -- "Watamu town", "Jacaranda", "Turtle Bay"
  fee_kes     numeric not null default 0 check (fee_kes >= 0),
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index idx_delivery_zones_menu on delivery_zones(menu_id, is_active, sort_order);
```

RLS: mirror the `restaurant_tables` policies exactly — owner-write via the business
relationship, public read restricted to zones of a published menu.

### Orders

```sql
alter table orders add column if not exists delivery_zone_id uuid references delivery_zones(id);
alter table orders drop constraint orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('new','preparing','ready','out_for_delivery','delivered','cancelled'));
```

`delivery_address` (landmark text), `delivery_fee_kes` (snapshotted at order time, never
read back through the zone) and `order_type = 'delivery'` all already exist from `043`.

### Dormant columns — do not wire

`menus.delivery_radius_km` and `menus.delivery_fee_kes` (`028`) stay unused. Zones supersede
them. Leave a comment in `085` saying so, or a future reader will assume they are live.

## The trigger audit — the actual risk in P0

Adding a status to a table that three migrations branch on is where this spec earns its
keep. Findings, all verified against the migration source:

| Site | Current behaviour | Action |
|---|---|---|
| `062` stock deduct on `preparing` | Fires on `new → preparing`. `out_for_delivery` is downstream and does not re-trigger. | **No change.** Verify with a test. |
| `062` reverse on `cancelled` | Reverses whatever was deducted. | **No change.** Add a test cancelling *from* `out_for_delivery`. |
| `063` deduct on `delivered` (when `menus.stock_deduct_on='delivered'`) | Guard is `if NEW.status <> 'delivered' or OLD.status = 'delivered' then return`. On `out_for_delivery → delivered`: NEW is `delivered`, OLD is not — fires correctly. | **No change.** Test explicitly. |
| **`063:333` `mv_dish_margin_30d`** | `where o.status in ('preparing','ready','delivered')` — an order sitting in `out_for_delivery` **silently disappears from dish-margin reports**. | **Must add `'out_for_delivery'`** and refresh the materialized view. |
| `menus.stock_deduct_on` CHECK (`062:65`) | `('placed','preparing','ready','paid','delivered')` | **No change** — `out_for_delivery` is not a sensible deduction point. |

Any other `status in (...)` filter added between this spec and implementation must be
re-swept. The grep is `grep -rn "status in ('" supabase/migrations`.

## Column drift — mandatory sweep (CLAUDE.md rule)

12 `.from("orders")` call sites and 7 `.from("order_items")`. Add the new columns to every
projection that renders delivery state:

- `GET /api/menu/orders` (kitchen list) → `delivery_zone_id, delivery_address, delivery_fee_kes`
- `GET /api/orders/[id]` (guest status) → same, plus zone name via join
- `menus` projections need `delivery_enabled`: `/m/[slug]/page.tsx`, `/api/menu/settings`
  GET **and** PATCH, and the command-center feature context. Note `features.config.ts`
  already **declares** `delivery_enabled` on its `ctx.menu` type — the type is ahead of the
  fetches, which is exactly how the `ordering_enabled` bug in `028`/`072` happened.

## API changes

### `POST /api/orders`
- `order_type` enum: `["dine_in","takeaway","delivery"]`.
- Delivery validation: `menus.delivery_enabled` true; `customer_name` and `customer_phone`
  required (reuse `normalizeKenyanPhone`); `delivery_zone_id` required and must belong to
  this menu and be `is_active`; `delivery_address` required (landmark directions, max 500).
- Snapshot `delivery_fee_kes` from the zone at insert. Never recompute from the zone later —
  zones get re-priced and historic orders must not move.
- Order total includes the fee. Service charge applies to the food subtotal only, not the
  delivery fee.
- Table resolution and session attach are skipped, same as takeaway.

### `GET /api/orders/[id]` (public guest status)
- Currently 404s anything that is not takeaway. **Widen to `takeaway | delivery`.**
- Returns the zone name, landmark address, fee, and the new status.

### `PATCH /api/menu/orders` (owner/kitchen)
- `ready → out_for_delivery`, and `out_for_delivery → delivered`.
- Accept/decline semantics identical to takeaway.
- Reject `out_for_delivery` on non-delivery orders.

### `/api/menu/delivery-zones` (new, owner CRUD)
GET/POST/PATCH/DELETE, auth via the existing `verifyMenuAccess()`. Soft-delete via
`is_active` so historic orders keep a resolvable zone name.

### `PATCH /api/menu/settings`
Allow `delivery_enabled`. Guard: refuse to enable it when the menu has no active zone —
otherwise the guest hits a delivery option with an empty zone picker.

## Guest UI

**Cart (`components/menu/MenuWithCart.tsx`)** — the order-type picker gains a third option,
**Delivery**, shown only when `delivery_enabled` and at least one active zone exists.
Delivery mode shows: zone select (name + fee), landmark/directions textarea, name, phone.
Totals gain a **Delivery** line. All inputs min 16px (iOS zoom rule).

**Status page (`/m/[slug]/order/[orderId]`)** — add the new state:

- `out_for_delivery` → "On the way — arriving around {estimated_ready_at}"
- `delivered` → "Delivered — enjoy" (terminal)

Existing takeaway copy unchanged. Times via `Intl` with `Africa/Nairobi`.

## Kitchen / owner UI

`StationDashboard` and the shared order card:

- **DELIVERY** chip, visually distinct from takeaway's amber.
- Card shows zone name, landmark text, customer name, phone as a `tel:` link and a `wa.me`
  link pre-filled with the order short id.
- `ready` delivery card gains **Out for delivery**; `out_for_delivery` card gains
  **Delivered**.
- Dine-in and takeaway cards unchanged.
- Both the dashboard orders tab and `/kitchen/[slug]` inherit this for free — shared component.

**Settings:** a "Food delivery" toggle plus a zone editor (name, fee, active) in the orders
settings surface, following the `TableOrderingClient` pattern.

## Feature registry

`features.config.ts` delivery entry:
- `getStatus` → `ctx.menu?.delivery_enabled ? 'active' : 'inactive'`
- **Replace the `longDescription`**, which currently reads "Coming Q4 2026. Full delivery
  with live rider tracking." That promise expires in three weeks and P0 does not include
  rider tracking. New copy describes what P0 actually does: zones, fees, restaurant's own
  rider.
- Shares the existing `orders` tab — no new tab, no change to the 5-item nav rule.

## Edge cases

- **Zone deleted with live orders** — soft-delete only; the order keeps `delivery_zone_id`
  and the name still resolves.
- **Zone re-priced mid-order** — fee is snapshotted at insert; historic orders never move.
- **Delivery disabled with orders in flight** — existing orders stay fully actionable in the
  kitchen; only new guest submissions are blocked, server-side at POST. Same rule takeaway uses.
- **Cancel from `out_for_delivery`** — allowed (rider returns, customer unreachable);
  `062`'s reversal restocks. Needs an explicit test.
- **No active zones but `delivery_enabled` true** — blocked at the settings API, but the
  guest cart must also degrade safely: hide the Delivery option rather than render an empty select.

## Testing

- POST: delivery happy path; toggle off → 400; missing zone → 400; zone from another menu →
  400; inactive zone → 400; missing phone → 400; fee snapshotted correctly; service charge
  excludes the delivery fee.
- PATCH: `ready → out_for_delivery → delivered`; `out_for_delivery` rejected on a takeaway
  order; decline from `new` sets reason.
- **Triggers:** stock deducts once on `preparing` and is not re-deducted by
  `out_for_delivery`; `stock_deduct_on='delivered'` still fires from `out_for_delivery`;
  cancelling from `out_for_delivery` restocks.
- **Reports:** an `out_for_delivery` order appears in `mv_dish_margin_30d`.
- Regression: dine-in and takeaway paths unchanged.
- iPhone Safari pass on the delivery cart and status page.
- Verify on the dev preview URL before promoting dev → main.

## Out of scope (explicit)

Prepayment and refunds (**P1**), the consumer surface at `klickenya.com/eat` (**P2**),
Klickenya riders (**P3**), dispatch (**P4**), live tracking and map pins (**P5**), rider
earnings and float (**P6**), ops console (**P7**). Delivery radius. Scheduled delivery.
Multi-restaurant carts.
