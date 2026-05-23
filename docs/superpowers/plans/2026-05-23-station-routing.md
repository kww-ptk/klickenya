# Station Routing (Kitchen / Bar Split) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route drinks-section tickets to a separate bar dashboard while leaving food on the kitchen dashboard, with zero behaviour change for restaurants that don't opt in.

**Architecture:** Per-section `station` column drives a per-`order_items` `station` snapshot (assigned server-side at order time). Per-menu `order_view_mode` ('combined' | 'split') controls dashboard layout. A PL/pgSQL trigger keeps `orders.status` consistent with the per-station `station_status` values via a deterministic FSM that ignores voided items and never revives terminal (cancelled/delivered) orders. Defaults preserve current single-screen behaviour. The shared `KitchenDashboard` component is replaced by a station-aware `StationDashboard` used by BOTH `/dashboard/menu/[id]/orders` (owner-auth) and `/kitchen/[slug]/orders` (PIN-auth) so split mode works for both consumers.

**Tech Stack:** Postgres (Supabase migrations + PL/pgSQL trigger), Next.js 16 App Router, React 19, TypeScript, Tailwind 4. FSM tests run as a single-transaction PL/pgSQL script under `supabase/tests/` (pattern established by `062_auto_deduct_tests.sql`).

---

## Dev-reality corrections from initial draft (locked in with user)

1. Migration slot is **070** (069 already exists).
2. Per-item PATCH lives on the existing `apps/web/app/api/menu/order-items/[id]/route.ts` (action: `set_station_status`), not on `api/menu/orders`. That endpoint already uses `getPosOrOwnerAuth` so the PIN auth model is inherited for free.
3. Role gating mirrors `api/menu/orders/route.ts` PATCH:
   - **owner / manager / kitchen** can drive `new → preparing → ready`
   - **waiter / cashier** can only drive `ready → delivered`
4. `order_items.is_voided` exists (migration 059). The FSM must ignore voided items in its aggregate, otherwise voided items pin orders.status indefinitely.
5. The trigger never updates `orders.status` if the order is already in a terminal state (`cancelled` or `delivered`). Prevents resurrection.
6. The `KitchenDashboard` component is shared between owner and PIN-authed pages. We build a new `StationDashboard` and swap it into BOTH page wrappers; the old component file is kept (untouched) until a later cleanup pass.
7. `api/menu/orders/route.ts` PATCH cancel must now cascade `station_status` to all non-voided items so the trigger doesn't see live items and overwrite the cancelled status when a stale UI click arrives.
8. Route param is `[id]` (owner) and `[slug]` (PIN), not the `[slug]` everywhere the spec assumed.
9. `CREATE INDEX CONCURRENTLY` cannot run inside a Supabase migration transaction — using plain `CREATE INDEX`.
10. No vitest/jest in the repo. UI/API verification is the manual checklist in Task 11; FSM is exhaustively covered by the SQL test script in Task 2.

---

## File map

**Create:**
- `supabase/migrations/070_station_routing.sql`
- `supabase/tests/070_station_routing_tests.sql`
- `apps/web/app/dashboard/menu/[id]/sections/page.tsx`
- `apps/web/app/dashboard/menu/[id]/settings/page.tsx`
- `apps/web/app/dashboard/menu/[id]/orders/[station]/page.tsx`
- `apps/web/app/kitchen/[slug]/orders/[station]/page.tsx`
- `apps/web/components/dashboard/menu/SectionsStationManager.tsx`
- `apps/web/components/dashboard/menu/OrderViewModeForm.tsx`
- `apps/web/components/dashboard/menu/StationDashboard.tsx`

**Modify:**
- `apps/web/app/api/menu/sections/route.ts` — add station-only PATCH branch
- `apps/web/app/api/orders/route.ts` — snapshot station onto order_items (server-side from menu_sections.station)
- `apps/web/app/api/menu/order-items/[id]/route.ts` — add `action: "set_station_status"` (no manager override, no audit log; role gated)
- `apps/web/app/api/menu/orders/route.ts` — cascade `station_status='cancelled'` to non-voided items in the cancel branch
- `apps/web/app/api/menu/settings/route.ts` — accept `order_view_mode` field
- `apps/web/app/dashboard/menu/[id]/orders/page.tsx` — swap to StationDashboard; read `order_view_mode`; redirect if split
- `apps/web/app/kitchen/[slug]/orders/page.tsx` — swap to StationDashboard; read `order_view_mode`; redirect if split

**Untouched (kept for now):**
- `apps/web/components/dashboard/menu/KitchenDashboard.tsx` — no consumers after the swap; remove in a follow-up cleanup PR

---

## Branch setup (DONE)

`chore/seed-blog-kilifi-edit` holds the unrelated blog WIP. `feat/station-routing` branched from `dev` is the workspace for this plan.

---

## High-risk: trigger + FSM tests (surfaced first per user request)

### Task 1: Migration 070 — schema, FSM trigger, backfill

