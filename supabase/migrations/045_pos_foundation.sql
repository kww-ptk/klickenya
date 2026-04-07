-- 045_pos_foundation.sql
-- POS-ready schema foundation + item customisation system
-- 4 new tables, 2 ALTERs on existing tables, 6 indexes, RLS on all new tables

-- TABLE 1: restaurant_tables
-- Physical tables in the restaurant. Replaces free-text table_number on orders.
-- pos_x, pos_y, floor_section are dormant until V3 floor map.
create table restaurant_tables (
  id            uuid primary key default gen_random_uuid(),
  menu_id       uuid references menus(id) on delete cascade not null,
  table_number  text not null,         -- display label: "T1", "Bar 3", "Terrace 2"
  capacity      int default 4,
  floor_section text,                  -- "Main Hall", "Terrace", "Bar" — V3
  pos_x         numeric,               -- floor map X — V3
  pos_y         numeric,               -- floor map Y — V3
  is_active     boolean default true,
  display_order int default 0,
  created_at    timestamptz default now(),
  unique(menu_id, table_number)
);

-- TABLE 2: table_sessions
-- One open session per table = the "open bill".
-- Multiple orders accumulate on one session before payment.
-- Dormant in V1 — waiter_id, covers, payment columns all nullable.
-- Activates fully in V2 when persistent billing ships.
create table table_sessions (
  id              uuid primary key default gen_random_uuid(),
  table_id        uuid references restaurant_tables(id) not null,
  menu_id         uuid references menus(id) not null,
  status          text default 'open' check(status in (
                    'open',      -- table occupied, bill growing
                    'billed',    -- bill printed, awaiting payment
                    'paid',      -- payment received, session closed
                    'void'       -- cancelled
                  )),
  covers          int,                  -- number of guests — V2
  waiter_id       uuid,                 -- references staff table — V3
  opened_at       timestamptz default now(),
  billed_at       timestamptz,
  paid_at         timestamptz,
  payment_method  text,                 -- 'cash','mpesa','card' — V2
  mpesa_ref       text,                 -- Daraja transaction ID — V2
  discount_pct    numeric default 0,    -- comp or staff discount — V2
  notes           text,
  created_at      timestamptz default now()
);

-- TABLE 3: item_option_groups
-- Groups of options per menu item. e.g. "Size", "Extras", "Allergens"
create table item_option_groups (
  id            uuid primary key default gen_random_uuid(),
  menu_item_id  uuid references menu_items(id) on delete cascade not null,
  name          text not null,
  group_type    text not null check(group_type in (
                  'single',    -- radio: pick exactly one (e.g. Size)
                  'multi',     -- checkboxes: pick any (e.g. Extras)
                  'allergy'    -- allergy flags: always optional multi, no price
                )),
  is_required   boolean default false,
  min_select    int default 0,
  max_select    int,                   -- null = unlimited
  display_order int default 0,
  created_at    timestamptz default now()
);

-- TABLE 4: item_options
-- Individual choices within a group
create table item_options (
  id               uuid primary key default gen_random_uuid(),
  option_group_id  uuid references item_option_groups(id) on delete cascade not null,
  name             text not null,       -- "Large", "Extra cheese", "Contains nuts"
  price_modifier   numeric default 0,   -- added to base price. Always 0 for allergy type.
  is_available     boolean default true,
  display_order    int default 0
);

-- ALTER orders: add table_id + table_session_id
-- table_number text column stays as fallback for QR orders without registered tables
alter table orders
  add column table_id         uuid references restaurant_tables(id),
  add column table_session_id uuid references table_sessions(id);

-- ALTER order_items: add option snapshot + allergy notes + line total
alter table order_items
  add column selected_options jsonb default '[]',
  -- snapshot format: [{"group":"Size","choice":"Large","price_add":150}]
  -- ALWAYS write at order time, never join back to live options
  add column allergy_notes    text,
  add column line_total       numeric;
  -- line_total = (item_price + sum of price_add in selected_options) × quantity

-- INDEXES
create index on restaurant_tables(menu_id);
create index on table_sessions(table_id);
create index on table_sessions(menu_id, status);
create index on item_option_groups(menu_item_id);
create index on item_options(option_group_id);
create index on orders(table_session_id);

-- RLS: restaurant_tables
alter table restaurant_tables enable row level security;
create policy "owner_all" on restaurant_tables for all
  using (menu_id in (select id from menus where business_id = auth.uid()));
create policy "public_read" on restaurant_tables for select
  using (menu_id in (select id from menus where is_published = true));

-- RLS: table_sessions
alter table table_sessions enable row level security;
create policy "owner_all" on table_sessions for all
  using (menu_id in (select id from menus where business_id = auth.uid()));

-- RLS: item_option_groups
alter table item_option_groups enable row level security;
create policy "owner_all" on item_option_groups for all
  using (menu_item_id in (
    select mi.id from menu_items mi
    join menu_sections ms on ms.id = mi.section_id
    join menus m on m.id = ms.menu_id
    where m.business_id = auth.uid()
  ));
create policy "public_read" on item_option_groups for select
  using (menu_item_id in (
    select mi.id from menu_items mi
    join menu_sections ms on ms.id = mi.section_id
    join menus m on m.id = ms.menu_id
    where m.is_published = true
  ));

-- RLS: item_options (same pattern)
alter table item_options enable row level security;
create policy "owner_all" on item_options for all
  using (option_group_id in (
    select iog.id from item_option_groups iog
    join menu_items mi on mi.id = iog.menu_item_id
    join menu_sections ms on ms.id = mi.section_id
    join menus m on m.id = ms.menu_id
    where m.business_id = auth.uid()
  ));
create policy "public_read" on item_options for select
  using (option_group_id in (
    select iog.id from item_option_groups iog
    join menu_items mi on mi.id = iog.menu_item_id
    join menu_sections ms on ms.id = mi.section_id
    join menus m on m.id = ms.menu_id
    where m.is_published = true
  ));
