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
-- reports, purchase order UI. Those land in V0.1, V0.2, V0.3.
--
-- All tables are scoped by business_id (the menu owner). RLS is owner-only:
-- the authenticated user must equal business_id. Admins can access via
-- service-role (RLS bypassed) -- same pattern as the menu_system tables.
--
-- Idempotent: every CREATE / ALTER / policy / index / trigger uses an
-- IF NOT EXISTS guard or a DO block, so re-running this file after a
-- partial failure is safe.

-- ----- ALTER menus -----------------------------------------------
-- Split into one statement per column to avoid chained-ADD-COLUMN
-- quirks in some SQL editors.
alter table menus add column if not exists stock_enabled boolean not null default false;
alter table menus add column if not exists stock_deduct_on text not null default 'preparing';

-- The CHECK constraint is added separately so the ALTERs above stay
-- minimal and re-runs don't fail on "constraint already exists".
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'menus_stock_deduct_on_check'
  ) then
    alter table menus
      add constraint menus_stock_deduct_on_check
      check (stock_deduct_on in ('placed', 'preparing', 'ready', 'paid'));
  end if;
end$$;

-- ----- TABLE: ingredients ----------------------------------------
create table if not exists ingredients (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid not null references auth.users(id) on delete cascade,
  name                  text not null,
  unit                  text not null,
  cost_per_unit         numeric(12,4) not null default 0,
  default_yield         numeric(5,4)  not null default 1.0000
                          check (default_yield > 0 and default_yield <= 1),
  category              text,
  on_hand               numeric(14,4) not null default 0,
  low_stock_threshold   numeric(14,4),
  archived              boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (business_id, name)
);