**Files:**
- Create: `supabase/migrations/070_station_routing.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 070_station_routing.sql
-- Adds optional bar/kitchen routing to the menu ordering system.
-- All changes are backwards compatible: defaults preserve combined-screen behaviour.

------------------------------------------------------------
-- Schema changes
------------------------------------------------------------

ALTER TABLE menu_sections
  ADD COLUMN station text NOT NULL DEFAULT 'kitchen'
    CHECK (station IN ('kitchen','bar'));

ALTER TABLE menus
  ADD COLUMN order_view_mode text NOT NULL DEFAULT 'combined'
    CHECK (order_view_mode IN ('combined','split'));

ALTER TABLE order_items
  ADD COLUMN station text NOT NULL DEFAULT 'kitchen'
    CHECK (station IN ('kitchen','bar'));

ALTER TABLE order_items
  ADD COLUMN station_status text NOT NULL DEFAULT 'new'
    CHECK (station_status IN ('new','preparing','ready','delivered','cancelled'));

-- Non-CONCURRENT because Supabase migrations run inside a transaction.
-- Volume on order_items is small; lock contention is acceptable.
CREATE INDEX idx_order_items_station_status
  ON order_items (station, station_status)
  WHERE station_status IN ('new','preparing','ready');

------------------------------------------------------------
-- Backfill: every existing non-voided row gets station_status = parent
-- orders.status (DEFAULT 'kitchen' already covers the station column).
-- Voided rows keep the default 'new' value — they're excluded from the
-- aggregate anyway, so the value is inert.
------------------------------------------------------------

UPDATE order_items oi
SET station_status = o.status
FROM orders o
WHERE oi.order_id = o.id
  AND oi.is_voided = false;

------------------------------------------------------------
-- derive_order_status(order_id)
--
-- Collapses the multiset of per-item station_status values into one
-- orders.status. Two important invariants:
--
--   (a) is_voided=true items are excluded from the aggregate entirely
--       (a voided line is removed from the bill; it should not pin
--       the order at "preparing" forever).
--   (b) station_status='cancelled' items are excluded from the
--       active-items aggregate but counted toward the "everything
--       cancelled" check.
--
-- FSM applied to the non-voided items:
--   1. If every non-voided item is cancelled  -> 'cancelled'
--   2. Otherwise, among the non-voided non-cancelled "active" items:
--        - all delivered                          -> 'delivered'
--        - all in {ready, delivered}              -> 'ready'
--        - all new                                -> 'new'
--        - anything else (mixed / any preparing)  -> 'preparing'
--
-- Terminal-order safeguard: if orders.status is already 'cancelled'
-- or 'delivered', we never overwrite it. Prevents UI bugs from
-- resurrecting a closed ticket.
------------------------------------------------------------

CREATE OR REPLACE FUNCTION derive_order_status(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total      int;
  v_cancelled  int;
  v_delivered  int;
  v_ready      int;
  v_preparing  int;
  v_new        int;
  v_active     int;
  v_new_status text;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE station_status = 'cancelled'),
    count(*) FILTER (WHERE station_status = 'delivered'),
    count(*) FILTER (WHERE station_status = 'ready'),
    count(*) FILTER (WHERE station_status = 'preparing'),
    count(*) FILTER (WHERE station_status = 'new')
  INTO v_total, v_cancelled, v_delivered, v_ready, v_preparing, v_new
  FROM order_items
  WHERE order_id = p_order_id
    AND is_voided = false;

  IF v_total = 0 THEN
    RETURN;  -- only voided items (or none); leave orders.status alone
  END IF;

  IF v_cancelled = v_total THEN
    v_new_status := 'cancelled';
  ELSE
    v_active := v_total - v_cancelled;
    IF v_delivered = v_active THEN
      v_new_status := 'delivered';
    ELSIF (v_ready + v_delivered) = v_active THEN
      v_new_status := 'ready';
    ELSIF v_new = v_active THEN
      v_new_status := 'new';
    ELSE
      v_new_status := 'preparing';
    END IF;
  END IF;

  UPDATE orders
  SET status = v_new_status
  WHERE id = p_order_id
    AND status NOT IN ('cancelled','delivered')   -- terminal-order safeguard
    AND status IS DISTINCT FROM v_new_status;
END;
$$;

------------------------------------------------------------
-- Trigger: recompute orders.status when station_status changes, OR when
-- an item gets voided (is_voided false -> true). INSERT is not handled
-- because new rows arrive with default 'new' and orders.status is set
-- to 'new' by the API at insert time.
------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_order_items_derive_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM derive_order_status(NEW.order_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_derive_status ON order_items;
CREATE TRIGGER order_items_derive_status
AFTER UPDATE OF station_status, is_voided ON order_items
FOR EACH ROW
WHEN (
  OLD.station_status IS DISTINCT FROM NEW.station_status
  OR (OLD.is_voided = false AND NEW.is_voided = true)
)
EXECUTE FUNCTION trg_order_items_derive_status();
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/070_station_routing.sql
git commit -m "feat(db): station + station_status columns and derive_order_status trigger (070)"
```

---

### Task 2: PL/pgSQL FSM test script

**Files:**
- Create: `supabase/tests/070_station_routing_tests.sql`

Follows the pattern of `supabase/tests/062_auto_deduct_tests.sql`: `\set ON_ERROR_STOP on`, single `do $$ … $$` block inside a `begin … rollback`, `raise exception` for failures, `raise notice` for progress.

- [ ] **Step 1: Write the test script**

```sql
-- 070_station_routing_tests.sql
-- Run with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/070_station_routing_tests.sql
--
-- 9 scenarios covering the derive_order_status FSM. Whole script runs
-- inside one transaction that ROLLBACKs at the end, so re-runnable and
-- leaves nothing behind. Requires at least one row in auth.users.

\set ON_ERROR_STOP on
\timing on

begin;

do $$
declare
  v_owner   uuid;
  v_menu    uuid;
  v_sec_k   uuid;
  v_sec_b   uuid;
  v_item_k  uuid;
  v_item_b  uuid;
  v_order   uuid;
  v_oi_k    uuid;
  v_oi_b    uuid;
  v_got     text;

  -- Inline assertion helper. plpgsql doesn't allow nested procedures
  -- inside a do block in older Postgres, so we inline the check pattern.
begin
  select id into v_owner from auth.users limit 1;
  if v_owner is null then
    raise exception 'No auth.users row exists. Create a user first.';
  end if;

  raise notice E'\n========================================\n  derive_order_status FSM tests\n========================================';

  ----- fixture ----------------------------------------------------
  v_menu := gen_random_uuid();
  insert into menus (id, business_id, slug, name, table_ordering, is_published)
  values (v_menu, v_owner, 'fsm-test-' || substr(v_menu::text,1,8),
          'FSM Test Menu', true, false);

  insert into menu_sections (menu_id, title, station, display_order)
  values (v_menu, 'Burgers', 'kitchen', 0) returning id into v_sec_k;
  insert into menu_sections (menu_id, title, station, display_order)
  values (v_menu, 'Drinks',  'bar',     1) returning id into v_sec_b;

  insert into menu_items (section_id, name, price_kes, is_available)
  values (v_sec_k, 'Burger', 800, true) returning id into v_item_k;
  insert into menu_items (section_id, name, price_kes, is_available)
  values (v_sec_b, 'Beer',   300, true) returning id into v_item_b;

  insert into orders (menu_id, order_type, status, table_number, subtotal_kes, total_kes)
  values (v_menu, 'dine_in', 'new', 'T1', 1100, 1100)
  returning id into v_order;

  insert into order_items (order_id, menu_item_id, item_name, item_price, quantity,
                           station, station_status)
  values (v_order, v_item_k, 'Burger', 800, 1, 'kitchen', 'new')
  returning id into v_oi_k;

  insert into order_items (order_id, menu_item_id, item_name, item_price, quantity,
                           station, station_status)
  values (v_order, v_item_b, 'Beer', 300, 1, 'bar', 'new')
  returning id into v_oi_b;

  ----- scenarios --------------------------------------------------

  -- Initial: trigger only fires on UPDATE, so call directly to seed.
  perform derive_order_status(v_order);
  select status into v_got from orders where id = v_order;
  if v_got <> 'new' then
    raise exception 'scenario 1 (both new): expected new, got %', v_got;
  end if;
  raise notice 'OK 1: both new -> %', v_got;

  -- Scenario 2: kitchen preparing while bar new -> mixed -> preparing
  update order_items set station_status = 'preparing' where id = v_oi_k;
  select status into v_got from orders where id = v_order;
  if v_got <> 'preparing' then
    raise exception 'scenario 2 (kitchen preparing): expected preparing, got %', v_got;
  end if;
  raise notice 'OK 2: kitchen preparing + bar new -> %', v_got;

  -- Scenario 3: kitchen ready while bar still new -> still preparing
  update order_items set station_status = 'ready' where id = v_oi_k;
  select status into v_got from orders where id = v_order;
  if v_got <> 'preparing' then
    raise exception 'scenario 3 (kitchen ready, bar new): expected preparing, got %', v_got;
  end if;
  raise notice 'OK 3: kitchen ready + bar new -> %', v_got;

  -- Scenario 4: both ready -> ready
  update order_items set station_status = 'ready' where id = v_oi_b;
  select status into v_got from orders where id = v_order;
  if v_got <> 'ready' then
    raise exception 'scenario 4 (both ready): expected ready, got %', v_got;
  end if;
  raise notice 'OK 4: both ready -> %', v_got;

  -- Scenario 5: one delivered, one ready -> ready
  update order_items set station_status = 'delivered' where id = v_oi_k;
  select status into v_got from orders where id = v_order;
  if v_got <> 'ready' then
    raise exception 'scenario 5 (kitchen delivered, bar ready): expected ready, got %', v_got;
  end if;
  raise notice 'OK 5: kitchen delivered + bar ready -> %', v_got;

  -- Scenario 6: both delivered -> delivered
  update order_items set station_status = 'delivered' where id = v_oi_b;
  select status into v_got from orders where id = v_order;
  if v_got <> 'delivered' then
    raise exception 'scenario 6 (both delivered): expected delivered, got %', v_got;
  end if;
  raise notice 'OK 6: both delivered -> %', v_got;

  -- Terminal-order safeguard: try to "un-deliver" by reverting bar to new.
  -- orders.status should stay 'delivered'.
  update order_items set station_status = 'new' where id = v_oi_b;
  select status into v_got from orders where id = v_order;
  if v_got <> 'delivered' then
    raise exception 'scenario 7 (terminal safeguard): expected delivered to stick, got %', v_got;
  end if;
  raise notice 'OK 7: terminal safeguard kept orders.status = %', v_got;

  -- New order for cancellation scenarios (the previous one is terminal).
  insert into orders (menu_id, order_type, status, table_number, subtotal_kes, total_kes)
  values (v_menu, 'dine_in', 'new', 'T2', 1100, 1100)
  returning id into v_order;

  insert into order_items (order_id, menu_item_id, item_name, item_price, quantity,
                           station, station_status)
  values (v_order, v_item_k, 'Burger', 800, 1, 'kitchen', 'ready')
  returning id into v_oi_k;

  insert into order_items (order_id, menu_item_id, item_name, item_price, quantity,
                           station, station_status)
  values (v_order, v_item_b, 'Beer', 300, 1, 'bar', 'new')
  returning id into v_oi_b;

  perform derive_order_status(v_order);
  select status into v_got from orders where id = v_order;
  if v_got <> 'preparing' then
    raise exception 'scenario 8 precond: expected preparing, got %', v_got;
  end if;

  -- Scenario 8: cancel the new bar item -> orders should reflect the
  -- remaining ready kitchen item, i.e. 'ready'.
  update order_items set station_status = 'cancelled' where id = v_oi_b;
  select status into v_got from orders where id = v_order;
  if v_got <> 'ready' then
    raise exception 'scenario 8 (cancel one, other ready): expected ready, got %', v_got;
  end if;
  raise notice 'OK 8: bar cancelled + kitchen ready -> %', v_got;

  -- Scenario 9: void the remaining kitchen item -> only voided items left
  -- (the bar one is station_status=cancelled but not voided). Aggregate of
  -- non-voided items: 1 item cancelled out of 1 -> cancelled.
  update order_items set is_voided = true, voided_at = now(), voided_reason = 'test'
    where id = v_oi_k;
  select status into v_got from orders where id = v_order;
  if v_got <> 'cancelled' then
    raise exception 'scenario 9 (void kitchen, bar cancelled): expected cancelled, got %', v_got;
  end if;
  raise notice 'OK 9: kitchen voided + bar cancelled -> %', v_got;

  raise notice E'\n========================================\n  All FSM assertions passed.\n========================================';
end;
$$;

rollback;
```

