# EAT Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every defect and gap found in the 14 Sep 2026 review of the food-delivery product (eat.klickenya.com, /order, /manage, /tablet, /rider, /admin/eat): two security holes, the tablet that cannot run a delivery, the invisible delivery fee, the rider-unaware lifecycle, the missing kitchen notification, and the slow admin/owner pages.

**Architecture:** One shared transition table in `lib/orders/transitions.ts` replaces the four copies of the status machine; one pure `deliveryStage()` helper replaces the five ad-hoc timestamp branches; a tiny in-memory `rateLimit()` guards the anonymous and PIN endpoints; migration 093 removes the anonymous insert policies and adds the pickup-lock and POS-lock columns plus the admin index. Admin metrics are cached for 30 s with `unstable_cache`, every server page under /manage and /admin/eat gets a `loading.tsx`, and the middleware stops calling Supabase Auth on API polls.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgREST via `adminClient`), Resend, vitest (`lib/**/__tests__`), TypeScript.

**Branch:** `fix/eat-review` (from `dev`). PR into `dev`, then `dev` → `main` after verification on the dev preview.

**Migration 093 must be applied to the database before this branch is deployed.** Code that reads the new columns tolerates their absence (separate select, error swallowed with a console warning), so a deploy before the migration degrades to the old behaviour rather than a 400.

---

## File map

| File | Responsibility |
|---|---|
| `supabase/migrations/093_eat_hardening.sql` | Drop anon insert policies, add pickup lock + POS lock columns, admin index, listing_slug index |
| `apps/web/lib/security/rateLimit.ts` (+test) | In-memory fixed-window limiter, `clientIp(req)` |
| `apps/web/lib/orders/transitions.ts` (+test) | `ORDER_TRANSITIONS`, `KITCHEN_DRIVING_ROLES`, `canDriveTransition`, `nextAction` |
| `apps/web/lib/orders/deliveryStage.ts` (+test) | `deliveryStage(order)` → one of five stages |
| `apps/web/lib/orders/placement.ts` (+test) | `distinctItemIds`, `requiredGroupsMissing` shared by guest and POS placement |
| `apps/web/lib/orders/notifyRestaurant.ts` | Email the restaurant (Sanity notificationEmail1/2 → host_profiles.email) on a new order |
| `apps/web/lib/email/orderEmails.ts` | HTML for the new-order email |
| `apps/web/hooks/usePolling.ts` | Interval poll that pauses when hidden and refreshes on visible |
| `apps/web/lib/eat/adminMetrics.ts` | Drop items embed, cache 30 s, plain-object inner + Map wrapper |
| `apps/web/app/admin/eat/_components/AutoRefresh.tsx` | `router.refresh()` every 30 s while visible |
| `apps/web/app/admin/eat/loading.tsx`, `app/manage/loading.tsx`, `app/manage/listings/[id]/loading.tsx`, `app/tablet/[slug]/loading.tsx` | Skeletons |
| `apps/web/app/api/orders/[id]/cancel/route.ts` | Guest cancel while status is `new` |
| Modified: `api/orders/route.ts`, `api/orders/[id]/route.ts`, `api/pos/orders/route.ts`, `api/pos/auth/route.ts`, `api/rider/auth/route.ts`, `api/rider/jobs/route.ts`, `api/rider/jobs/[id]/route.ts`, `api/menu/orders/route.ts`, `api/menu/order-items/[id]/route.ts`, `api/menu/riders/route.ts`, `lib/orders/totals.ts`, `lib/eat/menus.ts`, `components/eat/*`, `app/eatklick/*`, `app/eat/page.tsx`, `components/manage/LiveOrderQueue.tsx`, `app/rider/RiderApp.tsx`, `app/m/[slug]/order/[orderId]/OrderStatusClient.tsx`, `app/tablet/[slug]/page.tsx`, `app/admin/eat/**`, `app/admin/layout.tsx`, `app/dashboard/_lib/auth.ts`, `app/manage/listings/[id]/orders/page.tsx`, `middleware.ts`, `CLAUDE.md`, `docs/food-delivery-state.md` | See tasks |

Verification commands used throughout (run from `apps/web`):

```bash
npx vitest run            # unit tests
npx tsc --noEmit          # typecheck
npx eslint <files>        # lint touched files
```

---

## Phase 1 — Security and foundations

