# POS V2 — Discovery & Build Plan

Status: discovery only — no code changes in this pass.
Branch: `claude/pos-v2-discovery-VL35p`.
Goal of V2: complete the restaurant operating loop — table session opens → waiter or guest places orders → kitchen prepares → bill accumulates → bill printed/shared → payment recorded.

This plan maps what exists today (sections 1–5) and proposes a sequenced build order (section 6).

---

## 1. Current schema inventory

POS-relevant migrations are **043** (orders/order_items), **045** (POS foundation: tables, sessions, options), and **049** (reservations with V2 hooks). Migrations 046, 047, 050 do not exist (gaps in numbering).

### 1.1 `orders` (created in 043, altered in 045)

```sql
create table orders (
  id               uuid primary key default gen_random_uuid(),
  menu_id          uuid references menus(id) not null,
  order_type       text not null check(order_type in ('dine_in','takeaway','delivery')),
  status           text not null default 'new'
                     check(status in ('new','preparing','ready','delivered','cancelled')),
  table_number     text,                                          -- ACTIVE V1 (free-text)
  customer_name    text,
  customer_phone   text,
  subtotal_kes     numeric,
  delivery_fee_kes numeric default 0,
  total_kes        numeric,
  payment_status   text not null default 'pending'                -- DORMANT (always 'pending')
                     check(payment_status in ('pending','paid','failed')),
  mpesa_ref        text,                                          -- DORMANT V2 (Daraja)
  delivery_address text,                                          -- DORMANT V3
  delivery_lat     numeric,                                       -- DORMANT V3
  delivery_lng     numeric,                                       -- DORMANT V3
  notes            text,
  created_at       timestamptz default now()
);

-- Added in 045:
alter table orders
  add column table_id         uuid references restaurant_tables(id),    -- ACTIVE (set when QR carries ?table=)
  add column table_session_id uuid references table_sessions(id);       -- DORMANT — never written today
```

- **Indexes**: `(menu_id, status)`, `(menu_id, created_at desc)`, `(table_session_id)`.
- **RLS**: anon can INSERT (guest QR orders); owner can SELECT/UPDATE rows where `menus.business_id = auth.uid()`.
- **Lifecycle**: status flows `new → preparing → ready → delivered`, with `cancelled` reachable from any active state. `payment_status` is set to `pending` on insert and **never updated anywhere** in the codebase.
- **Writes**: `apps/web/app/api/orders/route.ts` POST (guest path) and `apps/web/app/api/menu/orders/route.ts` PATCH (owner status updates).

### 1.2 `order_items` (created in 043, altered in 045)

```sql
create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references orders(id) on delete cascade not null,
  menu_item_id uuid references menu_items(id) on delete set null,
  item_name    text not null,                  -- SNAPSHOT
  item_price   numeric not null,               -- SNAPSHOT
  quantity     int not null default 1 check(quantity > 0),
  notes        text
);

-- Added in 045:
alter table order_items
  add column selected_options jsonb default '[]',  -- ACTIVE — [{group, choice, price_add}]
  add column allergy_notes    text,                -- ACTIVE
  add column line_total       numeric;             -- ACTIVE
```

- **Index**: `(order_id)`.
- **RLS**: anon INSERT, owner SELECT via the orders→menus join.
- **No per-item status** column today. Kitchen can only act on the whole order.

### 1.3 `restaurant_tables` (created in 045, altered in 049)

```sql
create table restaurant_tables (
  id            uuid primary key default gen_random_uuid(),
  menu_id       uuid references menus(id) on delete cascade not null,
  table_number  text not null,           -- "T1", "Bar 3", "Terrace 2"
  capacity      int default 4,
  floor_section text,                    -- DORMANT V3 (legacy, superseded by area_id)
  pos_x         numeric,                 -- DORMANT V3 (floor map)
  pos_y         numeric,                 -- DORMANT V3
  is_active     boolean default true,
  display_order int default 0,
  created_at    timestamptz default now(),
  unique(menu_id, table_number)
);

-- Added in 049:
alter table restaurant_tables
  add column area_id uuid references restaurant_areas(id) on delete set null;  -- DORMANT V2
```