- [ ] **Step 2: Run against the dev database**

```bash
# DATABASE_URL = direct postgres connection on port 5432 of the Supabase project.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/070_station_routing_tests.sql
```

Expected: nine `NOTICE: OK …` lines and `All FSM assertions passed.`, then `ROLLBACK`. Any `raise exception` aborts the script with a non-zero exit code — fix the function in 070_station_routing.sql before continuing.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/070_station_routing_tests.sql
git commit -m "test(db): FSM assertion script for derive_order_status (070)"
```

---

## API layer

### Task 3: Sections API — accept `{ station }` in PATCH

**Files:**
- Modify: `apps/web/app/api/menu/sections/route.ts`

- [ ] **Step 1: Add a station-only branch to PATCH**

Insert this block after the existing `if (body.action === "reorder")` branch, BEFORE the `/* ── default: rename ── */` block (around line 113):

```ts
    /* ── station-only update ────────────────────────── */
    if (body.station !== undefined && !body.title) {
      const { section_id, station } = body as { section_id: string; station: string };
      if (!section_id || (station !== "kitchen" && station !== "bar")) {
        return NextResponse.json({ error: "section_id and valid station required" }, { status: 400 });
      }
      const owned = await verifySectionOwnership(supabase, section_id, userId, isAdmin);
      if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const client = isAdmin ? adminClient : supabase;
      const { data: updated, error } = await client
        .from("menu_sections")
        .update({ station })
        .eq("id", section_id)
        .select("id, title, display_order, is_visible, station")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      revalidateTag(`menu:${owned.id}`, "default");
      revalidatePath(`/m/${owned.slug}`);
      return NextResponse.json(updated);
    }
```

Also extend the rename branch's `.select(...)` to include `station` so the returned shape is consistent (line 127 → `"id, title, display_order, is_visible, station"`).

- [ ] **Step 2: Verify it compiles**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/menu/sections/route.ts
git commit -m "feat(api): allow PATCH /api/menu/sections to update station"
```

---

### Task 4: Orders POST — snapshot `station` from menu_sections.station

**Files:**
- Modify: `apps/web/app/api/orders/route.ts` (STEP 2 query and STEP 7 row builder)

- [ ] **Step 1: Update STEP 2 query to pull station from joined section**

Replace the existing STEP 2 query (around line 71):

```ts
    /* STEP 2 — Fetch all submitted items from DB (never trust client prices) */
    const itemIds = data.items.map((i) => i.menu_item_id);

    const { data: dbItems } = await adminClient
      .from("menu_items")
      .select(
        "id, name, price_kes, is_available, menu_sections!inner(menu_id, station)"
      )
      .in("id", itemIds)
      .eq("menu_sections.menu_id", data.menu_id);
```

- [ ] **Step 2: Update STEP 7 row builder to snapshot station**

Replace the `orderItemRows = data.items.map((orderItem) => { ... })` block (around lines 263–288) with:

```ts
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

      const selectedOptions = orderItem.selected_options.map((o) => {
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
        allergy_notes:    sanitizeNotes(orderItem.allergy_notes),
        line_total:       lineTotal,
        station,                          // SNAPSHOT — server-derived
        station_status:   "new" as const, // explicit for clarity
      };
    });
```

The rest of the file (STEPS 7.5–10, session attach, insert, response) is unchanged.

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm typecheck
git add apps/web/app/api/orders/route.ts
git commit -m "feat(api): snapshot station from menu_sections onto order_items at order time"
```

---

### Task 5: Per-item station_status action on `/api/menu/order-items/[id]`

**Files:**
- Modify: `apps/web/app/api/menu/order-items/[id]/route.ts`

This extends the existing PATCH handler with a third action: `set_station_status`. Unlike `edit`/`void`, this is a normal kitchen-progress action — no manager override, no audit log, no reason required.

- [ ] **Step 1: Add the action to the dispatch + payload type**

Update the body type (around line 36) and the action validation (line 48):

```ts
  let body: {
    action?:               string;
    new_quantity?:         number;
    reason?:               string;
    manager_override_pin?: string;
    station_status?:       string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action !== "edit" && body.action !== "void" && body.action !== "set_station_status") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }
```

- [ ] **Step 2: Add the set_station_status branch**

Insert this branch BEFORE the `reason` check (around line 52), because set_station_status doesn't need a reason:

```ts
  if (body.action === "set_station_status") {
    // Different shape: no reason required, no manager override. Role-gated.
    const next = body.station_status;
    if (next !== "preparing" && next !== "ready" && next !== "delivered" && next !== "cancelled") {
      return NextResponse.json({ error: "Invalid station_status" }, { status: 400 });
    }

    // Resolve the item + parent order for auth + transition validation.
    const { data: item } = await adminClient
      .from("order_items")
      .select(`
        id, station, station_status, is_voided,
        orders!inner ( id, menu_id, status )
      `)
      .eq("id", itemId)
      .single();
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    if (item.is_voided) {
      return NextResponse.json({ error: "Item is voided" }, { status: 400 });
    }
    const orderJoin = Array.isArray(item.orders) ? item.orders[0] : item.orders;
    if (!orderJoin) return NextResponse.json({ error: "Item has no parent order" }, { status: 500 });

    // Reject updates on terminal orders to mirror the trigger's safeguard.
    if (orderJoin.status === "cancelled" || orderJoin.status === "delivered") {
      return NextResponse.json(
        { error: `Order is ${orderJoin.status}; cannot change items.` },
        { status: 400 },
      );
    }

    const auth = await getPosOrOwnerAuth(req, orderJoin.menu_id);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Role gating mirrors api/menu/orders/route.ts PATCH:
    //   owner/manager/kitchen drive the full lifecycle
    //   waiter/cashier can only complete ready -> delivered
    const isKitchenDriver =
      auth.type === "owner" ||
      (auth.type === "staff" && (auth.role === "kitchen" || auth.role === "manager"));
    if (!isKitchenDriver) {
      const isWaiterCompleting = item.station_status === "ready" && next === "delivered";
      if (!isWaiterCompleting) {
        return NextResponse.json(
          { error: "Forbidden — only kitchen or manager can drive this transition." },
          { status: 403 },
        );
      }
    }

    // Validate transition (same FSM as the order-level PATCH).
    const VALID_NEXT: Record<string, string[]> = {
      new:       ["preparing", "cancelled"],
      preparing: ["ready", "cancelled"],
      ready:     ["delivered", "cancelled"],
    };
    const allowed = VALID_NEXT[item.station_status] ?? [];
    if (!allowed.includes(next)) {
      return NextResponse.json(
        { error: `Cannot transition item from "${item.station_status}" to "${next}".` },
        { status: 400 },
      );
    }

    const { error } = await adminClient
      .from("order_items")
      .update({ station_status: next })
      .eq("id", itemId);
    if (error) {
      console.error("[order-items PATCH set_station_status] error:", error);
      return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
    }

    // orders.status is recomputed by the DB trigger automatically.
    return NextResponse.json({ success: true, station_status: next });
  }
```

The existing `edit` / `void` branches remain unchanged.

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm typecheck
git add apps/web/app/api/menu/order-items/\[id\]/route.ts
git commit -m "feat(api): add set_station_status action to per-item PATCH endpoint"
```

---

### Task 5b: Cascade station_status on whole-order cancel

**Files:**
- Modify: `apps/web/app/api/menu/orders/route.ts` (PATCH handler)

Background: the existing PATCH currently just UPDATEs `orders.status = 'cancelled'`. With the new trigger, if any live item is later mutated, the trigger will recompute orders.status from items and overwrite the cancel. We pre-empt that by setting all non-voided live items to `station_status='cancelled'` first, then letting the trigger settle orders.status = 'cancelled' itself.

- [ ] **Step 1: Replace the final update block**

Locate the block (around lines 211–219):

```ts
    const { error } = await adminClient
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order_id);

    if (error) {
      console.error("[menu/orders PATCH] error:", error);
      return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
    }
```

Replace with:

```ts
    if (newStatus === "cancelled") {
      // Cascade to non-voided live items so the derive_order_status trigger
      // collapses orders.status to 'cancelled' on its own and stays there
      // even if a stale UI click later mutates an item.
      const { error: itemErr } = await adminClient
        .from("order_items")
        .update({ station_status: "cancelled" })
        .eq("order_id", order_id)
        .eq("is_voided", false)
        .in("station_status", ["new", "preparing", "ready"]);
      if (itemErr) {
        console.error("[menu/orders PATCH cascade] error:", itemErr);
        return NextResponse.json({ error: "Failed to cancel order." }, { status: 500 });
      }
      // Belt-and-braces: if the order has no live items (all voided), the
      // trigger won't fire and orders.status would stay put. Force-set it.
      await adminClient.from("orders").update({ status: "cancelled" }).eq("id", order_id);
    } else {
      const { error } = await adminClient
        .from("orders")
        .update({ status: newStatus })
        .eq("id", order_id);
      if (error) {
        console.error("[menu/orders PATCH] error:", error);
        return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
      }
    }
```

The existing audit-log write (`if (auditEntry) await writeAuditLog(...)`) stays untouched after this block.

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add apps/web/app/api/menu/orders/route.ts
git commit -m "feat(api): cascade station_status on whole-order cancel to keep trigger consistent"
```

---

### Task 6: Sections management page + SectionsStationManager component

**Files:**
- Create: `apps/web/app/dashboard/menu/[id]/sections/page.tsx`
- Create: `apps/web/components/dashboard/menu/SectionsStationManager.tsx`

- [ ] **Step 1: Server page**

```tsx
// apps/web/app/dashboard/menu/[id]/sections/page.tsx
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { SectionsStationManager } from "@/components/dashboard/menu/SectionsStationManager";
import { ToastProvider } from "@/components/ui/Toast";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SectionsPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, name")
    .eq("id", id)
    .eq("business_id", user.id)
    .single();
  if (!menu) redirect("/dashboard");

  const { data: sections } = await adminClient
    .from("menu_sections")
    .select("id, title, station, display_order")
    .eq("menu_id", menu.id)
    .order("display_order", { ascending: true });

  return (
    <ToastProvider>
      <SectionsStationManager
        menuId={menu.id}
        menuName={menu.name}
        initialSections={(sections ?? []) as Array<{
          id: string; title: string;
          station: "kitchen" | "bar"; display_order: number;
        }>}
      />
    </ToastProvider>
  );
}
```

- [ ] **Step 2: Client component**

```tsx
// apps/web/components/dashboard/menu/SectionsStationManager.tsx
"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface Section {
  id: string;
  title: string;
  station: "kitchen" | "bar";
  display_order: number;
}

interface Props {
  menuId: string;
  menuName: string;
  initialSections: Section[];
}