### Task 1: Migration 093

**Files:**
- Create: `supabase/migrations/093_eat_hardening.sql`
- Modify: `CLAUDE.md` (migration counter lines), `docs/food-delivery-state.md` §2

- [ ] **Step 1: Write the migration**

```sql
-- 093_eat_hardening.sql
-- Findings from the 14 Sep 2026 EAT review.

-- 1. The anonymous insert policies from 043 were never used by the app
--    (every write goes through the service role) and let anyone holding the
--    public anon key write arbitrary orders, including "delivered" ones with
--    invented payouts. Drop them.
drop policy if exists "orders_anon_insert" on orders;
drop policy if exists "order_items_anon_insert" on order_items;

-- 2. Handover code brute force. Five wrong codes lock pickup for 15 minutes.
alter table orders add column if not exists pickup_attempts int not null default 0;
alter table orders add column if not exists pickup_locked_until timestamptz;

-- 3. Staff PIN brute force. restaurant_staff PINs are looked up by
--    (menu_id, pin) so a failure cannot be attributed to a staff row; the
--    lock lives on the menu. Ten wrong PINs lock sign-in for 10 minutes.
alter table menus add column if not exists pos_failed_attempts int not null default 0;
alter table menus add column if not exists pos_locked_until timestamptz;

-- 4. /admin/eat reads delivery+takeaway orders by date with no menu filter;
--    nothing served that scan.
create index if not exists idx_orders_type_created
  on orders(order_type, created_at desc)
  where order_type in ('delivery', 'takeaway');

-- 5. Every /manage page resolves the menu by listing_slug; it had no index.
create index if not exists idx_menus_listing_slug on menus(listing_slug);
```

- [ ] **Step 2: Update the counters** — CLAUDE.md `Migration count: 093 (last: 093_eat_hardening.sql)` and `Next migration number: 094`; docs/food-delivery-state.md table row `| 093 | anon insert policies dropped, pickup/POS lockouts, admin index |` and `Next migration number: 094`.

- [ ] **Step 3: Commit** `git commit -m "feat(db): 093 drop anon order inserts, add pickup and POS lockouts, admin index"`

### Task 2: Rate limiter helper

**Files:**
- Create: `apps/web/lib/security/rateLimit.ts`
- Test: `apps/web/lib/security/__tests__/rateLimit.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { rateLimit, _resetRateLimits } from "@/lib/security/rateLimit";

describe("rateLimit", () => {
  it("allows up to the limit inside the window, then refuses", () => {
    _resetRateLimits();
    const opts = { limit: 3, windowMs: 60_000, now: 1_000 };
    expect(rateLimit("k", opts).ok).toBe(true);
    expect(rateLimit("k", opts).ok).toBe(true);
    expect(rateLimit("k", opts).ok).toBe(true);
    const r = rateLimit("k", opts);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSeconds).toBe(60);
  });
  it("resets when the window has passed", () => {
    _resetRateLimits();
    rateLimit("k", { limit: 1, windowMs: 1_000, now: 0 });
    expect(rateLimit("k", { limit: 1, windowMs: 1_000, now: 1_001 }).ok).toBe(true);
  });
  it("keys are independent", () => {
    _resetRateLimits();
    rateLimit("a", { limit: 1, windowMs: 1_000, now: 0 });
    expect(rateLimit("b", { limit: 1, windowMs: 1_000, now: 0 }).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Implement**

```ts
import type { NextRequest } from "next/server";

/**
 * Fixed-window rate limit, in memory.
 *
 * Per-instance on Vercel, so it is a speed bump rather than a wall — the
 * PIN and pickup-code checks also carry database-backed lockouts (093). It
 * exists to stop the cheap version of every attack: a loop from one machine.
 */