- **Index**: `(menu_id)`.
- **RLS**: owner_all (`menu_id in (select id from menus where business_id = auth.uid())`); public read for published menus.
- **Relation to `table_sessions`**: `table_sessions.table_id` references `restaurant_tables.id`. The DELETE handler at `apps/web/app/api/menu/tables/route.ts:221` blocks delete when an open session exists — but no code creates sessions, so this guard never fires.
- **Read by orders flow**: `POST /api/orders` resolves `table_id` → `table_number` (`apps/web/app/api/orders/route.ts:222-238`) when the QR carries a registered table id.

### 1.4 `table_sessions` (created in 045 — fully dormant)

```sql
create table table_sessions (
  id              uuid primary key default gen_random_uuid(),
  table_id        uuid references restaurant_tables(id) not null,
  menu_id         uuid references menus(id) not null,
  status          text default 'open' check(status in ('open','billed','paid','void')),
  covers          int,                  -- DORMANT V2 (guest count)
  waiter_id       uuid,                 -- DORMANT V3 (no FK, references future staff table)
  opened_at       timestamptz default now(),
  billed_at       timestamptz,          -- DORMANT V2
  paid_at         timestamptz,          -- DORMANT V2
  payment_method  text,                 -- DORMANT V2 ('cash','mpesa','card')
  mpesa_ref       text,                 -- DORMANT V2 (Daraja)
  discount_pct    numeric default 0,    -- DORMANT V2
  notes           text,
  created_at      timestamptz default now()
);
```

- **Created**: yes — the table is real in the DB (not commented out).
- **Indexes**: `(table_id)`, `(menu_id, status)`.
- **RLS**: enabled, single `owner_all` policy. **No anon insert policy** — V2 must add one if guests/QR are to open a session, OR all session opens go through a server route using the admin client.
- **Writes today**: none. Zero code paths INSERT or UPDATE this table.
- **Reads today**: one — the table-delete guard at `apps/web/app/api/menu/tables/route.ts:220-232`. That's it.
- **Confirmation**: `grep "table_session" apps/web supabase` returns the migration, the alter on `orders`, the index on `orders.table_session_id`, the RLS policy, and the single delete-guard read.

### 1.5 Option system (created in 045 — fully active)

```sql
create table item_option_groups (
  id            uuid primary key default gen_random_uuid(),
  menu_item_id  uuid references menu_items(id) on delete cascade not null,
  name          text not null,
  group_type    text not null check(group_type in ('single','multi','allergy')),
  is_required   boolean default false,
  min_select    int default 0,
  max_select    int,
  display_order int default 0,
  created_at    timestamptz default now()
);

create table item_options (
  id               uuid primary key default gen_random_uuid(),
  option_group_id  uuid references item_option_groups(id) on delete cascade not null,
  name             text not null,
  price_modifier   numeric default 0,
  is_available     boolean default true,
  display_order    int default 0
);
```

- **RLS**: owner_all + public_read for published menus, joined through `menu_items → menu_sections → menus`.
- **Writes**: `/api/menu/options` (owner CRUD); read by `/m/[slug]` page query and validated in `/api/orders` POST step 4.

### 1.6 `reservations` and friends (049, 051, 053)

Relevant only because of the `session_id` hook that V2 uses to spawn a table session on check-in.

```sql
create table reservations (
  id             uuid primary key default gen_random_uuid(),
  menu_id        uuid references menus(id) on delete cascade not null,

  -- ACTIVE V1
  guest_name       text not null,
  guest_phone      text not null,
  guest_email      text,                                                 -- added in 051
  party_size       int not null check (party_size > 0),
  reserved_for     timestamptz not null,
  duration_minutes int not null default 90,
  area_id          uuid references restaurant_areas(id) on delete set null,
  status           reservation_status not null default 'pending',
  guest_message    text,
  owner_note       text,
  decline_reason   text,
  source           reservation_source not null default 'qr_menu',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Promoted to ACTIVE in PATCH route:
  approved_by      uuid references auth.users(id) on delete set null,    -- WRITTEN by /api/menu/reservations/[id] PATCH
  approved_at      timestamptz,                                          -- WRITTEN by PATCH

  -- DORMANT V2:
  table_id         uuid references restaurant_tables(id) on delete set null,
  session_id       uuid,                          -- ★ DORMANT V2 — table_sessions ref, no FK declared
  slot_id          uuid references reservation_slots(id) on delete set null,
  checked_in_at    timestamptz,
  completed_at     timestamptz,

  -- DORMANT V3:
  deposit_amount_kes int,
  deposit_mpesa_ref  text,
  deposit_paid_at    timestamptz
);
```