export function SectionsStationManager({ menuName, initialSections }: Props) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();

  async function setStation(id: string, station: "kitchen" | "bar") {
    const prev = sections;
    setSections((s) => s.map((row) => (row.id === id ? { ...row, station } : row)));
    setBusyId(id);
    try {
      const res = await fetch("/api/menu/sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: id, station }),
      });
      if (!res.ok) {
        setSections(prev);
        toast.error("Couldn't update station");
        return;
      }
      toast.success(`Routed to ${station === "bar" ? "Bar" : "Kitchen"}`);
    } catch {
      setSections(prev);
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F1EC] p-6">
      <header className="mb-6">
        <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-widest">{menuName}</p>
        <h1 className="font-display text-[22px] font-bold text-[#16130C]">Section routing</h1>
        <p className="text-[13px] text-[#5E5848] mt-1">
          Choose which station prepares each section. Food usually goes to Kitchen; drinks to Bar.
        </p>
      </header>

      <ul className="space-y-2 max-w-2xl">
        {sections.map((s) => (
          <li
            key={s.id}
            className="bg-white border border-[#E2DDD5] rounded-xl p-4 flex items-center justify-between"
          >
            <span className="font-semibold text-[#16130C]">{s.title}</span>
            <div className="inline-flex rounded-full border border-[#E2DDD5] overflow-hidden text-[12px] font-bold">
              <button
                onClick={() => setStation(s.id, "kitchen")}
                disabled={busyId === s.id}
                className={`px-3 h-[32px] transition-colors ${
                  s.station === "kitchen"
                    ? "bg-[#E8A020] text-[#16130C]"
                    : "bg-white text-[#5E5848] hover:bg-[#FAF6EE]"
                }`}
              >
                🍳 Kitchen
              </button>
              <button
                onClick={() => setStation(s.id, "bar")}
                disabled={busyId === s.id}
                className={`px-3 h-[32px] transition-colors ${
                  s.station === "bar"
                    ? "bg-teal-500 text-white"
                    : "bg-white text-[#5E5848] hover:bg-[#EEF7F6]"
                }`}
              >
                🍹 Bar
              </button>
            </div>
          </li>
        ))}
        {sections.length === 0 && (
          <p className="text-[13px] text-[#9C9485]">No sections yet. Create one from the menu builder.</p>
        )}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm typecheck
git add apps/web/app/dashboard/menu/\[id\]/sections/page.tsx \
        apps/web/components/dashboard/menu/SectionsStationManager.tsx
git commit -m "feat(dashboard): /menu/[id]/sections page with kitchen/bar toggle"
```

---

### Task 7: Settings page + extend `/api/menu/settings` with `order_view_mode`

**Files:**
- Modify: `apps/web/app/api/menu/settings/route.ts`
- Create: `apps/web/app/dashboard/menu/[id]/settings/page.tsx`
- Create: `apps/web/components/dashboard/menu/OrderViewModeForm.tsx`

- [ ] **Step 1: Extend the settings allow-list**

In `apps/web/app/api/menu/settings/route.ts`, add `order_view_mode` to the destructure (around line 73) and add a validation block after the existing `default_service_charge_pct` block (around line 163):

Destructure:
```ts
    const {
      menu_id,
      table_ordering,
      reservations_enabled,
      default_reservation_duration,
      reservations_lead_time_hours,
      reservations_max_party_size,
      reservations_max_advance_days,
      default_service_charge_pct,
      order_view_mode,
      listing_city,
    } = body;
```

Validation block (insert before `if (Object.keys(updates).length === 0)`):
```ts
    if (typeof order_view_mode === "string") {
      if (order_view_mode !== "combined" && order_view_mode !== "split") {
        return NextResponse.json(
          { error: "order_view_mode must be 'combined' or 'split'" },
          { status: 400 },
        );
      }
      updates.order_view_mode = order_view_mode;
    }
```

- [ ] **Step 2: Server page**

```tsx
// apps/web/app/dashboard/menu/[id]/settings/page.tsx
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { OrderViewModeForm } from "@/components/dashboard/menu/OrderViewModeForm";
import { ToastProvider } from "@/components/ui/Toast";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MenuSettingsPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, name, order_view_mode")
    .eq("id", id)
    .eq("business_id", user.id)
    .single();
  if (!menu) redirect("/dashboard");

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#F4F1EC] p-6">
        <header className="mb-6">
          <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-widest">{menu.name}</p>
          <h1 className="font-display text-[22px] font-bold text-[#16130C]">Order screen</h1>
        </header>
        <OrderViewModeForm
          menuId={menu.id}
          initialMode={(menu.order_view_mode as "combined" | "split") ?? "combined"}
        />
      </div>
    </ToastProvider>
  );
}
```

- [ ] **Step 3: Form component**

```tsx
// apps/web/components/dashboard/menu/OrderViewModeForm.tsx
"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface Props {
  menuId: string;
  initialMode: "combined" | "split";
}

export function OrderViewModeForm({ menuId, initialMode }: Props) {
  const [mode, setMode] = useState<"combined" | "split">(initialMode);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function pick(next: "combined" | "split") {
    if (next === mode) return;
    const prev = mode;
    setMode(next);
    setSaving(true);
    try {
      const res = await fetch("/api/menu/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menuId, order_view_mode: next }),
      });
      if (!res.ok) { setMode(prev); toast.error("Couldn't save"); return; }
      toast.success("Saved");
    } catch {
      setMode(prev); toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <fieldset className="max-w-xl space-y-3" disabled={saving}>
      <legend className="text-[13px] font-bold text-[#16130C] mb-2">Order screen mode</legend>

      <label className="flex items-start gap-3 bg-white border border-[#E2DDD5] rounded-xl p-4 cursor-pointer">
        <input type="radio" name="mode" value="combined"
          checked={mode === "combined"} onChange={() => pick("combined")} className="mt-1" />
        <div>
          <p className="font-semibold text-[#16130C]">Combined</p>
          <p className="text-[12px] text-[#5E5848]">
            One screen shows kitchen + bar tickets together. Default.
          </p>
        </div>
      </label>

      <label className="flex items-start gap-3 bg-white border border-[#E2DDD5] rounded-xl p-4 cursor-pointer">
        <input type="radio" name="mode" value="split"
          checked={mode === "split"} onChange={() => pick("split")} className="mt-1" />
        <div>
          <p className="font-semibold text-[#16130C]">Split</p>
          <p className="text-[12px] text-[#5E5848]">
            Each station gets its own URL — give the bar a tablet of its own.
          </p>
        </div>
      </label>
    </fieldset>
  );
}
```

- [ ] **Step 4: Commit**

```bash
pnpm typecheck
git add apps/web/app/dashboard/menu/\[id\]/settings/page.tsx \
        apps/web/components/dashboard/menu/OrderViewModeForm.tsx \
        apps/web/app/api/menu/settings/route.ts
git commit -m "feat(dashboard): /menu/[id]/settings page with order_view_mode radio"
```

---

### Task 8: `StationDashboard` shared component

**Files:**
- Create: `apps/web/components/dashboard/menu/StationDashboard.tsx`

Takes one station and a list of orders (with their items). Polls `/api/menu/orders` every 8s. Filters items by station. Per-item progress buttons PATCH `/api/menu/order-items/[id]` with `{ action: "set_station_status", station_status: <next> }`. Whole-order cancel is intentionally NOT in this component — that lives on the order header in the existing UX (and goes through the audited cancel path on `api/menu/orders`).

- [ ] **Step 1: Component**

```tsx
// apps/web/components/dashboard/menu/StationDashboard.tsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

interface SelectedOption { group: string; choice: string; price_add: number }

interface OrderItem {
  id: string;
  item_name: string;
  item_price: number;
  quantity: number;
  notes: string | null;
  selected_options?: SelectedOption[];
  allergy_notes?: string | null;
  line_total?: number | null;
  station: "kitchen" | "bar";
  station_status: "new" | "preparing" | "ready" | "delivered" | "cancelled";
  is_voided?: boolean;
}

