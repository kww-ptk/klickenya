# Event Ticketing Management — Design Spec

**Date:** 2026-07-18
**Branch:** `feat/event-ticketing` (extends the shipped ticketing system: migrations 079–080)
**Status:** Approved design, pending implementation plan

## Goal

Give event hosts (and admins) full control of their ticketing before go-live: edit ticket tiers (price / availability), run discount coupons, and monitor sales, guests, and check-ins from one dashboard. Fixes audit finding 7.4 (hosts cannot edit ticket-critical fields after event creation).

## Decisions (locked with the owner, 2026-07-18)

1. **Tier storage:** keep tier definitions in **Sanity** (`listing.ticketTypes`); make them host-editable via a server action that patches Sanity. (Not migrated to Supabase.)
2. **Coupon creators:** **event hosts** (own events) **and admins** (any event).
3. **Coupon discount:** **percentage OR fixed KES** (chosen per coupon).
4. **Coupon scope:** **per-event** (each coupon belongs to one event).
5. **Coupon controls:** **max total redemptions**, **expiry date**, **one-per-customer**. (No minimum-spend.)
6. **Max-redemptions enforcement:** **atomic counter** (reserve/release lifecycle, mirroring ticket inventory) — capped promos cannot oversell.

## Scope

Three coupled parts, built in this order on the existing branch:
1. Ticket-tier editing (foundation)
2. Coupons (schema + checkout integration + management UI)
3. Enhanced host dashboard (+ admin access to any event's dashboard)

Out of scope: moving tiers to Supabase; platform-wide coupons; minimum-spend; automated host payouts; per-tier coupon restriction (coupons apply to the whole order).

---

## Part 1 — Ticket-tier editing (Sanity, host-editable)

### Data
Tier definitions stay in Sanity `listing.ticketTypes[]` — each item: `_key`, `name`, `price`, `description?`, `available?` (capacity, null = unlimited), `isSoldOut?`. Live "sold" counts remain in Supabase `event_ticket_counters` (migration 079), keyed by tier `_key`.

### Flow
- A **"Manage tiers"** panel on the host ticket dashboard (`/dashboard/events/[id]/tickets`).
- Host adds / edits / removes tiers: name, description, price (KES, ≥ 0), availability (integer ≥ 0, or blank = unlimited), sold-out toggle.
- **Save → server action** `updateEventTiers(eventId, tiers)`:
  - Resolve ownership (`resolveOwnedEvent` + admin allowance).
  - Patch `listing.ticketTypes` in Sanity via the write token, **preserving existing `_key`s** for edited tiers and generating fresh keys only for new tiers (so counters stay attached).
  - Revalidate the concrete listing URL (`/events/{city}/{slug}` — note plural type + city segment) so the public page updates.
- Dashboard reads tiers **fresh from Sanity** (no ISR delay for the host) joined with counters → shows **sold / remaining** per tier live.

### Guardrails
- Lowering a tier's `available` below its already-sold count is allowed and simply stops further sales — surfaced as a note, not an error (the counter guard `sold + qty <= capacity` already enforces it).
- Removing a tier that has sales is allowed with a warning: existing tickets stay valid; no new sales for that tier. (Its orphaned counter row is harmless.)
- `_key` stability is the correctness invariant — a unit-tested pure helper `mergeTierKeys(existing, edited)` guarantees edited tiers keep their key and only genuinely-new tiers get new keys.

### Interfaces
- `apps/web/lib/tickets/tierEdit.ts` — pure: `mergeTierKeys()`, tier input validation (`validateTierInput`).
- Server action / route: patches Sanity + revalidates.
- `TierManager.tsx` (client) on the dashboard.

---

## Part 2 — Coupons

### Migration 081 (`081_event_coupons.sql`)
- **`event_coupons`**: `id`, `event_sanity_id`, `code` (stored uppercased; **unique per event** among active), `discount_type` (`'percent'|'fixed'`), `discount_value` integer, `max_redemptions` integer null, `redeemed` integer default 0, `expires_at` timestamptz null, `one_per_customer` boolean default false, `created_by` uuid, `created_by_role` (`'host'|'admin'`), `active` boolean default true, `created_at`.
- **`coupon_redemptions`**: `id`, `coupon_id` FK, `order_id` FK, `buyer_email`, `discount_kes` integer, `created_at`.
- **`ticket_orders`**: add `coupon_id` uuid null, `discount_kes` integer default 0.
- **RPCs** (mirror the ticket reserve/release):
  - `reserve_coupon(p_coupon_id)` → atomic `UPDATE event_coupons SET redeemed = redeemed + 1 WHERE id = $ AND active AND (max_redemptions IS NULL OR redeemed < max_redemptions) AND (expires_at IS NULL OR expires_at > now())`; raises `COUPON_UNAVAILABLE` if no row updated. Expiry is inside the atomic guard to close the validate-then-reserve race.
  - `release_coupon(p_coupon_id)` → `redeemed = GREATEST(0, redeemed - 1)`.
- Deny-all RLS (adminClient only).

### Pure logic (TDD) — `apps/web/lib/tickets/coupon.ts`
- `applyCoupon(subtotalKes, coupon)` → `{ discount_kes, total_kes }`:
  - percent: `discount = floor(subtotal * value / 100)`; fixed: `discount = min(value, subtotal)`.
  - `total = max(0, subtotal - discount)`. `total === 0` ⇒ free path.
- `couponError(coupon, { now, eventSanityId })` → returns a machine code or null for the non-DB checks (inactive, expired, wrong event). (Cap + one-per-customer need DB and live in the route.)

### Checkout integration (`/api/events/tickets/checkout`)
Accept optional `couponCode`. When present:
1. Load the coupon by `(event_sanity_id, upper(code), active)`.
2. Non-DB validation via `couponError`; DB checks: `one_per_customer` → no prior `coupon_redemptions` for this coupon + `buyer_email`.
3. `applyCoupon` on the tier subtotal → discounted total.
4. **Atomic `reserve_coupon`** (raises if cap/expiry fails → 409 "coupon no longer available").
5. Reserve tickets, create the order with `coupon_id` + `discount_kes`, insert a `coupon_redemptions` row.
6. If discounted `total_kes === 0` → free path (issue immediately, no Paystack).
7. On order-insert failure → `release_coupon` + `release_event_tickets` (both rolled back).
- The expiry cron additionally calls `release_coupon` for expired pending orders that held a coupon.

### Preview endpoint — `POST /api/events/tickets/coupon/preview`
`{ eventSanityId, code, tiers }` → runs the same validation (no reservation) → returns `{ valid, discount_kes, total_kes }` or `{ error }`. Rate-limited (in-memory, like the door redeem). Powers the live "apply code" field in the buyer panel.

### Management UI (host dashboard + admin)
- `POST/DELETE /api/dashboard/events/[id]/coupons` (create / deactivate), ownership via `resolveOwnedEvent` + admin. Create sets `created_by_role` from the caller.
- `CouponManager.tsx`: create form (code, %/fixed + value, optional cap, optional expiry, one-per-customer), list of active coupons with **uses / discount given**, deactivate.
- Buyer side: `TicketPurchase` gains an "Have a coupon?" field → preview → shows discounted total → passes `couponCode` to checkout.

---

## Part 3 — Enhanced host dashboard

Enhance `/dashboard/events/[id]/tickets` (server-rendered):
- **KPI row:** tickets sold · gross · platform fee · **net payout** · checked-in (count + %) · avg order value · **coupons used / total discount given**.
- **Per-tier table:** each tier → sold, revenue, checked-in; links to the tier editor (Part 1).
- **Sales timeline:** inline SVG/CSS bar chart of paid orders per day — **no external chart library** (perf-audit constraint).
- **Guest list:** searchable (name / email) client table → tier, check-in status, coupon used. Server passes the ticket+order rows; filtering is client-side.
- **Coupons** (Part 2) and **Door codes** (already built) sections.
- Manual refresh; per-scan check-in status is already live.

### Admin access
Widen the event-dashboard surface so admins reach any event:
- Extend `resolveOwnedEvent` (or add `resolveEventForStaff`) to return the event when the user is an admin, regardless of host ownership.
- Apply to: tickets page, scan page, tier/coupon/door-code APIs. Admin identity determined the same way the existing `assertAdmin` / admin role check works (reuse the repo's admin check — verify its exact mechanism during implementation).

---

## Testing

- **TDD pure logic:** `applyCoupon` (percent/fixed/clamp/free), `couponError` (inactive/expired/wrong-event), `mergeTierKeys` (key preservation), `validateTierInput`.
- **Migration 081** authored to convention; DB application is a manual step (this env can't reach Supabase).
- **tsc + lint** gates on all routes/components/server actions.
- Runtime flows (Sanity writes, coupon redemption, dashboard render) verified manually on the dev preview — flagged, not faked.

## Sequencing / files (high level)

1. **Tier editing:** `lib/tickets/tierEdit.ts` (+test), tier update route/action, `TierManager.tsx`, wire into tickets page.
2. **Coupons:** migration 081, `lib/tickets/coupon.ts` (+test), checkout + cron integration, preview endpoint, coupon APIs, `CouponManager.tsx`, TicketPurchase coupon field.
3. **Dashboard + admin:** enhance tickets page (KPIs, per-tier, timeline, guest search), admin-access widening in `resolveOwnedEvent` + pages/APIs.

## Risks / notes

- Sanity array patching must preserve `_key`s — the single biggest correctness risk; covered by `mergeTierKeys` tests + careful patch (set full array with keys, not blind replace).
- Coupon + ticket reservation are two atomic reserves in one checkout; both must be released together on failure (already the pattern for tickets — extend to coupons).
- Public listing page reflects tier edits after revalidation (~immediate on the concrete URL, ≤60s worst case) — consistent with how all host content edits behave.
