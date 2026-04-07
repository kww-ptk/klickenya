-- 043_orders.sql
-- V1 table ordering — orders and order_items tables
--
-- Design notes:
--   • order_items stores SNAPSHOTS of name/price at order time — never join back
--     to live menu_items for display, because items may be edited or deleted.
--   • mpesa_ref, delivery_* columns are nullable stubs for V2/V3.
--   • anon INSERT is intentional — guests place orders without auth.
--   • Only the business owner can read and update their own menus' orders.

-- ─── TABLE 1: orders ─────────────────────────────────────────────
create table orders (
  id               uuid primary key default gen_random_uuid(),
  menu_id          uuid references menus(id) not null,
  order_type       text not null
                     check(order_type in ('dine_in','takeaway','delivery')),
  status           text not null default 'new'
                     check(status in ('new','preparing','ready','delivered','cancelled')),
  table_number     text,
  customer_name    text,
  customer_phone   text,
  subtotal_kes     numeric,
  delivery_fee_kes numeric default 0,
  total_kes        numeric,
  payment_status   text not null default 'pending'
                     check(payment_status in ('pending','paid','failed')),
  -- V2: M-Pesa Daraja transaction ID (nullable until payment is wired)
  mpesa_ref        text,
  -- V3: delivery fields (nullable until delivery is enabled)
  delivery_address text,
  delivery_lat     numeric,
  delivery_lng     numeric,
  notes            text,
  created_at       timestamptz default now()
);

-- ─── TABLE 2: order_items ─────────────────────────────────────────
create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references orders(id) on delete cascade not null,
  -- nullable: the menu item may be edited or deleted after the order is placed
  menu_item_id uuid references menu_items(id) on delete set null,
  -- SNAPSHOTS — these must be recorded at order time and never recalculated
  item_name    text not null,
  item_price   numeric not null,
  quantity     int not null default 1 check(quantity > 0),
  notes        text
);

-- ─── INDEXES ─────────────────────────────────────────────────────
create index idx_orders_menu_status   on orders(menu_id, status);
create index idx_orders_menu_created  on orders(menu_id, created_at desc);
create index idx_order_items_order_id on order_items(order_id);

-- ─── RLS ─────────────────────────────────────────────────────────
alter table orders      enable row level security;
alter table order_items enable row level security;

-- orders: anyone can insert (guests place orders without auth)
create policy "orders_anon_insert" on orders
  for insert with check (true);

-- orders: business owner can read all orders for their menus
create policy "orders_owner_select" on orders
  for select using (
    exists (
      select 1 from menus
      where menus.id = orders.menu_id
        and menus.business_id = auth.uid()
    )
  );

-- orders: business owner can update orders (e.g. change status)
create policy "orders_owner_update" on orders
  for update using (
    exists (
      select 1 from menus
      where menus.id = orders.menu_id
        and menus.business_id = auth.uid()
    )
  );

-- order_items: business owner can read items for their menus' orders
create policy "order_items_owner_select" on order_items
  for select using (
    exists (
      select 1 from orders
        join menus on menus.id = orders.menu_id
      where orders.id = order_items.order_id
        and menus.business_id = auth.uid()
    )
  );

-- order_items: anyone can insert (inserted server-side alongside the order)
create policy "order_items_anon_insert" on order_items
  for insert with check (true);
