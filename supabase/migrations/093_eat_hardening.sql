-- 093_eat_hardening.sql
-- Findings from the 14 Sep 2026 review of the food-delivery product.

-- 1. The anonymous insert policies from 043 were never used by the app —
--    every write goes through the service role — and they let anyone holding
--    the public anon key write arbitrary orders, including "delivered" ones
--    with invented payouts and a rider of their choosing. Drop them.
drop policy if exists "orders_anon_insert" on orders;
drop policy if exists "order_items_anon_insert" on order_items;

-- 2. Handover-code brute force. A rider who has accepted a job could loop
--    the 9,000 possible codes in seconds. Five wrong codes lock pickup on
--    that order for 15 minutes.
alter table orders add column if not exists pickup_attempts int not null default 0;
alter table orders add column if not exists pickup_locked_until timestamptz;

-- 3. Staff-PIN brute force. restaurant_staff PINs are looked up by
--    (menu_id, pin), so a failure cannot be attributed to one staff row; the
--    lock lives on the menu. Ten wrong PINs lock sign-in for 10 minutes.
alter table menus add column if not exists pos_failed_attempts int not null default 0;
alter table menus add column if not exists pos_locked_until timestamptz;

-- 4. /admin/eat reads delivery + takeaway orders by date with no menu filter.
--    Nothing served that scan.
create index if not exists idx_orders_type_created
  on orders (order_type, created_at desc)
  where order_type in ('delivery', 'takeaway');

-- 5. Every /manage page resolves the menu by listing_slug; it had no index.
create index if not exists idx_menus_listing_slug on menus (listing_slug);