export interface DashboardOrder {
  id: string;
  status: string;
  table_number: string | null;
  customer_name: string | null;
  notes?: string | null;
  total_kes: number | null;
  created_at: string;
  waiter_id?: string | null;
  waiter_name?: string | null;
  order_items: OrderItem[];
}

const STATION_THEME = {
  kitchen: {
    label: "Kitchen", emoji: "🍳",
    accent: "bg-[#E8A020]", soft: "bg-[#FDF4E0]",
    border: "border-[#E8A020]/40",
  },
  bar: {
    label: "Bar", emoji: "🍹",
    accent: "bg-teal-500", soft: "bg-teal-50",
    border: "border-teal-400/40",
  },
} as const;

const ITEM_NEXT: Record<string, { label: string; next: string }> = {
  new:       { label: "Start preparing", next: "preparing" },
  preparing: { label: "Mark ready",      next: "ready" },
  ready:     { label: "Done",            next: "delivered" },
};

function elapsed(createdAt: string): string {
  const diffMin = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 min ago";
  return `${diffMin} min ago`;
}

interface Props {
  menuId: string;
  station: "kitchen" | "bar";
  initialOrders: DashboardOrder[];
  /** When true, only items for this station are rendered. Always true in current callers. */
  filterToStation: boolean;
  /** Optional header slot (e.g. "Switch to bar" link in split mode). */
  headerSlot?: React.ReactNode;
}

