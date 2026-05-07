-- 060_klickenya_kitchen.sql
-- V0 of the Klickenya Kitchen stock add-on.
--
-- Scope of V0 (this migration):
--   - ingredients pantry per business
--   - recipes (one per menu_item) and recipe_ingredients
--   - stock_movements (the canonical activity log; everything else writes here)
--   - suppliers + purchase_orders + purchase_order_items (schema only;
--     no UI in V0, but having the tables now means a future migration
--     does not have to touch FK chains again)
--   - menus.stock_enabled / menus.stock_deduct_on flags
--
-- NOT in this migration: auto-deduction trigger on order_items, importer,
-- reports, purchase order UI. Those land in V0.1 → V0.3.
--
-- All tables are scoped by business_id (the menu owner). RLS is "owner-only":
-- the authenticated user must equal business_id. Admins can access via
-- service-role (RLS bypassed) — same pattern as the menu_system tables.

-- ─── ALTER menus ────────────────────────────────────────────────
alter table menus
  add column if not exists stock_enabled    boolean not null default false,
  add column if not exists stock_deduct_on  text    not null default 'preparing'
    check (stock_deduct_on in ('placed', 'preparing', 'ready', 'paid'));

-- ─── TABLE: ingredients ─────────────────────────────────────────
create table ingredients (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid not null references auth.users(id) on delete cascade,
  name                  text not null,
  unit                  text not null,                          -- g, kg, ml, l, pcs, ea, tbsp …
  cost_per_unit         numeric(12,4) not null default 0,        -- KES per `unit`
  default_yield         numeric(5,4)  not null default 1.0000    -- 1.0 = 100% (i.e. EP = AP)
                          check (default_yield > 0 and default_yield <= 1),
  category              text,                                    -- Produce, Meat, Dairy, Dry, Bev, Other
  on_hand               numeric(14,4) not null default 0,        -- live stock level (driven by movements)
  low_stock_threshold   numeric(14,4),
  archived              boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (business_id, name)
);

