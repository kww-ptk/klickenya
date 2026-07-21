# Takeaway Ordering — Design Spec
Date: 2026-07-20 · Branch: feat/takeaway-ordering · Migration: 083

## What we're building

Guests can order food from the public menu page (`/m/[slug]`) **without a table**, for pickup.
The restaurant **accepts or declines** each takeaway order from the kitchen dashboard, setting an
estimated ready time on accept. The guest follows progress on a **live status page** (polling).
No emails, no SMS — phone number is required and the restaurant's manual `wa.me` link is the
notification fallback (same pattern as reservations). Payment is record-only: pay at pickup.

Activates the dormant `menus.takeaway_enabled` flag (migration 028) and the
`order_type = 'takeaway'` path that migration 043 already allows.

## Decisions made (with the user)

1. **Scope**: Takeaway pickup ordering — not delivery, not eat.klickenya.com Phase 1.
2. **Flow**: Accept-first. Restaurant confirms each takeaway order before preparing.
3. **Contact**: Name + phone required. No email capture, no email sends.
4. **Status model**: Reuse `new` as "awaiting acceptance" for takeaway orders.
   No status-enum change. Accept → `preparing` (+ `estimated_ready_at`).
   Decline → `cancelled` (+ `decline_reason`). `ready` = ready for pickup.
   `delivered` = picked up (terminal).

## Schema — migration 083_takeaway_orders.sql

```sql
alter table orders add column accepted_at        timestamptz;  -- ACTIVE V1 (takeaway)
alter table orders add column estimated_ready_at timestamptz;  -- ACTIVE V1 (takeaway)
alter table orders add column decline_reason     text;         -- ACTIVE V1 (takeaway)
```

No new tables. No RLS changes (orders already admin-client-only + public insert path via API).
`menus.takeaway_enabled` already exists — no ALTER needed, we just start reading/writing it.

**Column-drift rule (CLAUDE.md)**: after adding these columns, update the `.select()`
projections that must expose them — there are 16 `.from("orders")` call sites; audit all,
update the ones that render takeaway state:
- `GET /api/menu/orders` (kitchen list) → add `order_type, customer_name, customer_phone, accepted_at, estimated_ready_at, decline_reason`
- new public status endpoint (below)
- `takeaway_enabled` added to: `/m/[slug]/page.tsx` menu select, `/api/menu/settings` GET+PATCH,
  command-center layout feature context fetch.

## API changes

### `POST /api/orders` (existing, guest order submission)
- Accept `order_type: 'dine_in' | 'takeaway'` in the zod schema (default `'dine_in'`).
- Takeaway validation: menu must have `takeaway_enabled = true`; `customer_name` (min 1) and
  `customer_phone` (Kenyan-tolerant, reuse existing phone validation from reservations) required;
  `table_number` omitted/ignored.
- Takeaway path skips table resolution and session attach entirely (`table_id`,
  `table_session_id` stay null). Resolves the existing `TODO V3: handle tableless orders`.
- Insert with `order_type: 'takeaway'`, `customer_phone` stored.
- Response unchanged shape + `order_id` already returned (used for the status page redirect).

### `GET /api/orders/[id]` (NEW, public guest status)
- No auth. The order UUID is the capability token (unguessable).
- Returns minimal projection: `status, order_type, short_id, created_at, accepted_at,
  estimated_ready_at, decline_reason, line items (name, qty, price), total_kes,
  menu name + slug`. Never returns other orders, never lists.
- 404 on unknown id. Only serves `order_type = 'takeaway'` (dine-in guests don't need it; avoids
  widening the surface).

### `PATCH /api/menu/orders` (existing, owner/kitchen status updates)
- Add accept/decline semantics for takeaway:
  - Accept: `{ status: 'preparing', estimated_ready_minutes: 15|30|45|custom }` →
    sets `accepted_at = now()`, `estimated_ready_at = now() + minutes`.
  - Decline: `{ status: 'cancelled', decline_reason }`.
  - Picked up: `{ status: 'delivered' }`.
- Existing dine-in transitions untouched. Owner auth via existing `verifyMenuAccess()`
  (admin bypass already included).

## Guest UI