export function StationDashboard({
  menuId, station, initialOrders, filterToStation, headerSlot,
}: Props) {
  const theme = STATION_THEME[station];
  const [orders, setOrders] = useState<DashboardOrder[]>(initialOrders);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);
  const ordersRef = useRef(orders);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/menu/orders?menu_id=${menuId}`);
        if (!res.ok) return;
        const data = await res.json();
        const incoming: DashboardOrder[] = data.orders ?? [];
        ordersRef.current = incoming;
        setOrders(incoming);
      } catch { /* network blip — next poll heals */ }
    };
    const i = setInterval(poll, 8000);
    return () => clearInterval(i);
  }, [menuId]);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  const updateItem = useCallback(async (orderItemId: string, next: string) => {
    setUpdating((p) => new Set(p).add(orderItemId));
    try {
      await fetch(`/api/menu/order-items/${orderItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_station_status", station_status: next }),
      });
    } finally {
      setUpdating((p) => { const n = new Set(p); n.delete(orderItemId); return n; });
    }
  }, []);

  const cards = useMemo(() => {
    return orders
      .map((o) => {
        const items = (o.order_items ?? [])
          .filter((it) => !it.is_voided)
          .filter((it) => filterToStation ? it.station === station : true);
        return { order: o, items };
      })
      .filter((c) => c.items.some((it) =>
        ["new", "preparing", "ready"].includes(it.station_status)
      ));
  }, [orders, station, filterToStation]);

  return (
    <section className={`flex-1 rounded-2xl ${theme.soft} ${theme.border} border-2 p-4`}>
      <header className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-[14px] font-bold text-[#16130C] uppercase tracking-wide">
          {theme.emoji} {theme.label}
        </h2>
        {headerSlot}
      </header>

      {cards.length === 0 ? (
        <p className="text-[12px] text-[#9C9485] text-center py-6">
          No active {theme.label.toLowerCase()} tickets
        </p>
      ) : (
        <div className="space-y-3">
          {cards.map(({ order, items }) => (
            <div key={order.id} className={`rounded-xl border-2 ${theme.border} bg-white p-4`}>
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-widest">Table</p>
                  <p className="font-display text-[28px] font-extrabold text-[#16130C] leading-none">
                    {order.table_number ?? "—"}
                  </p>
                  {order.waiter_name && (
                    <p className="text-[11px] text-[#5E5848] mt-1">via {order.waiter_name}</p>
                  )}
                </div>
                <span className="text-[11px] text-[#9C9485]" suppressHydrationWarning>
                  {tick >= 0 ? elapsed(order.created_at) : ""}
                </span>
              </div>

              <ul className="space-y-2">
                {items.map((it) => {
                  const action = ITEM_NEXT[it.station_status];
                  return (
                    <li key={it.id} className="flex items-center justify-between gap-3 py-1">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#16130C] truncate">
                          {it.quantity}× {it.item_name}
                        </p>
                        {it.allergy_notes && (
                          <p className="text-[11px] font-bold text-red-600 uppercase tracking-wide">
                            ⚠ {it.allergy_notes}
                          </p>
                        )}
                        <p className="text-[11px] text-[#9C9485] uppercase">{it.station_status}</p>
                      </div>
                      {action && (
                        <button
                          onClick={() => updateItem(it.id, action.next)}
                          disabled={updating.has(it.id)}
                          className={`text-[11px] font-bold text-white ${theme.accent} px-3 h-[30px] rounded-full disabled:opacity-50`}
                        >
                          {updating.has(it.id) ? "…" : action.label}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add apps/web/components/dashboard/menu/StationDashboard.tsx
git commit -m "feat(dashboard): StationDashboard component for per-station tickets"
```

---

### Task 9: Owner dashboard combined page — redirect or two-station view

**Files:**
- Modify: `apps/web/app/dashboard/menu/[id]/orders/page.tsx`

- [ ] **Step 1: Replace the page**

```tsx
// apps/web/app/dashboard/menu/[id]/orders/page.tsx
import * as Sentry from "@sentry/nextjs";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { safeBackHref } from "@/app/dashboard/_lib/back-href";
import { adminClient } from "@/lib/supabase/admin";
import { StationDashboard, type DashboardOrder } from "@/components/dashboard/menu/StationDashboard";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ back?: string }>;
}

export default async function OrdersPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const backHref = safeBackHref(sp.back);
  Sentry.setTag("route", "kitchen_orders");
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, name, table_ordering, order_view_mode")
    .eq("id", id)
    .eq("business_id", user.id)
    .single();
  if (!menu) redirect("/dashboard");
  if (!menu.table_ordering) redirect(`/dashboard/menu/${id}`);

  // Split mode: kick over to the per-station route (kitchen by default).
  if (menu.order_view_mode === "split") {
    redirect(`/dashboard/menu/${id}/orders/kitchen`);
  }

  const { data: orders } = await adminClient
    .from("orders")
    .select(`
      id, status, table_number, customer_name, notes,
      total_kes, created_at, waiter_id,
      order_items (
        id, item_name, item_price, quantity, notes,
        selected_options, allergy_notes, line_total,
        station, station_status, is_voided
      )
    `)
    .eq("menu_id", id)
    .in("status", ["new", "preparing", "ready"])
    .order("created_at", { ascending: false });

  const waiterIds = Array.from(
    new Set((orders ?? []).map((o) => o.waiter_id).filter((v): v is string => !!v)),
  );
  const waiterMap = new Map<string, string>();
  if (waiterIds.length > 0) {
    const { data: waiters } = await adminClient
      .from("restaurant_staff").select("id, name").in("id", waiterIds);
    for (const w of waiters ?? []) waiterMap.set(w.id, w.name);
  }
  const enriched = (orders ?? []).map((o) => ({
    ...o, waiter_name: o.waiter_id ? waiterMap.get(o.waiter_id) ?? null : null,
  })) as DashboardOrder[];

  return (
    <div className="min-h-screen bg-[#F4F1EC]">
      <header className="bg-white border-b border-[#E2DDD5] px-4 lg:px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-widest">Orders</p>
          <h1 className="font-display text-[22px] font-bold text-[#16130C]">{menu.name}</h1>
        </div>
        {backHref && (
          <a href={backHref} className="text-[12px] font-bold text-[#5E5848] underline">Back</a>
        )}
      </header>
      <div className="p-4 lg:p-6 flex gap-4 items-start">
        <StationDashboard menuId={menu.id} station="kitchen"
          initialOrders={enriched} filterToStation />
        <StationDashboard menuId={menu.id} station="bar"
          initialOrders={enriched} filterToStation />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
pnpm typecheck
git add apps/web/app/dashboard/menu/\[id\]/orders/page.tsx
git commit -m "feat(dashboard): combined owner orders page swaps to StationDashboard"
```

---

### Task 10: Single-station pages (owner + PIN variants) and PIN combined-page redirect

**Files:**
- Create: `apps/web/app/dashboard/menu/[id]/orders/[station]/page.tsx`
- Create: `apps/web/app/kitchen/[slug]/orders/[station]/page.tsx`
- Modify: `apps/web/app/kitchen/[slug]/orders/page.tsx`

- [ ] **Step 1: Owner single-station page**

```tsx
// apps/web/app/dashboard/menu/[id]/orders/[station]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { StationDashboard, type DashboardOrder } from "@/components/dashboard/menu/StationDashboard";

interface PageProps {
  params: Promise<{ id: string; station: string }>;
}

export default async function OwnerSingleStationPage({ params }: PageProps) {
  const { id, station } = await params;
  if (station !== "kitchen" && station !== "bar") notFound();

  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, name, table_ordering")
    .eq("id", id)
    .eq("business_id", user.id)
    .single();
  if (!menu) redirect("/dashboard");
  if (!menu.table_ordering) redirect(`/dashboard/menu/${id}`);

  const { data: orders } = await adminClient
    .from("orders")
    .select(`
      id, status, table_number, customer_name, notes,
      total_kes, created_at, waiter_id,
      order_items (
        id, item_name, item_price, quantity, notes,
        selected_options, allergy_notes, line_total,
        station, station_status, is_voided
      )
    `)
    .eq("menu_id", id)
    .in("status", ["new", "preparing", "ready"])
    .order("created_at", { ascending: false });

  const waiterIds = Array.from(
    new Set((orders ?? []).map((o) => o.waiter_id).filter((v): v is string => !!v)),
  );
  const waiterMap = new Map<string, string>();
  if (waiterIds.length > 0) {
    const { data: waiters } = await adminClient
      .from("restaurant_staff").select("id, name").in("id", waiterIds);
    for (const w of waiters ?? []) waiterMap.set(w.id, w.name);
  }
  const enriched = (orders ?? []).map((o) => ({
    ...o, waiter_name: o.waiter_id ? waiterMap.get(o.waiter_id) ?? null : null,
  })) as DashboardOrder[];

  const other = station === "kitchen" ? "bar" : "kitchen";

  return (
    <div className="min-h-screen bg-[#F4F1EC]">
      <header className="bg-white border-b border-[#E2DDD5] px-4 lg:px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-widest">
            {station === "kitchen" ? "🍳 Kitchen" : "🍹 Bar"}
          </p>
          <h1 className="font-display text-[22px] font-bold text-[#16130C]">{menu.name}</h1>
        </div>
        <Link href={`/dashboard/menu/${menu.id}/orders/${other}`}
          className="text-[12px] font-bold text-[#5E5848] border border-[#E2DDD5] rounded-full px-3 h-[32px] inline-flex items-center hover:bg-white">
          Switch to {other === "kitchen" ? "Kitchen" : "Bar"} →
        </Link>
      </header>
      <div className="p-4 lg:p-6">
        <StationDashboard menuId={menu.id} station={station as "kitchen" | "bar"}
          initialOrders={enriched} filterToStation />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: PIN single-station page (mirrors the existing `/kitchen/[slug]/orders/page.tsx` auth pattern)**

```tsx
// apps/web/app/kitchen/[slug]/orders/[station]/page.tsx
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { getPosMenuBySlug } from "@/app/pos/[slug]/_lib/menuFromSlug";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { KitchenHeader } from "@/components/kitchen/KitchenHeader";
import { StationDashboard, type DashboardOrder } from "@/components/dashboard/menu/StationDashboard";

interface PageProps {
  params: Promise<{ slug: string; station: string }>;
}

export default async function PinSingleStationPage({ params }: PageProps) {
  const { slug, station } = await params;
  if (station !== "kitchen" && station !== "bar") notFound();
  Sentry.setTag("route", "kitchen_orders");

  const menu = await getPosMenuBySlug(slug);
  if (!menu) notFound();

  const cookieStore = await cookies();
  const session = verifyPosSession(cookieStore.get(POS_SESSION_COOKIE)?.value);
  if (!session || session.menu_id !== menu.id) redirect(`/kitchen/${slug}`);
  if (session.role !== "kitchen" && session.role !== "manager") {
    redirect(`/pos/${slug}/tables`);
  }

  const { data: staffRow } = await adminClient
    .from("restaurant_staff").select("id, is_active").eq("id", session.staff_id).single();
  if (!staffRow || !staffRow.is_active) redirect(`/kitchen/${slug}`);

  const { data: orders } = await adminClient
    .from("orders")
    .select(`
      id, status, table_number, customer_name, notes,
      total_kes, created_at, waiter_id,
      order_items (
        id, item_name, item_price, quantity, notes,
        selected_options, allergy_notes, line_total,
        station, station_status, is_voided
      )
    `)
    .eq("menu_id", menu.id)
    .in("status", ["new", "preparing", "ready"])
    .order("created_at", { ascending: false });

  const waiterIds = Array.from(
    new Set((orders ?? []).map((o) => o.waiter_id).filter((v): v is string => !!v)),
  );
  const waiterMap = new Map<string, string>();
  if (waiterIds.length > 0) {
    const { data: waiters } = await adminClient
      .from("restaurant_staff").select("id, name").in("id", waiterIds);
    for (const w of waiters ?? []) waiterMap.set(w.id, w.name);
  }
  const enriched = (orders ?? []).map((o) => ({
    ...o, waiter_name: o.waiter_id ? waiterMap.get(o.waiter_id) ?? null : null,
  })) as DashboardOrder[];

  const other = station === "kitchen" ? "bar" : "kitchen";

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F1EC]">
      <KitchenHeader slug={slug} menuName={menu.name}
        staffName={session.staff_name} role={session.role} />
      <header className="bg-white border-b border-[#E2DDD5] px-4 py-3 flex items-center justify-between">
        <p className="text-[12px] font-bold text-[#16130C] uppercase tracking-wide">
          {station === "kitchen" ? "🍳 Kitchen" : "🍹 Bar"}
        </p>
        <Link href={`/kitchen/${slug}/orders/${other}`}
          className="text-[11px] font-bold text-[#5E5848] border border-[#E2DDD5] rounded-full px-3 h-[28px] inline-flex items-center hover:bg-[#F4F1EC]">
          Switch to {other === "kitchen" ? "Kitchen" : "Bar"} →
        </Link>
      </header>
      <div className="flex-1 p-4">
        <StationDashboard menuId={menu.id} station={station as "kitchen" | "bar"}
          initialOrders={enriched} filterToStation />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: PIN combined page — redirect when split, otherwise swap to StationDashboard×2**

Replace the body of `apps/web/app/kitchen/[slug]/orders/page.tsx`:

```tsx
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { getPosMenuBySlug } from "@/app/pos/[slug]/_lib/menuFromSlug";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { KitchenHeader } from "@/components/kitchen/KitchenHeader";
import { StationDashboard, type DashboardOrder } from "@/components/dashboard/menu/StationDashboard";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function KitchenOrdersPage({ params }: PageProps) {
  const { slug } = await params;
  Sentry.setTag("route", "kitchen_orders");

  const menu = await getPosMenuBySlug(slug);
  if (!menu) notFound();

  const cookieStore = await cookies();
  const session = verifyPosSession(cookieStore.get(POS_SESSION_COOKIE)?.value);
  if (!session || session.menu_id !== menu.id) redirect(`/kitchen/${slug}`);
  if (session.role !== "kitchen" && session.role !== "manager") {
    redirect(`/pos/${slug}/tables`);
  }

  const { data: staffRow } = await adminClient
    .from("restaurant_staff").select("id, is_active").eq("id", session.staff_id).single();
  if (!staffRow || !staffRow.is_active) redirect(`/kitchen/${slug}`);

  // Read view mode from the menu (getPosMenuBySlug may not include it — fetch directly).
  const { data: menuMode } = await adminClient
    .from("menus").select("order_view_mode").eq("id", menu.id).single();
  if (menuMode?.order_view_mode === "split") {
    redirect(`/kitchen/${slug}/orders/kitchen`);
  }

  const { data: orders } = await adminClient
    .from("orders")
    .select(`
      id, status, table_number, customer_name, notes,
      total_kes, created_at, waiter_id,
      order_items (
        id, item_name, item_price, quantity, notes,
        selected_options, allergy_notes, line_total,
        station, station_status, is_voided
      )
    `)
    .eq("menu_id", menu.id)
    .in("status", ["new", "preparing", "ready"])
    .order("created_at", { ascending: false });

  const waiterIds = Array.from(
    new Set((orders ?? []).map((o) => o.waiter_id).filter((v): v is string => !!v)),
  );
  const waiterMap = new Map<string, string>();
  if (waiterIds.length > 0) {
    const { data: waiters } = await adminClient
      .from("restaurant_staff").select("id, name").in("id", waiterIds);
    for (const w of waiters ?? []) waiterMap.set(w.id, w.name);
  }
  const enriched = (orders ?? []).map((o) => ({
    ...o, waiter_name: o.waiter_id ? waiterMap.get(o.waiter_id) ?? null : null,
  })) as DashboardOrder[];

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F1EC]">
      <KitchenHeader slug={slug} menuName={menu.name}
        staffName={session.staff_name} role={session.role} />
      <div className="flex-1 p-4 flex gap-4 items-start">
        <StationDashboard menuId={menu.id} station="kitchen"
          initialOrders={enriched} filterToStation />
        <StationDashboard menuId={menu.id} station="bar"
          initialOrders={enriched} filterToStation />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm typecheck
git add apps/web/app/dashboard/menu/\[id\]/orders/\[station\]/page.tsx \
        apps/web/app/kitchen/\[slug\]/orders/\[station\]/page.tsx \
        apps/web/app/kitchen/\[slug\]/orders/page.tsx
git commit -m "feat(dashboard): per-station pages for owner and PIN kitchen UIs"
```

---

## Manual verification + PR

### Task 11: End-to-end smoke and ship

- [ ] **Step 1: Apply migration + run FSM tests**

```bash
# DATABASE_URL = direct postgres URL of the dev Supabase project.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/070_station_routing.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/070_station_routing_tests.sql
# Expected: 'All FSM assertions passed.'
```

- [ ] **Step 2: Baseline (no-opt-in) restaurant still works**

Place an order on the existing public menu. Open the owner orders page and the PIN kitchen page. Confirm all items appear under 🍳 Kitchen (default), 🍹 Bar columns empty, status flow works as before. This validates the no-behaviour-change guarantee.

- [ ] **Step 3: Opt into split mode**

In `/dashboard/menu/<id>/sections` flip Drinks → Bar. In `/dashboard/menu/<id>/settings` choose Split. Verify the section page shows the toggle update; the settings page persists the radio choice.

- [ ] **Step 4: Mixed order routes correctly**

Place an order with one food + one drink. Visit `/dashboard/menu/<id>/orders` — should redirect to `/orders/kitchen` and show only the burger. Visit `/orders/bar` — only the beer. Same for the PIN-authed kitchen route at `/kitchen/<slug>/orders`. SQL check:
```sql
select id, station, station_status, is_voided
from order_items where order_id = '<the order>';
```

- [ ] **Step 5: FSM holds in real UI**

Mark the kitchen item Ready. Check `select status from orders where id=...` → `'preparing'`. Mark the bar item Ready → `'ready'`. Mark each Done → `'delivered'`.

- [ ] **Step 6: Whole-order cancel works**

Place a new mixed order, then hit cancel on the order header (which still goes through `api/menu/orders` PATCH with `reason`). Verify: all non-voided items get `station_status='cancelled'` and `orders.status='cancelled'`. Trying to "un-cancel" via a stale UI click (advancing an item) should return 400 from the per-item endpoint.

- [ ] **Step 7: Voided item doesn't pin status**

Place an order, void one item via the existing edit/void UI, mark the other item ready. orders.status should reflect the non-voided item only.

- [ ] **Step 8: Push and PR**

```bash
git push -u origin feat/station-routing
gh pr create --base dev --title "feat: bar/kitchen station routing for menu orders" \
  --body "Implements docs/superpowers/plans/2026-05-23-station-routing.md"
```

After verifying on the dev preview URL, follow CLAUDE.md to promote dev → main.

---

## Self-review

**Spec coverage:**
- ✅ Schema columns, index, defaults (Task 1)
- ✅ derive_order_status FSM with voided + terminal safeguards (Task 1)
- ✅ Section station toggle (Tasks 3, 6)
- ✅ Per-menu order_view_mode setting (Task 7)
- ✅ Server-side station snapshot (Task 4)
- ✅ Per-item progress API with role gating (Task 5)
- ✅ Cancel cascade keeps trigger consistent (Task 5b)
- ✅ Combined dashboard with two coloured sections (Task 9)
- ✅ Split dashboard per station, both auth modes (Task 10)
- ✅ All four spec test cases plus voided + terminal edge cases (Task 11)
- ⚠ "Realtime subscription" — implemented as the existing 8s poll. Spec'd as a divergence; can be upgraded in a follow-up if needed.

**Placeholder scan:** clean — every step has runnable code or commands.

**Type consistency:** `station` is `"kitchen" | "bar"` across schema, API payloads, snapshot, component props. `station_status` is the five-value union in DB + API + UI. `STATION_THEME` keys match.

**Dispatch order:** Tasks 1–2 surface the trigger first (high risk). Tasks 3–5 are independent API changes; 5b depends on Task 1 (trigger exists). Tasks 6, 7, 8 are independent UI pieces. Tasks 9 and 10 depend on 8. Task 11 depends on all.