- **`reservation_status` enum**: `pending, approved, declined, checked_in, completed, no_show, cancelled`. Today only `pending → {approved, declined, cancelled}` and `approved → cancelled` are wired in `apps/web/app/api/menu/reservations/[id]/route.ts:21-24`. The check-in/completed/no-show transitions are explicitly TODO V2 (line 16-19 of same file).
- **`session_id` wiring**: completely absent. The column exists, has no FK, is never read or written. This is the hook the V2 check-in flow will fill — when a reservation moves `approved → checked_in`, the handler should create a `table_sessions` row (using `reservations.table_id`) and write its id back to `reservations.session_id`.
- **`reservation_slots`**: entire table dormant V2 — no reads or writes. Created so V2 can ALTER without data loss.
- **`restaurant_areas` (049)**: active — owners create areas, public reads for published menus.
- **`reservation_time_windows` (053)**: active — replaced the V1.5 `menus.reservations_open_time/close_time` columns with multiple windows per menu (Lunch + Dinner pattern).

### 1.7 What's missing for V2

- No `staff` / `waiter` / `employee` table anywhere (see §3).
- No payments ledger for restaurant orders (the property/booking module has `booking_payments` but nothing analogous for restaurant orders/sessions).
- No `course_number` or per-item status on `order_items`.
- No `discounts`, `service_charge`, `tax`, or `tips` columns on `orders` or `table_sessions`.
- No print-job log or receipt-render endpoint.

---

## 2. Current order flow (guest QR self-order)

End-to-end path of a single order today.

### 2.1 Entry point

- URL: `/m/[slug]?table=4` — handled by `apps/web/app/m/[slug]/page.tsx`.
- The page fetches the menu via the admin Supabase client (`getMenu`, line 29). Renders `<MenuWithCart>` if `menu.table_ordering` is true, otherwise `<MenuWithFilters>` (read-only).
- The `?table=4` value is read from `searchParams` and passed as `initialTable` to `MenuWithCart` (`apps/web/app/m/[slug]/page.tsx:154,214`).

### 2.2 Cart UI

- `apps/web/components/menu/MenuWithCart.tsx` — client component.
- Cart state is a `Map<cart_id, CartItem>` (line 510). Two cart lines for the same `menu_item_id` with different options stay separate.
- Items with no real variant groups add directly; items with options open `<ItemModal>`.
- The cart panel (line 174 onward) collects:
  - `tableNumber` — pre-filled and locked to read-only when `initialTable` was on the URL.
  - `customerName` — optional, max 100 chars.
  - `orderNote` — optional free text, max 500.
- Submit hits `POST /api/orders` (line 194).

### 2.3 Submission endpoint

`apps/web/app/api/orders/route.ts` — anon-callable, server-side validated.

- **Request shape** (Zod, line 25-42):
  ```ts
  {
    menu_id: uuid,
    table_number: string,        // required, 1–20 chars
    table_id?: uuid,             // optional registered-table id
    customer_name?: string,
    order_note?: string,
    items: [{
      menu_item_id: uuid,
      quantity: int (1–99),
      selected_options?: [{ option_id: uuid, group: string, choice: string }],  // labels are advisory; server overwrites
      allergy_notes?: string
    }]   // 1–50 items
  }
  ```
- **Validation steps** (numbered in source comments):
  1. Menu exists and `table_ordering = true`.
  2. All `menu_item_id`s belong to the submitted menu.
  3. All items are `is_available = true`.
  4. All option ids exist, are available, and belong to the correct `menu_item_id`.
  5. Every required option group has at least one selection.
  6. If `table_id` provided: it exists, belongs to this menu, `is_active`. Server overrides `table_number` from DB.