-- ─── TABLE: recipes ─────────────────────────────────────────────
create table recipes (
  id                    uuid primary key default gen_random_uuid(),
  menu_item_id          uuid not null unique references menu_items(id) on delete cascade,
  business_id           uuid not null references auth.users(id) on delete cascade,
  overhead_pct          numeric(5,2) not null default 5,         -- percent applied on top of ingredient cost
  target_food_cost_pct  numeric(5,2) not null default 30,        -- used to compute "suggested SP"
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─── TABLE: recipe_ingredients ──────────────────────────────────
create table recipe_ingredients (
  id              uuid primary key default gen_random_uuid(),
  recipe_id       uuid not null references recipes(id) on delete cascade,
  ingredient_id   uuid not null references ingredients(id) on delete restrict,
  ep_qty          numeric(14,4) not null check (ep_qty > 0),     -- edible-portion qty (already trimmed/cooked basis)
  yield_pct       numeric(5,2)  not null default 100             -- override of ingredient.default_yield (in %)
                    check (yield_pct > 0 and yield_pct <= 100),
  display_order   int not null default 0,
  unique (recipe_id, ingredient_id)
);

-- ─── TABLE: stock_movements ─────────────────────────────────────
-- The canonical activity log. Every change to on_hand goes through here:
--   purchase_in        → manual purchase or PO receipt; qty positive
--   recipe_out         → auto-deducted when an order is fired (V0.2);   qty negative
--   waste              → spoilage / spillage / rejected; qty negative
--   count_adjustment   → physical-count correction; qty signed
--   transfer           → reserved (multi-location, future)
create table stock_movements (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references auth.users(id) on delete cascade,
  ingredient_id     uuid not null references ingredients(id) on delete cascade,
  type              text not null check (type in
                       ('purchase_in','recipe_out','waste','count_adjustment','transfer')),
  qty               numeric(14,4) not null,                      -- signed: + adds, − removes
  unit_cost         numeric(12,4),                               -- KES at the moment of movement
  total_cost        numeric(14,4),                               -- = qty * unit_cost (cached for activity feed)
  source            text,                                        -- 'manual', 'purchase_order', 'auto_recipe', 'count'
  reason            text,                                        -- free-text note from owner
  reference_id      uuid,                                        -- e.g. purchase_order_id, order_item_id
  reference_type    text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now()
);

-- ─── TABLE: suppliers ───────────────────────────────────────────
create table suppliers (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  phone         text,
  email         text,
  notes         text,
  archived      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── TABLE: purchase_orders ─────────────────────────────────────
create table purchase_orders (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references auth.users(id) on delete cascade,
  supplier_id   uuid references suppliers(id) on delete set null,
  status        text not null default 'draft'
                  check (status in ('draft','sent','received','cancelled')),
  ordered_at    timestamptz,
  received_at   timestamptz,
  total_kes     numeric(14,2) not null default 0,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── TABLE: purchase_order_items ────────────────────────────────
create table purchase_order_items (
  id                  uuid primary key default gen_random_uuid(),
  purchase_order_id   uuid not null references purchase_orders(id) on delete cascade,
  ingredient_id       uuid not null references ingredients(id) on delete restrict,
  qty                 numeric(14,4) not null check (qty > 0),
  unit_cost           numeric(12,4) not null default 0,
  total_cost          numeric(14,4) not null default 0
);

-- ─── INDEXES ────────────────────────────────────────────────────
-- Pantry lookups (filter out archived in the most common list query)
create index idx_ingredients_business_active
  on ingredients (business_id, name)
  where archived = false;

-- Recipes are looked up by menu_item; menu_item_id is already unique-indexed.
create index idx_recipes_business on recipes (business_id);

create index idx_recipe_ingredients_recipe   on recipe_ingredients (recipe_id);
create index idx_recipe_ingredients_ingredient on recipe_ingredients (ingredient_id);

-- Activity feed: most common query is "give me this business's last 50 movements".
create index idx_stock_movements_business_created
  on stock_movements (business_id, created_at desc);
-- Per-ingredient timeline (drilldown).
create index idx_stock_movements_ingredient_created
  on stock_movements (ingredient_id, created_at desc);
-- Filter by type (e.g. all wastage this month).
create index idx_stock_movements_business_type_created
  on stock_movements (business_id, type, created_at desc);

create index idx_suppliers_business_active
  on suppliers (business_id, name)
  where archived = false;

create index idx_purchase_orders_business_status
  on purchase_orders (business_id, status, created_at desc);

create index idx_purchase_order_items_po
  on purchase_order_items (purchase_order_id);

-- ─── RLS ────────────────────────────────────────────────────────
alter table ingredients          enable row level security;
alter table recipes              enable row level security;
alter table recipe_ingredients   enable row level security;
alter table stock_movements      enable row level security;
alter table suppliers            enable row level security;
alter table purchase_orders      enable row level security;
alter table purchase_order_items enable row level security;

-- ingredients: owner-only
create policy "ingredients_owner_all" on ingredients
  for all using (business_id = auth.uid())
  with check  (business_id = auth.uid());

-- recipes: owner-only (business_id is denormalised for fast RLS)
create policy "recipes_owner_all" on recipes
  for all using (business_id = auth.uid())
  with check  (business_id = auth.uid());

-- recipe_ingredients: gated through parent recipe
create policy "recipe_ingredients_owner_all" on recipe_ingredients
  for all using (
    exists (
      select 1 from recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.business_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.business_id = auth.uid()
    )
  );

-- stock_movements: owner-only
create policy "stock_movements_owner_all" on stock_movements
  for all using (business_id = auth.uid())
  with check  (business_id = auth.uid());

-- suppliers: owner-only
create policy "suppliers_owner_all" on suppliers
  for all using (business_id = auth.uid())
  with check  (business_id = auth.uid());

-- purchase_orders: owner-only
create policy "purchase_orders_owner_all" on purchase_orders
  for all using (business_id = auth.uid())
  with check  (business_id = auth.uid());

-- purchase_order_items: gated through parent PO
create policy "purchase_order_items_owner_all" on purchase_order_items
  for all using (
    exists (
      select 1 from purchase_orders
      where purchase_orders.id = purchase_order_items.purchase_order_id
        and purchase_orders.business_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from purchase_orders
      where purchase_orders.id = purchase_order_items.purchase_order_id
        and purchase_orders.business_id = auth.uid()
    )
  );

-- ─── on_hand auto-update trigger ────────────────────────────────
-- Every insert into stock_movements updates ingredients.on_hand. This is the
-- single source of truth for stock levels — never write on_hand directly.
create or replace function fn_apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update ingredients
     set on_hand    = on_hand + new.qty,
         updated_at = now()
   where id = new.ingredient_id
     and business_id = new.business_id;
  return new;
end;
$$;

create trigger trg_stock_movements_apply
after insert on stock_movements
for each row execute function fn_apply_stock_movement();

-- ─── updated_at trigger (shared) ────────────────────────────────
create or replace function fn_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_ingredients_updated_at
before update on ingredients
for each row execute function fn_touch_updated_at();

create trigger trg_recipes_updated_at
before update on recipes
for each row execute function fn_touch_updated_at();

create trigger trg_suppliers_updated_at
before update on suppliers
for each row execute function fn_touch_updated_at();

create trigger trg_purchase_orders_updated_at
before update on purchase_orders
for each row execute function fn_touch_updated_at();

-- ─── Realtime ───────────────────────────────────────────────────
-- The activity feed (/dashboard/menu/[id]/stock/movements) subscribes to this.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'stock_movements'
  ) then
    execute 'alter publication supabase_realtime add table public.stock_movements';
  end if;
end$$;