-- ----- TABLE: recipes --------------------------------------------
create table if not exists recipes (
  id                    uuid primary key default gen_random_uuid(),
  menu_item_id          uuid not null unique references menu_items(id) on delete cascade,
  business_id           uuid not null references auth.users(id) on delete cascade,
  overhead_pct          numeric(5,2) not null default 5,
  target_food_cost_pct  numeric(5,2) not null default 30,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ----- TABLE: recipe_ingredients ---------------------------------
create table if not exists recipe_ingredients (
  id              uuid primary key default gen_random_uuid(),
  recipe_id       uuid not null references recipes(id) on delete cascade,
  ingredient_id   uuid not null references ingredients(id) on delete restrict,
  ep_qty          numeric(14,4) not null check (ep_qty > 0),
  yield_pct       numeric(5,2)  not null default 100
                    check (yield_pct > 0 and yield_pct <= 100),
  display_order   int not null default 0,
  unique (recipe_id, ingredient_id)
);

-- ----- TABLE: stock_movements ------------------------------------
-- The canonical activity log. Every change to on_hand goes through here:
--   purchase_in        -> manual purchase or PO receipt; qty positive
--   recipe_out         -> auto-deducted when an order is fired (V0.2);   qty negative
--   waste              -> spoilage / spillage / rejected; qty negative
--   count_adjustment   -> physical-count correction; qty signed
--   transfer           -> reserved (multi-location, future)
create table if not exists stock_movements (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references auth.users(id) on delete cascade,
  ingredient_id     uuid not null references ingredients(id) on delete cascade,
  type              text not null check (type in
                       ('purchase_in','recipe_out','waste','count_adjustment','transfer')),
  qty               numeric(14,4) not null,
  unit_cost         numeric(12,4),
  total_cost        numeric(14,4),
  source            text,
  reason            text,
  reference_id      uuid,
  reference_type    text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now()
);

-- ----- TABLE: suppliers ------------------------------------------
create table if not exists suppliers (
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

-- ----- TABLE: purchase_orders ------------------------------------
create table if not exists purchase_orders (
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

-- ----- TABLE: purchase_order_items -------------------------------
create table if not exists purchase_order_items (
  id                  uuid primary key default gen_random_uuid(),
  purchase_order_id   uuid not null references purchase_orders(id) on delete cascade,
  ingredient_id       uuid not null references ingredients(id) on delete restrict,
  qty                 numeric(14,4) not null check (qty > 0),
  unit_cost           numeric(12,4) not null default 0,
  total_cost          numeric(14,4) not null default 0
);

-- ----- INDEXES ---------------------------------------------------
create index if not exists idx_ingredients_business_active
  on ingredients (business_id, name)
  where archived = false;

create index if not exists idx_recipes_business
  on recipes (business_id);

create index if not exists idx_recipe_ingredients_recipe
  on recipe_ingredients (recipe_id);
create index if not exists idx_recipe_ingredients_ingredient
  on recipe_ingredients (ingredient_id);

create index if not exists idx_stock_movements_business_created
  on stock_movements (business_id, created_at desc);
create index if not exists idx_stock_movements_ingredient_created
  on stock_movements (ingredient_id, created_at desc);
create index if not exists idx_stock_movements_business_type_created
  on stock_movements (business_id, type, created_at desc);

create index if not exists idx_suppliers_business_active
  on suppliers (business_id, name)
  where archived = false;

create index if not exists idx_purchase_orders_business_status
  on purchase_orders (business_id, status, created_at desc);

create index if not exists idx_purchase_order_items_po
  on purchase_order_items (purchase_order_id);

-- ----- RLS -------------------------------------------------------
alter table ingredients          enable row level security;
alter table recipes              enable row level security;
alter table recipe_ingredients   enable row level security;
alter table stock_movements      enable row level security;
alter table suppliers            enable row level security;
alter table purchase_orders      enable row level security;
alter table purchase_order_items enable row level security;

-- Policies wrapped in DO blocks so re-running doesn't fail on "policy already exists".
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ingredients' and policyname='ingredients_owner_all') then
    create policy "ingredients_owner_all" on ingredients
      for all using (business_id = auth.uid())
      with check  (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipes' and policyname='recipes_owner_all') then
    create policy "recipes_owner_all" on recipes
      for all using (business_id = auth.uid())
      with check  (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipe_ingredients' and policyname='recipe_ingredients_owner_all') then
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
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='stock_movements' and policyname='stock_movements_owner_all') then
    create policy "stock_movements_owner_all" on stock_movements
      for all using (business_id = auth.uid())
      with check  (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='suppliers' and policyname='suppliers_owner_all') then
    create policy "suppliers_owner_all" on suppliers
      for all using (business_id = auth.uid())
      with check  (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchase_orders' and policyname='purchase_orders_owner_all') then
    create policy "purchase_orders_owner_all" on purchase_orders
      for all using (business_id = auth.uid())
      with check  (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchase_order_items' and policyname='purchase_order_items_owner_all') then
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
  end if;
end$$;

-- ----- on_hand auto-update trigger -------------------------------
-- Every insert into stock_movements updates ingredients.on_hand. This is
-- the single source of truth for stock levels -- never write on_hand directly.
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

drop trigger if exists trg_stock_movements_apply on stock_movements;
create trigger trg_stock_movements_apply
after insert on stock_movements
for each row execute function fn_apply_stock_movement();

-- ----- updated_at trigger (shared) -------------------------------
create or replace function fn_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ingredients_updated_at on ingredients;
create trigger trg_ingredients_updated_at
before update on ingredients
for each row execute function fn_touch_updated_at();

drop trigger if exists trg_recipes_updated_at on recipes;
create trigger trg_recipes_updated_at
before update on recipes
for each row execute function fn_touch_updated_at();

drop trigger if exists trg_suppliers_updated_at on suppliers;
create trigger trg_suppliers_updated_at
before update on suppliers
for each row execute function fn_touch_updated_at();

drop trigger if exists trg_purchase_orders_updated_at on purchase_orders;
create trigger trg_purchase_orders_updated_at
before update on purchase_orders
for each row execute function fn_touch_updated_at();

-- ----- Realtime --------------------------------------------------
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