- **Persistence**:
  - `orders` row inserted with `order_type='dine_in'`, `status='new'`, `table_number` (resolved), `table_id`, `customer_name`, `notes`, `subtotal_kes`, `total_kes`, `payment_status='pending'`. **`table_session_id` is never set.**
  - One `order_items` row per cart entry, with `selected_options` rebuilt entirely from DB values (group name, choice name, price_add — client labels are discarded).
- **Response**: `{ order_id, short_id, estimated_minutes: 20, table_number, line_items, order_total }`. The 20-min ETA is hard-coded.
- **No M-Pesa, no email, no SMS** triggered on order placement.

### 2.4 Kitchen ingestion

- **Page**: `apps/web/app/dashboard/menu/[id]/orders/page.tsx` — server component.
  - Verifies `menu.business_id = user.id` and `menu.table_ordering = true`, otherwise redirects.
  - Initial fetch via admin client: orders where `status in ('new','preparing','ready')`, newest first, with their items.
  - Tagged for Sentry as `route: kitchen_orders` (per CLAUDE.md note).
- **Polling**: `KitchenDashboard.tsx` polls `GET /api/menu/orders?menu_id=…` every 8 seconds (line 372). New orders trigger a Web-Audio beep (line 75-102) and a 3-second amber border pulse.
- **GET endpoint** (`apps/web/app/api/menu/orders/route.ts:13`): same shape as initial fetch, gated by `verifyMenuAccess`.

### 2.5 Status transitions

`apps/web/app/api/menu/orders/route.ts:76-80`:

```ts
const VALID_TRANSITIONS = {
  new:       ["preparing", "cancelled"],
  preparing: ["ready",     "cancelled"],
  ready:     ["delivered", "cancelled"],
};
```

Owner clicks the per-card button (`Start preparing` → `Mark ready` → `Done`). PATCH route validates transition, updates `orders.status`. Once `delivered` or `cancelled`, the order disappears from the kitchen view (filter is `status in (new, preparing, ready)`).

### 2.6 What happens after "delivered"

**Nothing.** There is no bill UI, no payment capture, no receipt generation, no aggregation per table, and no per-table session. The order exists in the DB with `payment_status='pending'` forever. The owner has no in-app way to mark an order paid or to print a bill — the assumption today is that payment is collected off-platform.

---

## 3. Waiter / staff model

**There is no staff or waiter model in the system today.** Stated explicitly so Prompt 13 can plan around it.

### 3.1 Roles

`supabase/migrations/001_initial_schema.sql:25-38`:

```sql
CREATE TYPE user_role AS ENUM ('admin', 'host', 'guest');

CREATE TABLE users (
  id   uuid PRIMARY KEY REFERENCES auth.users,
  ...
  role user_role DEFAULT 'guest',
  ...
);
```

Three roles only — `admin`, `host`, `guest`. No `waiter`, `staff`, `manager`, `kitchen`, `runner`, `bar`, etc.

### 3.2 Staff/employee tables

There are no `staff`, `employees`, `restaurant_staff`, `menu_staff`, or `team_members` tables. `grep -i "create table (staff|employee|waiter)" supabase/migrations/` returns nothing.

The only references to "waiter" or "staff" in the schema are:

- `table_sessions.waiter_id uuid` (045) — declared with **no FK**, with the comment `references staff table — V3`. Never written.
- `table_sessions.discount_pct numeric` (045) — comment mentions "comp or staff discount". Never written.

`grep` for "waiter" / "staff" / "employee" across `apps/web/**/*.ts(x)` returns only blog seed copy ("staff are friendly", "private villa with staff") — zero application code.

### 3.3 Auth model for non-owners

There is no separate auth surface. A waiter today would have to:

- Be granted access to the owner's account (share password — not viable), or
- Be issued their own `users` row with `role = 'host'` and somehow be linked to the menu (no link table exists), or
- Use a per-device unauthenticated token (doesn't exist).

The kitchen dashboard at `/dashboard/menu/[id]/orders` requires `getAuthUser()` and verifies `menus.business_id = user.id`. So today the owner is the only person who can see or act on orders.

### 3.4 Implications for V2

V2 must decide between two paths before writing the waiter ordering UI:

- **Lightweight path** — add a `staff` table (minimal: `id, menu_id, name, pin_code, role enum('waiter','manager','kitchen'), is_active`) and a PIN-pad sign-in surface that issues a session cookie tied to a server-side staff session. No Supabase auth row per waiter. Cheaper, faster to ship, sufficient for "who took this order".
- **Full path** — add `auth.users` row per staff member with a new `user_role` value, plus a `menu_staff` link table. Heavier, useful only if waiters need to log in via email/password and access multiple surfaces.

Recommendation: lightweight path. Documented in §6 Prompt 13.

---

## 4. Kitchen dashboard — current state

`apps/web/components/dashboard/menu/KitchenDashboard.tsx` (575 lines, single file).

### 4.1 Per-order display

Each card shows:

- **Table number** as the headline (36px, bold) — `order.table_number` or `—` if null.
- **Customer name** under the table number, when present.
- **Status pill** (top right): `new` / `preparing` / `ready`, color-coded amber / purple / emerald.
- **Order-level note** from the guest, in an amber callout when present.
- **Items list**:
  - `quantity × item_name` and `KSh line_total`.
  - Selected options as `› Group: Choice` lines.
  - **Allergy callout** parsed from `allergy_notes` via a keyword heuristic (line 15-18: nut/dairy/gluten/egg/shellfish/soy/sesame). Allergens render in a red bordered pill ("ALLERGY: peanuts"); non-allergen notes render in amber as "⚑ no onions". This is purely cosmetic — there is no DB-side allergen flag.
  - Legacy per-item `notes` field (italic, grey) shown if present.
- **Order total** when any line has `line_total`.
- **Footer**: elapsed minutes ("3 min ago") and action buttons.

### 4.2 Available actions

Per-order only. Two buttons per card:

- **Cancel** — confirm dialog, PATCH to `cancelled`, removes from view.
- **Action button** — label depends on status (`STATUS_NEXT` table, line 125-129):
  - `new` → "Start preparing" → `preparing`
  - `preparing` → "Mark ready" → `ready`
  - `ready` → "Done" → `delivered` (removes from view)

**No per-item status, no "ready" stamp per item, no recall-to-kitchen.**

### 4.3 Course sequencing

None. Items have no `course_number`, no `fire_at`, no "send starters now" mechanism. All items in an order are presented as a single block.

### 4.4 Grouping

**Orders are individual, not grouped by table.** A single table that orders three rounds appears as three separate cards in the New / Preparing / Ready columns. The table number is displayed prominently per card to let the kitchen see the connection visually, but there is no software-level grouping or bill aggregation.

Within each column, sort is `created_at DESC` — newest first (line 447-449).

### 4.5 Polling cadence

Identical pattern to other live dashboards:

- 8-second `setInterval` polling `/api/menu/orders?menu_id=…` (line 372).
- Brand-new orders (id not in current state) trigger:
  - A Web Audio beep — two sine tones, 880Hz then 1100Hz, ~0.5s total (line 75-102).
  - A 3-second amber border pulse via the `animate-pulse-border` keyframe (line 564-571).
- A separate 30-second `tick` interval re-renders every card so `elapsed()` stays fresh (line 377-380).
- Network errors are swallowed silently — the next poll cycle reconciles state.
- No SSE / WebSocket / Realtime subscription. Pure HTTP polling, same pattern as the reservations dashboard.

### 4.6 Changes needed for V2

- **Waiter-submitted orders alongside guest orders**: needs a `created_by_waiter_id` column on `orders` (or a `source` enum like reservations has) so the kitchen can see who took the order. UI changes: a small "Waiter: Maria" line under the customer name; otherwise the current per-order layout works unchanged.
- **Course sequencing**: add `course_number int` (nullable, default 1) on `order_items`, and a `fired_at timestamptz` so a waiter can "fire mains" later. Kitchen UI gains a `Fire mains` button on the order card and items render in course buckets within the card. A "Send starters first" toggle on the cart UI sets `course_number` per line.
- **Per-item status**: add `status text` on `order_items` with check `(pending, preparing, ready, served, voided)`. Kitchen card switches to per-item action buttons instead of per-order. The order-level status becomes derived (`min(item statuses)`). This is the bigger structural change — defer until §6 Prompt 17 unless explicitly needed sooner.
- **Bill view per table**: separate from the kitchen view — see Prompt 14. Kitchen card might gain a small "Session: $1,240 open" footer linking to the bill, but the kitchen surface itself stays focused on prep flow.

---

## 5. POS-adjacent code inventory

Keyword grep across `apps/web/**/*.ts(x)` and `supabase/migrations/**` for: `pos`, `bill`, `receipt`, `payment`, `checkout`, `session`, `waiter`, `staff`, `course`, `split`, `print`, `thermal`, `escpos`.

### 5.1 Hits with direct POS relevance

| File | Keyword | Context |
|------|---------|---------|
| `supabase/migrations/045_pos_foundation.sql` | `waiter_id`, `payment_method`, `mpesa_ref`, `discount_pct`, `billed_at`, `paid_at` | Dormant columns on `table_sessions` — the payment payload is already schematised |
| `supabase/migrations/043_orders.sql` | `payment_status`, `mpesa_ref` | On `orders` — always `'pending'`, ref always null |
| `apps/web/app/api/menu/tables/route.ts:220-232` | `table_sessions` | Only read: blocks table delete when open session exists |
| `apps/web/app/api/orders/route.ts:278-288` | `table_session_id` | Never set — the column is in the INSERT but receives no value |
| `apps/web/components/menu/MenuWithCart.tsx:444` | `receipt` | HTML comment label "Receipt" on the order confirmation screen — the confirmation screen is already a visual receipt-style layout |
| `apps/web/components/menu/MenuWithCart.tsx:414` | `payment` | "No payment needed now" copy on cart submit — confirms the guest flow explicitly defers payment |

### 5.2 Hits that are NOT POS-relevant

- `pos` in `Nav.tsx`, `SearchDropdown.tsx`, `SearchEngine.tsx` — CSS position state (`useState<{left, width}>`), unrelated.
- `checkout` throughout `HeroSearch.tsx`, `ContactForm.tsx`, `RoomAvailabilityModal.tsx`, `BookingWidget.tsx` — property booking check-out dates, unrelated.
- `payment_status`, `mpesa_ref`, `paid_at` in `admin/bookings/`, `dashboard/property/` — the property/stay booking payment ledger. This is a **usable reference**: `apps/web/app/dashboard/property/[id]/_components/BookingSidePanel.tsx` implements cash/M-Pesa/bank/card recording with an `amount_kes + method + reference + paid_at` log per transaction. That data model maps cleanly to restaurant session payments.
- `staff` / `waiter` — only in blog seed scripts (narrative text, unrelated).
- `print`, `thermal`, `escpos` — zero hits. No print infrastructure exists.
- `course`, `split` — zero hits.

### 5.3 Useful dormant infrastructure

Three things exist that V2 can activate rather than build from scratch:

1. **`table_sessions` table** — schema is complete for V2: `status`, `covers`, `payment_method`, `mpesa_ref`, `discount_pct`, `billed_at`, `paid_at`. Just needs code to create/close sessions and RLS anon-insert policy if a QR-triggered session-open is needed.
2. **`orders.table_session_id`** — column and FK exist, index exists. The POST `/api/orders` handler just needs one extra assignment: `table_session_id: resolvedSessionId`.
3. **`reservations.session_id` + `reservations.checked_in_at`** — the hook for the reservation → check-in → table session flow is pre-positioned. Adding `approved → checked_in` to `VALID_TRANSITIONS` in `/api/menu/reservations/[id]/route.ts` and creating a session on that transition is the complete wiring needed.

---

## 6. Proposed V2 build order

Eight focused prompts. Each is ~45–90 min of Claude Code work. Dependencies are explicit — no prompt should start until its listed predecessors are merged to `dev`.

---

### Prompt 13 — Staff table + PIN auth

**Builds**: staff management system (minimal, PIN-based). No Supabase Auth row per waiter.

**Depends on**: nothing — standalone migration.

**Schema changes** (new migration `054_staff.sql`):

```sql
create table restaurant_staff (
  id           uuid primary key default gen_random_uuid(),
  menu_id      uuid references menus(id) on delete cascade not null,
  name         text not null,
  role         text not null check(role in ('waiter','manager','kitchen')),
  pin_hash     text not null,   -- bcrypt hash of a 4-digit PIN
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
-- RLS: owner_all (staff data is private to the business)
```

Add `waiter_id uuid references restaurant_staff(id)` FK to `table_sessions` (replacing the untyped dormant column) and `orders` (new column for waiter-submitted orders).

**New API routes**:
- `POST /api/menu/staff` — owner creates staff member (name, role, PIN).
- `PATCH /api/menu/staff/[id]` — owner updates, deactivates.
- `POST /api/menu/staff/authenticate` — given `{ menu_id, pin }`, returns a short-lived signed JWT (or sets a session cookie) identifying the staff member. No Supabase auth involved.

**New UI surfaces**:
- Dashboard tab "Staff" on `/dashboard/menu/[id]` — list + add/edit staff with name, role, PIN.
- `/pos/[slug]` — waiter PIN-pad landing page. Waiter types their 4-digit PIN, gets redirected to the waiter order-entry UI (built in Prompt 15). This URL is bookmarked on shared tablet devices.

**Does NOT include**: the waiter order-entry UI (Prompt 15), session creation (Prompt 14).

---

### Prompt 14 — Table sessions: open / close / bill

**Builds**: the core session lifecycle. Opening a session, accumulating orders against it, viewing the live bill, marking as billed or paid.

**Depends on**: Prompt 13 (needs `restaurant_staff` for `waiter_id`).

**Schema changes**:
- Activate `table_sessions.waiter_id` FK (alter to reference `restaurant_staff`).
- New migration adds `service_charge_pct numeric default 0` to `table_sessions` (Kenya context; common in hotel-style restaurants).
- Anon-insert RLS policy on `table_sessions` — OR — keep owner-only RLS and route all session creation through the server admin client.
- Activate `orders.table_session_id` assignment in `POST /api/orders`.
- Activate `reservations.session_id`, `reservations.checked_in_at`: add `approved → checked_in` transition to `VALID_TRANSITIONS`, create session row and write `session_id` back on that transition.

**New API routes**:
- `POST /api/menu/sessions` — open a session for a table (`table_id`, `covers`, optional `waiter_id`). Returns `session_id`. Validates no other `open` session exists for that table.
- `GET /api/menu/sessions?menu_id=…` — list open sessions with live totals (join to orders).
- `GET /api/menu/sessions/[id]` — single session detail: all orders, all items, calculated subtotal + service_charge + discount → total.
- `PATCH /api/menu/sessions/[id]` — status transitions: `open → billed`, `billed → paid`, `open → void`. Sets `billed_at`, `paid_at`, `payment_method`, `mpesa_ref`, `discount_pct`.

**New UI surfaces**:
- `/dashboard/menu/[id]/sessions` — table grid (each table card shows: table number, status: Open/Available, open duration, running total). Opens a session side-panel on click.
- Session side-panel — shows all orders for this session, running subtotal, service charge, discount field, total. Action buttons: "Print bill", "Mark paid (cash)", "Mark paid (M-Pesa ref)".
- Kitchen order card gains a subtle "Table T3 · Session open" label when `table_session_id` is set — no other kitchen UI change.

**Does NOT include**: waiter order entry (Prompt 15), receipt printing (Prompt 16), per-item status (Prompt 17).

---

### Prompt 15 — Waiter order-entry UI

**Builds**: a tablet-optimised order-entry surface for staff. Functionally similar to the guest `MenuWithCart` but authenticated via staff PIN session, sends to a specific table session, and supports "send to kitchen now" vs. "hold".

**Depends on**: Prompts 13 (staff auth) + 14 (sessions exist).

**Schema changes**: none (columns already exist from 13+14).

**New API routes**:
- `POST /api/pos/orders` — authenticated staff version of `POST /api/orders`. Additional fields: `session_id` (required), `waiter_id` (from staff session cookie), `fire_now boolean`. Sets `orders.waiter_id` and `orders.table_session_id`.

**New UI surfaces**:
- `/pos/[slug]/table/[tableId]` — the waiter order entry screen. Auth-gated by staff PIN session cookie.
  - Left panel: category tabs + item list (reuses `CartItemCard` styles).
  - Right panel: running order for this table's open session — all prior orders grouped + new cart.
  - "Send to kitchen" button fires the order to `POST /api/pos/orders`.
  - "Add to bill" button adds without sending to kitchen (for items like bottled water that don't need prep).
- Kitchen dashboard gains a "Waiter" chip on cards from staff orders (small, shows `order.waiter_id → staff.name`).

**Does NOT include**: course fire sequencing (Prompt 17), split bills (future), modifier discounts per item.

---

### Prompt 16 — Bill printing / receipt share

**Builds**: bill rendering and delivery. No thermal printer — web-first: PDF bill URL shareable via WhatsApp, plus a print-optimised HTML page.

**Depends on**: Prompt 14 (sessions must have a `/api/menu/sessions/[id]` detail endpoint).

**Schema changes**: none.

**New API routes**:
- `GET /api/menu/sessions/[id]/receipt` — returns a bill object: business name + logo, table number, session open/close times, itemised orders grouped by round, subtotals, service charge, discount, total, payment method. JSON.
- `GET /api/menu/sessions/[id]/receipt.html` — server-rendered print-optimised HTML. Linked from "Print bill" button (opens in new tab, browser print dialog).

**New UI surfaces**:
- "Share via WhatsApp" button on the session side-panel: generates a `wa.me/?text=…` deep-link with a pre-formatted bill summary (same pattern as reservation WhatsApp share in `_lib/whatsapp.ts`).
- Bill HTML page (`/pos/receipt/[sessionId]`) — clean mono-style layout: restaurant header, date/time, itemised list, totals, payment line, "Thank you" footer. Print CSS hides nav. Works on any device without an app.
- "Email bill" option (Resend): fires the receipt HTML as an email if `guest_email` was collected (either from reservation, or optionally entered by waiter when opening the session).

**Does NOT include**: thermal / ESC-POS integration, split billing, batch receipt exports.

---

### Prompt 17 — Course fire + per-item status (optional, defer if not needed)

**Builds**: course sequencing on the waiter UI and per-item status on the kitchen display.

**Depends on**: Prompts 14 + 15 (sessions + waiter entry must work first).

**Schema changes** (new migration):

```sql
alter table order_items
  add column course_number int not null default 1,
  add column item_status   text not null default 'pending'
               check(item_status in ('pending','preparing','ready','served','voided')),
  add column fired_at      timestamptz;   -- null until waiter fires the course
```

**New API routes**:
- `POST /api/pos/fire-course` — `{ session_id, course_number }`. Sets `fired_at = now()` on all `order_items` in that session/course that are still `pending`. Kitchen poll picks these up.
- `PATCH /api/pos/order-items/[id]` — kitchen marks individual item status (`preparing`, `ready`, `served`).

**New UI surfaces**:
- Waiter cart gains a "Course" selector per line (1 = Starter, 2 = Main, 3 = Dessert).
- Session side-panel shows "Fire Course 2" button once course 1 items are all `ready`.
- Kitchen card splits into course sections; items show individual `[Preparing]` / `[Ready]` chips; per-item action buttons appear.

**Does NOT include**: timing analytics, pre-set course menus, allergen matrix.

---

### Build order summary

```
Prompt 13 — Staff table + PIN auth
    ↓
Prompt 14 — Table sessions: open / close / bill
    ↓
Prompt 15 — Waiter order-entry UI
    ↓
Prompt 16 — Bill printing / receipt share
    ↓
Prompt 17 — Course fire + per-item status  (optional, post-MVP)
```

Prompts 13 and 14 are the critical path and should be reviewed on `dev` together before building the UI layers in 15+. Prompt 17 is explicitly optional — the system is usable without it.

**Not in scope for V2**: M-Pesa Daraja push-pay integration (requires Daraja sandbox credentials + webhook receiver), tip/gratuity split, floor map editor, multi-device staff concurrency conflicts, offline PWA mode.

---

*Document generated on the `claude/pos-v2-discovery-VL35p` branch. No code was changed.*