### Cart checkout (`components/menu/MenuWithCart.tsx`)
- When menu has `takeaway_enabled`: order-type segmented picker at top of checkout —
  **"At a table"** / **"Takeaway (pickup)"**.
  - Only `table_ordering` on → no picker, current behavior.
  - Only `takeaway_enabled` on → checkout goes straight to takeaway mode.
- Takeaway mode: hides table picker, shows required Name + Phone inputs
  (min 16px font-size, mobile-first). Order note field unchanged.
- On success → navigate to `/m/[slug]/order/[orderId]` (replaces the static confirmation
  screen for takeaway only; dine-in confirmation unchanged).
- `/m/[slug]/page.tsx`: render cart-enabled menu when `table_ordering OR takeaway_enabled`.

### Live status page (`/m/[slug]/order/[orderId]` — NEW, public)
- Client component polling `GET /api/orders/[id]` every 8s (KitchenDashboard pattern:
  `setInterval`, cleanup on unmount, pause when `document.hidden`).
- States:
  - `new` → "Waiting for {restaurant} to confirm your order"
  - `preparing` → "Accepted — ready around {estimated_ready_at}" (Africa/Nairobi via Intl)
  - `ready` → "Ready for pickup 🎉"
  - `delivered` → "Picked up — thank you"
  - `cancelled` → "Declined" + `decline_reason` + restaurant phone link if available
- Shows short_id, item list, total. Includes `loading.tsx` skeleton (project rule).

## Kitchen / owner UI (`components/dashboard/menu/StationDashboard.tsx` + card component)

- Takeaway orders: amber **TAKEAWAY** chip + customer name + phone (tel: link).
- `new` takeaway card: **Accept** with quick ready-time buttons (+15 / +30 / +45 min) and
  **Decline** (short reason input). No "start preparing" until accepted.
- `ready` takeaway card: **Picked up** action (→ `delivered`) + `wa.me` link on the phone,
  pre-filled: "Hi {name}, your order #{short_id} at {restaurant} is ready for pickup!"
  (helper alongside the existing reservations `wa.me` pattern).
- Dine-in cards completely unchanged.
- Both surfaces get this for free (dashboard orders tab and `/kitchen/[slug]` share the component).

## Enablement & registry

- `features.config.ts`: Takeaway entry flips from `() => 'coming_soon'` to
  `ctx.menu?.takeaway_enabled ? 'active' : 'inactive'`. No `tabSegment` (it shares the
  existing `orders` tab — no new tab).
- Toggle UI: add a "Takeaway orders" `Toggle` in the orders settings surface
  (`TableOrderingClient` pattern) wired to `PATCH /api/menu/settings` with `takeaway_enabled`.
- Mirror in `/eat/listings/[id]/features` `FeatureToggleRow` if that surface lists takeaway.

## Edge cases & rules

- Toggle off with pending takeaway orders: orders remain visible/actionable in kitchen;
  only new guest submissions are blocked (server-side check at POST time).
- Guest closes status page: nothing breaks — restaurant has the phone, `wa.me` fallback.
- Declined orders don't cascade anything (no session, no stock deduction beyond what the
  existing cancel path already does — verify order_items station cascade behaves on cancel).
- Timezone: all displayed times via `Intl.DateTimeFormat` with `Africa/Nairobi`.
- Kitchen stock auto-deduction: already correct for free. Migration 062's DB trigger deducts
  on `status → 'preparing'` and reverses on `→ 'cancelled'`. Accept (→ preparing) deducts at
  the right moment; declining a `new` order never deducted; cancelling after accept auto-restocks.
  No stock code changes needed.
- Sanity untouched. Supabase only. No new env vars.

## Testing

- API: POST takeaway happy path, takeaway with toggle off (400), missing phone (400),
  dine-in regression (table still required, session still attaches).
- PATCH: accept sets timestamps, decline sets reason, invalid transitions rejected.
- Status endpoint: unknown id 404s, dine-in order id 404s, minimal projection (no phone of
  other guests — endpoint only ever returns the requested order).
- UI: iPhone Safari pass on cart takeaway mode + status page (16px inputs, no zoom).
- Verify on dev preview URL before promoting dev → main.

## Out of scope (explicit)

Delivery, M-Pesa/Paystack for orders, emails/SMS/WhatsApp API, guest pickup-time selection
(ASAP only), eat.klickenya.com subdomain, new statuses, per-item course/fire work.
