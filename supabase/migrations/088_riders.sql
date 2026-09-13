-- 088_riders.sql
-- Riders: identity, which kitchens they serve, and the delivery leg on orders.
--
-- DELIBERATELY NOT adding an order status. "Out for delivery" is derived —
-- status='ready' AND picked_up_at IS NOT NULL — not a new enum value.
--   * 063:333 (mv_dish_margin_30d) filters status in ('preparing','ready',
--     'delivered'); an order parked in a new status would disappear from
--     margin reports for the whole time it is in flight.
--   * 062:256 and 063:125 branch on status='delivered' for stock and reports.
-- Timestamps give the same UX with none of that blast radius, and leave the
-- twelve .from("orders") projections alone.

-- ─── 1. riders ────────────────────────────────────────────────────────────
-- PINs are HASHED here, unlike restaurant_staff (054), which stores them in
-- plaintext. A rider's PIN releases someone else's cash: with the phone
-- number known, a 4-digit PIN is 10,000 guesses, so it gets a real KDF
-- (scrypt, per-rider salt) plus lockout. Not worth matching the older
-- precedent when the thing being protected is money.
create table if not exists riders (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  -- Normalised to +254… by lib/orders/phone.ts before it is written.
  phone          text not null unique,
  pin_hash       text not null,
  pin_salt       text not null,
  is_active      boolean not null default true,
  -- Brute-force defence. Reset on a correct PIN.
  failed_attempts int not null default 0,
  locked_until   timestamptz,
  created_at     timestamptz not null default now()
);

-- ─── 2. which kitchens a rider serves ─────────────────────────────────────
-- Many-to-many on purpose, and it is what lets one model cover both worlds:
-- a single row is "the restaurant's own guy", several rows is a Klickenya
-- rider working a town. No schema change needed to move between them.
create table if not exists rider_menus (
  rider_id  uuid not null references riders(id) on delete cascade,
  menu_id   uuid not null references menus(id)  on delete cascade,
  created_at timestamptz not null default now(),
  primary key (rider_id, menu_id)
);

create index if not exists idx_rider_menus_menu on rider_menus(menu_id);

-- ─── 3. the delivery leg on an order ──────────────────────────────────────
alter table orders add column if not exists rider_id           uuid references riders(id) on delete set null;
-- When the RIDER took the job — distinct from orders.accepted_at (083), which
-- is when the RESTAURANT accepted it. Two different people accepting two
-- different things; sharing a column would have been a nasty little bug.
--
-- A rider accepts while the food is still cooking and rides over during it.
-- Waiting for 'ready' means the food sits on the pass for the length of the
-- journey, which is how delivery gets cold.
alter table orders add column if not exists rider_accepted_at  timestamptz;
alter table orders add column if not exists picked_up_at       timestamptz;
alter table orders add column if not exists delivered_at       timestamptz;
-- What the rider actually took at the door. Null until they say. Kept apart
-- from total_kes so "collected less than billed" is visible rather than lost.
alter table orders add column if not exists cash_collected_kes numeric;

create index if not exists idx_orders_rider on orders(rider_id, rider_accepted_at desc);

comment on column orders.rider_accepted_at is
  'A rider claimed this and is on their way to collect. Not orders.accepted_at, which is the restaurant accepting (083).';
comment on column orders.picked_up_at is
  'Rider has the food. status stays ''ready'' — out-for-delivery is derived, see 088.';

-- ─── 4. RLS ───────────────────────────────────────────────────────────────
-- Riders have no auth.users row; they reach the database only through the API
-- with the service role, exactly like POS staff. These policies are for
-- owners reading their own riders from the dashboard.
alter table riders      enable row level security;
alter table rider_menus enable row level security;

drop policy if exists "riders_owner_read" on riders;
create policy "riders_owner_read" on riders for select
  using (
    id in (
      select rm.rider_id from rider_menus rm
      join menus m on m.id = rm.menu_id
      where m.business_id = auth.uid()
    )
  );

drop policy if exists "rider_menus_owner_all" on rider_menus;
create policy "rider_menus_owner_all" on rider_menus for all
  using (menu_id in (select id from menus where business_id = auth.uid()));