type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number; now?: number },
): { ok: boolean; remaining: number; retryAfterSeconds: number } {
  const now = opts.now ?? Date.now();
  if (buckets.size > 10_000) buckets.clear(); // bounded memory
  const e = buckets.get(key);
  if (!e || now >= e.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, retryAfterSeconds: 0 };
  }
  e.count += 1;
  if (e.count > opts.limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((e.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: opts.limit - e.count, retryAfterSeconds: 0 };
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Test hook. */
export function _resetRateLimits(): void {
  buckets.clear();
}
```

- [ ] **Step 3:** `npx vitest run lib/security` → PASS. Commit `feat(security): in-memory rate limiter`.

### Task 3: Guard the anonymous and PIN endpoints

**Files:** `app/api/orders/route.ts`, `app/api/rider/auth/route.ts`, `app/api/pos/auth/route.ts`, `app/api/rider/jobs/[id]/route.ts`

- [ ] **Step 1: POST /api/orders** — at the top of `POST`, before parsing: per-IP 10/min; after validation, per-phone 5/10 min for takeaway and delivery:

```ts
const ip = clientIp(req);
if (!rateLimit(`orders:ip:${ip}`, { limit: 10, windowMs: 60_000 }).ok) {
  return NextResponse.json({ error: "Too many orders from this connection. Try again in a minute." }, { status: 429 });
}
// ... after normalizedPhone is known:
if (normalizedPhone && !rateLimit(`orders:phone:${normalizedPhone}`, { limit: 5, windowMs: 10 * 60_000 }).ok) {
  return NextResponse.json({ error: "That phone number has placed several orders just now. Please wait a few minutes." }, { status: 429 });
}
```

- [ ] **Step 2: POST /api/rider/auth** — per-IP 20 per 10 min before the DB lookup (same 429 shape).

- [ ] **Step 3: POST /api/pos/auth** — per-IP 20 per 10 min, and a DB lockout on the menu. Change the menu select to also read `takeaway_enabled, delivery_enabled, pos_enabled` (Task 6 uses them) and, in a SEPARATE tolerant query, `pos_failed_attempts, pos_locked_until`:

```ts
let lock: { pos_failed_attempts: number | null; pos_locked_until: string | null } | null = null;
{
  const { data, error } = await adminClient.from("menus").select("pos_failed_attempts, pos_locked_until").eq("id", menuId).maybeSingle();
  if (error) console.warn("[pos/auth] lock columns unavailable (093 not applied?):", error.message);
  else lock = data;
}
if (lock?.pos_locked_until && new Date(lock.pos_locked_until) > new Date()) {
  return NextResponse.json({ error: "Too many wrong PINs. Try again in 10 minutes." }, { status: 429 });
}
// on !staff:
if (lock) {
  const attempts = (lock.pos_failed_attempts ?? 0) + 1;
  await adminClient.from("menus").update({
    pos_failed_attempts: attempts >= 10 ? 0 : attempts,
    pos_locked_until: attempts >= 10 ? new Date(Date.now() + 10 * 60_000).toISOString() : null,
  }).eq("id", menuId);
}
// on success (only if lock read worked and attempts > 0):
if (lock && (lock.pos_failed_attempts ?? 0) > 0) {
  await adminClient.from("menus").update({ pos_failed_attempts: 0, pos_locked_until: null }).eq("id", menuId);
}
```

- [ ] **Step 4: Pickup code lockout** in `api/rider/jobs/[id]/route.ts` — read `pickup_attempts, pickup_locked_until` in a separate tolerant select; before comparing: if locked → 429 `"Too many wrong codes. Ask the kitchen to confirm the order on their screen, then try again in 15 minutes."`; on mismatch increment, lock at 5 (reset attempts to 0, locked_until now+15 min); on success reset both and set `picked_up_at`.

- [ ] **Step 5:** `npx tsc --noEmit`. Commit `fix(security): rate-limit order placement and PIN sign-ins, lock the pickup code after five misses`.

### Task 4: Owner riders route cannot take over another restaurant's rider

**Files:** `app/api/menu/riders/route.ts:76-92`

- [ ] **Step 1:** Replace the `if (existing)` branch:

```ts
if (existing) {
  // Already a rider somewhere. Only a kitchen that ALREADY has them may reset
  // their PIN — otherwise this call would let any owner take over any rider,
  // including Klickenya's own, by knowing a phone number.
  const [{ data: link }, { data: riderRow }] = await Promise.all([
    adminClient.from("rider_menus").select("rider_id").eq("rider_id", existing.id).eq("menu_id", menuId).maybeSingle(),
    adminClient.from("riders").select("is_platform, is_active").eq("id", existing.id).maybeSingle(),
  ]);
  if (!link || riderRow?.is_platform) {
    return NextResponse.json(
      { error: "That phone number already belongs to a rider. Ask them to sign in with their own PIN, or contact Klickenya to link them to your restaurant." },
      { status: 409 },
    );
  }
  if (!riderRow?.is_active) {
    return NextResponse.json({ error: "That rider has been deactivated by Klickenya." }, { status: 409 });
  }
  const { hash, salt } = makePinHash(pin);
  await adminClient.from("riders").update({ name, pin_hash: hash, pin_salt: salt, failed_attempts: 0, locked_until: null }).eq("id", existing.id);
  riderId = existing.id;
}
```

- [ ] **Step 2:** Commit `fix(security): owners can no longer reset an unlinked or platform rider's PIN`.

## Phase 2 — Lifecycle

### Task 5: Shared transition table

**Files:** Create `apps/web/lib/orders/transitions.ts`, test `apps/web/lib/orders/__tests__/transitions.test.ts`; modify `api/menu/orders/route.ts`, `api/menu/order-items/[id]/route.ts`, `components/manage/LiveOrderQueue.tsx`.

- [ ] **Step 1: Test**

```ts
import { describe, it, expect } from "vitest";
import { ORDER_TRANSITIONS, canDriveTransition, nextAction, isTransitionAllowed } from "@/lib/orders/transitions";

describe("order transitions", () => {
  it("lists the forward moves", () => {
    expect(ORDER_TRANSITIONS.new).toEqual(["preparing", "cancelled"]);
    expect(isTransitionAllowed("ready", "delivered")).toBe(true);
    expect(isTransitionAllowed("delivered", "ready")).toBe(false);
  });
  it("kitchen-driving roles include the delivery station", () => {
    expect(canDriveTransition({ type: "staff", role: "delivery" }, "new", "preparing")).toBe(true);
    expect(canDriveTransition({ type: "staff", role: "kitchen" }, "new", "preparing")).toBe(true);
    expect(canDriveTransition({ type: "owner" }, "preparing", "ready")).toBe(true);
  });
  it("waiters and cashiers may only complete a ready order", () => {
    expect(canDriveTransition({ type: "staff", role: "waiter" }, "new", "preparing")).toBe(false);
    expect(canDriveTransition({ type: "staff", role: "waiter" }, "ready", "delivered")).toBe(true);
  });
  it("names the next action for the queue button", () => {
    expect(nextAction("new")).toEqual({ to: "preparing", label: "Start preparing" });
    expect(nextAction("delivered")).toBeNull();
  });
});
```

- [ ] **Step 2: Implement**

```ts
export type OrderStatus = "new" | "preparing" | "ready" | "delivered" | "cancelled";
export const ORDER_TRANSITIONS: Record<string, OrderStatus[]> = {
  new: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
};
export function isTransitionAllowed(from: string, to: string): boolean {
  return (ORDER_TRANSITIONS[from] ?? []).includes(to as OrderStatus);
}
/** Roles that run the whole lifecycle. 'delivery' is the Food Delivery Station (091). */
export const KITCHEN_DRIVING_ROLES: ReadonlySet<string> = new Set(["kitchen", "manager", "bar", "delivery"]);
export type TransitionActor = { type: "owner" } | { type: "staff"; role: string };
export function canDriveTransition(actor: TransitionActor, from: string, to: string): boolean {
  if (actor.type === "owner" || KITCHEN_DRIVING_ROLES.has(actor.role)) return true;
  return from === "ready" && to === "delivered";
}
export function nextAction(status: string): { to: OrderStatus; label: string } | null {
  switch (status) {
    case "new": return { to: "preparing", label: "Start preparing" };
    case "preparing": return { to: "ready", label: "Mark ready" };
    case "ready": return { to: "delivered", label: "Complete" };
    default: return null;
  }
}
```

- [ ] **Step 3:** Replace `VALID_TRANSITIONS`/`KITCHEN_DRIVING_ROLES`/`isKitchenDriver` in `api/menu/orders/route.ts` and `VALID_NEXT`/`isKitchenDriver` in `api/menu/order-items/[id]/route.ts` with the module; replace `NEXT` in `LiveOrderQueue.tsx` with `nextAction`. Tests + tsc. Commit `refactor(orders): one transition table; delivery station can drive orders`.

### Task 6: Tablet sign-in and landing

**Files:** `app/api/pos/auth/route.ts`, `app/tablet/[slug]/page.tsx`

- [ ] Gate becomes `if (!menu.table_ordering && !menu.reservations_enabled && !menu.takeaway_enabled && !menu.delivery_enabled && !menu.pos_enabled) → 400 "No ordering channel is switched on for this restaurant."`.
- [ ] In `tablet/[slug]/page.tsx`: `if (session.role === "delivery") redirect(\`/tablet/${slug}/orders\`)` before the kitchen/manager/bar branch. Commit `fix(tablet): delivery-only restaurants can sign in; delivery PIN lands on the order queue`.

### Task 7: Owner transitions become rider-aware and race-safe

**Files:** `app/api/menu/orders/route.ts` PATCH

- [ ] Select `rider_id, picked_up_at` in the order fetch.
- [ ] After the transition validation: if `order.order_type === "delivery" && order.rider_id && newStatus === "delivered"` → 409 `"A rider has this one — they complete it when it is delivered."`.
- [ ] Stamp `accepted_at` on new→preparing for takeaway AND delivery; cascade `station_status` new→preparing on accept and (new,preparing)→ready on ready for both types (the takeaway-only cascade generalised).
- [ ] Every UPDATE on orders carries `.eq("status", order.status)` and `.select("id")`; zero rows → 409 `"This order changed on another screen. Refresh and try again."`. The cancel force-set uses `.in("status", ["new","preparing","ready"])`.
- [ ] Commit `fix(orders): rider-aware completion, accept stamps and item cascade for delivery, status-guarded writes`.

### Task 8: Rider routes

**Files:** `app/api/rider/jobs/route.ts`, `app/api/rider/jobs/[id]/route.ts`, `app/rider/RiderApp.tsx`

- [ ] `mine`: add `.in("status", ["preparing", "ready"])`.
- [ ] `accept`: atomic update also `.in("status", ["preparing","ready"])`.
- [ ] `deliver`: require `order.status === "ready"` (400 otherwise: cancelled → "The restaurant cancelled this order."); update filtered `.eq("status","ready").is("delivered_at", null)` with `.select("id")`; zero rows → 409. Afterwards best-effort `order_items` cascade to `delivered` for non-voided lines.
- [ ] New action `release`: `rider_id === me && !picked_up_at` → update `{ rider_id: null, rider_accepted_at: null }` filtered `.eq("rider_id", me).is("picked_up_at", null)`.
- [ ] RiderApp: on the collecting card add a secondary "I can't do this one" button → `act(job.id, "release")`; pickup errors surface as before (including the 429 lock message).
- [ ] Commit `fix(rider): cancelled jobs leave the list, deliver is status-guarded, riders can hand a job back`.

### Task 9: Item edits respect terminal status; totals use the shared money split

**Files:** `app/api/menu/order-items/[id]/route.ts` (edit/void path), `lib/orders/totals.ts`

- [ ] In the edit/void select add `status` to the `orders!inner(...)` join; `if (orderJoin.status === "delivered" || orderJoin.status === "cancelled") → 400 "Order is ${status}; items can no longer change."`.
- [ ] `totals.ts`: select `order_type` too and compute via `splitOrderMoney({ subtotalKes: subtotal, deliveryFeeKes, isDelivery: order.order_type === "delivery", commissionDeliveryBps: bps, commissionPickupBps: bps })`, writing `subtotal_kes, total_kes, commission_kes, restaurant_payout_kes` (rider and platform fee untouched — the fee did not change).
- [ ] Commit `fix(orders): no edits on settled orders; recompute through splitOrderMoney`.

### Task 10: Placement hardening (guest + POS)

**Files:** Create `lib/orders/placement.ts` + test; modify `app/api/orders/route.ts`, `app/api/pos/orders/route.ts`

- [ ] `placement.ts`:

```ts
export function distinctIds(ids: string[]): string[] { return Array.from(new Set(ids)); }
/** Required groups that have no available option cannot be satisfied and must not block the order. */
export function requiredGroupsToEnforce<G extends { id: string; menu_item_id: string }>(
  groups: G[], availableOptionCountByGroup: Map<string, number>,
): G[] { return groups.filter((g) => (availableOptionCountByGroup.get(g.id) ?? 0) > 0); }
```

- [ ] Guest route: `.in("id", distinctIds(itemIds))` and compare `dbItems.length !== distinctIds(itemIds).length`; reject options with `is_available === false` (`"${name}" is not available right now.`); required groups: fetch `item_option_groups` with `item_options(id, is_available)` and enforce only those with an available option; check `menu.is_published`; enforce `menus.min_order_kes` for delivery (select it) → 400 `"Minimum order for delivery is KSh X."`; opening hours: `sanityFetch` the listing `openingHours` by `menus.listing_slug` (select it) and if `isOpenNow(text) === false` → 400 `"${name} is closed right now."` (null = unknown = allow); if `order_items` insert fails → delete the order row and return 500.
- [ ] POS route: distinct ids; select `menu_sections!inner(menu_id, station)` and set `station` on each row like the guest route.
- [ ] Commit `fix(orders): duplicate lines, unavailable add-ons, empty required groups, closed kitchens, atomic item insert; POS rows carry their station`.

### Task 11: Guest tracking tells the truth; guest can cancel while new

**Files:** Create `lib/orders/deliveryStage.ts` + test, `app/api/orders/[id]/cancel/route.ts`; modify `app/api/orders/[id]/route.ts`, `OrderStatusClient.tsx`

- [ ] `deliveryStage.ts`:

```ts
export type DeliveryStage = "waiting" | "cooking" | "rider_assigned" | "awaiting_rider" | "out_for_delivery" | "delivered" | "cancelled";
export function deliveryStage(o: { status: string; rider_accepted_at?: string | null; picked_up_at?: string | null; delivered_at?: string | null }): DeliveryStage {
  if (o.status === "cancelled") return "cancelled";
  if (o.status === "delivered") return "delivered";
  if (o.picked_up_at) return "out_for_delivery";
  if (o.status === "ready") return o.rider_accepted_at ? "rider_assigned" : "awaiting_rider";
  if (o.status === "preparing") return o.rider_accepted_at ? "rider_assigned" : "cooking";
  return "waiting";
}
```

- [ ] `/api/orders/[id]` GET selects and returns `rider_accepted_at, picked_up_at, delivered_at, delivery_fee_kes, subtotal_kes` and `stage: deliveryStage(order)`.
- [ ] `OrderStatusClient`: for delivery use `stage` → titles: waiting "Waiting for the restaurant to confirm", cooking "Being prepared", rider_assigned "Being prepared — a rider is on the way to collect", awaiting_rider "Ready — waiting for a rider", out_for_delivery "On its way to you", delivered "Delivered — enjoy!", cancelled "Order cancelled". Show a fee line (`subtotal_kes` + `delivery_fee_kes`) above the total. Add "Cancel order" button while `status === "new"` → `POST /api/orders/${id}/cancel`; on success poll.
- [ ] `cancel/route.ts`: UUID check, load `status, order_type`, allow only takeaway/delivery at `new`; update `{ status: "cancelled", decline_reason: "Cancelled by the customer" }` filtered `.eq("status","new")`; cascade items to cancelled; 409 if zero rows.
- [ ] Commit `fix(tracking): delivery stage from timestamps, fee shown, guest cancel while new`.

## Phase 3 — Consumer flow

### Task 12: usePolling hook

**Files:** Create `hooks/usePolling.ts`; modify `LiveOrderQueue.tsx`, `RiderApp.tsx`

```ts
"use client";
import { useEffect } from "react";
/** Poll `fn` every `ms` while the tab is visible; refresh immediately when it becomes visible. */
export function usePolling(fn: () => void | Promise<void>, ms: number, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const tick = () => { if (!document.hidden) void fn(); };
    const id = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [fn, ms, enabled]);
}
```

Commit `perf(polling): shared hook that pauses hidden tabs`.

### Task 13: Fee, cart metadata, basket lifecycle, closed kitchens

**Files:** `lib/eat/menus.ts` (MenuCapability + select `delivery_fee_kes, min_order_kes`), `app/eatklick/page.tsx` (Place gets `deliveryFeeKes`, `canOrder`; eligibility = canOrder || canDeliver), `EatKlickFlow.tsx` (pass through; closed banner + disabled add in MenuSheet; confirm before switching restaurant), `useEatCart.ts` (Cart gets `deliveryFeeKes`, `canOrder`; same-menu add refreshes metadata; `lastOrder` persisted under `eatklick.lastOrder`), `CartPanel.tsx` (fee line + grand total; default fulfilment; pickup disabled when `!canOrder`; use API `order_total`; clear basket after placing; last-order card when basket empty), `lib/eat/whatsappOrder.ts` (`deliveryFeeKes` line + grand total).

- [ ] Commit `fix(eat): show the delivery fee everywhere, clear the basket after ordering, block closed kitchens, refresh kitchen details`.

### Task 14: Restaurant notification email on every new order

**Files:** Create `lib/email/orderEmails.ts`, `lib/orders/notifyRestaurant.ts`; modify `app/api/orders/route.ts`

- [ ] `notifyRestaurant({ menuId, orderId, shortId, orderType, customerName, customerPhone, deliveryAddress, lines, subtotalKes, deliveryFeeKes, totalKes })`: resolve recipients exactly like `app/api/menu/reservations/route.ts:505-546` (Sanity `notificationEmail1/2` by `menus.listing_slug`, fall back to `host_profiles.email`, always add `ADMIN_EMAIL`), link to `/manage/listings/<sanityId>/orders`, send from `"Klickenya Orders <orders@klickenya.com>"` via Resend. Wrapped in try/catch; never fails the order.
- [ ] Call it after the items insert in POST /api/orders (`void notifyRestaurant(...)` is not safe on Vercel — `await` it inside try/catch).
- [ ] Commit `feat(orders): email the restaurant on every new order`.

### Task 15: Link the app from klickenya.com

**Files:** `app/eat/page.tsx`

- [ ] Replace the "coming to the coast" card with "Order delivery on eat.klickenya.com" linking to `eatOrigin() ?? "/eatklick"`; hero copy "delivery landing soon" → "delivery and collection"; metadata description; header comment. Commit `feat(eat): link the marketplace hub to the food app`.

## Phase 4 — Admin and owner speed

### Task 16: Skeletons and admin auto-refresh
- `app/admin/eat/loading.tsx` (reuse `AdminCardGridSkeleton`/`AdminListSkeleton`), `app/manage/loading.tsx`, `app/manage/listings/[id]/loading.tsx`, `app/tablet/[slug]/loading.tsx` (dark shell), `app/admin/eat/_components/AutoRefresh.tsx` rendered in `admin/eat/layout.tsx`.

### Task 17: Admin metrics cache
- `adminMetrics.ts`: drop `order_items` embed; inner `loadEatMetrics(days)` returns `{ orders, restaurants: [id,name][], riders: RiderRecord[], ridersUnavailable, schemaError }` wrapped in `unstable_cache(..., ["eat-metrics", String(days)], { revalidate: 30, tags: ["eat:orders"] })`; exported `getEatMetrics` rebuilds the Maps. `Promise.all` in riders and restaurants pages; `sanityFetch` for the slug check; `riders/[id]` unchanged API.

### Task 18: Owner pages
- `getIsAdmin` wrapped in `cache()`. `manage/listings/[id]/orders/page.tsx`: `Promise.all([orders, stationPin, dishes])`, surface the orders `error` as a red banner instead of an empty queue (same in `tablet/[slug]/orders/page.tsx`).

### Task 19: Admin layout badges
- Wrap the nine counts in `unstable_cache(..., ["admin-badges"], { revalidate: 60 })`; `count: "estimated"` for `general_contacts` and `newsletter_subscribers`; use `getAuthUser()`.

### Task 20: Middleware
- Right after the host branches: `if (pathname.startsWith("/api/") && !pathname.startsWith("/api/admin")) return NextResponse.next();` (API routes authenticate themselves). For `/api/admin/*`: run the auth + role check and return `401 { error: "Unauthorized" }` JSON instead of redirecting.

### Task 21: Admin inputs at 16px
- `CommissionRow.tsx` three inputs `text-[16px]`; `AddRider.tsx` three inputs `text-[16px]`.

## Phase 5 — Docs and verification
- Update `docs/food-delivery-state.md` (§1 lifecycle gains `release`, guest cancel, email; §4 new lockouts; §5 unchanged; §6 what remains: payouts, prepay, photos, Realtime).
- `npx vitest run`, `npx tsc --noEmit`, `npx eslint` on touched files, `npx next build`.
- Read-only curl against production after the user applies 093: `orders?select=pickup_attempts&limit=1`, `menus?select=pos_failed_attempts&limit=1`.
- Open PR `fix/eat-review` → `dev`.
