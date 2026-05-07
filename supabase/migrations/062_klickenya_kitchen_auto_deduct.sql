-- 062_klickenya_kitchen_auto_deduct.sql
-- V0.2 of Klickenya Kitchen: auto-deduction triggers.
--
-- Closes the loop. When a chef moves an order to 'preparing' (or
-- 'delivered', if the menu opted in to that), stock falls automatically.
-- Cancelling that order writes append-only reversal rows.
--
-- Schema additions in this migration:
--   - stock_movements.reversal_of (uuid, FK to stock_movements.id)
--   - stock_movements.type adds 'sale_out' and 'reversal'
--   - recipe_ingredients.variant_option_id (nullable FK to item_options)
--   - menus.stock_deduct_on adds 'delivered'
--
-- Naming note: the spec calls the source columns source_table / source_id.
-- The actual columns from 060 are reference_type / reference_id with the
-- same semantics. We use them as: reference_type = 'orders', reference_id
-- = orders.id. Keeping the 060 names instead of adding parallel columns.

-- ----- stock_movements: type values + reversal_of ----------------
do $$
declare v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'public.stock_movements'::regclass
    and contype  = 'c'
    and pg_get_constraintdef(oid) ilike '%purchase_in%';
  if v_conname is not null then
    execute format('alter table stock_movements drop constraint %I', v_conname);
  end if;
  alter table stock_movements
    add constraint stock_movements_type_check
    check (type in (
      'purchase_in',
      'recipe_out',     -- legacy alias kept so older code keeps working
      'sale_out',       -- the canonical V0.2 name; chef cooks, stock drops
      'waste',
      'count_adjustment',
      'transfer',
      'reversal'
    ));
end$$;

alter table stock_movements
  add column if not exists reversal_of uuid references stock_movements(id) on delete set null;

create index if not exists idx_stock_movements_reversal_of
  on stock_movements (reversal_of)
  where reversal_of is not null;

-- ----- menus.stock_deduct_on: add 'delivered' --------------------
do $$
declare v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'public.menus'::regclass
    and contype  = 'c'
    and pg_get_constraintdef(oid) ilike '%stock_deduct_on%';
  if v_conname is not null then
    execute format('alter table menus drop constraint %I', v_conname);
  end if;
  alter table menus
    add constraint menus_stock_deduct_on_check
    check (stock_deduct_on in ('placed','preparing','ready','paid','delivered'));
end$$;

-- ----- recipe_ingredients.variant_option_id ----------------------
-- Nullable: NULL means "this row applies to every order of this menu item"
-- (i.e. base ingredient). Non-null means "this row only applies when the
-- order chose this option" (i.e. variant ingredient -- e.g. extra cheese).
alter table recipe_ingredients
  add column if not exists variant_option_id uuid
    references item_options(id) on delete cascade;

create index if not exists idx_recipe_ingredients_variant
  on recipe_ingredients (variant_option_id)
  where variant_option_id is not null;

-- =================================================================
-- TRIGGER FUNCTION 1: fn_deduct_stock_on_preparing
-- =================================================================
-- Fires on UPDATE OF status WHERE NEW.status='preparing' AND OLD.status<>'preparing'.
-- Skips silently if:
--   - the menu has stock_enabled = false
--   - the menu's stock_deduct_on != 'preparing'
--   - the order has already had stock deducted (idempotency: prevents
--     double-deduction on ready -> preparing or cancelled -> preparing
--     status bounces)
--
-- Walks every order_item, joins to recipe_ingredients, inserts one
-- 'sale_out' movement per ingredient. Menu items without a recipe simply
-- don't appear in the join -- silently skipped (the missing-recipes
-- report surfaces them so the owner can fix later).
--
-- AP qty math:
--   ep_qty / (yield_pct/100) * order_item.quantity
-- multiplied by -1 because OUT movements are negative.

create or replace function fn_deduct_stock_on_preparing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id    uuid;
  v_stock_enabled  boolean;
  v_deduct_on      text;
begin
  -- Cheap gate first
  if NEW.status <> 'preparing' or OLD.status = 'preparing' then
    return NEW;
  end if;

  select m.business_id, m.stock_enabled, m.stock_deduct_on
    into v_business_id, v_stock_enabled, v_deduct_on
  from menus m where m.id = NEW.menu_id;

  if v_stock_enabled is not true or v_deduct_on <> 'preparing' then
    return NEW;
  end if;

  -- Idempotency: if any non-reversed sale_out exists for this order, bail.
  if exists (
    select 1 from stock_movements sm
    where sm.reference_type = 'orders'
      and sm.reference_id   = NEW.id
      and sm.type           = 'sale_out'
      and not exists (select 1 from stock_movements r where r.reversal_of = sm.id)
  ) then
    return NEW;
  end if;

  insert into stock_movements (
    business_id, ingredient_id, type, qty, unit_cost, total_cost,
    source, reason, reference_id, reference_type, created_by
  )
  select
    v_business_id,
    ri.ingredient_id,
    'sale_out',
    -1 * (ri.ep_qty / (ri.yield_pct / 100.0)) * oi.quantity,
    i.cost_per_unit,
    -1 * (ri.ep_qty / (ri.yield_pct / 100.0)) * oi.quantity * i.cost_per_unit,
    'auto_recipe',
    null,
    NEW.id,
    'orders',
    null
  from order_items oi
    join recipes            r  on r.menu_item_id = oi.menu_item_id
    join recipe_ingredients ri on ri.recipe_id    = r.id
    join ingredients        i  on i.id            = ri.ingredient_id
  where oi.order_id = NEW.id
    and (
      -- Base ingredient (always deducted) OR variant ingredient where the
      -- chosen option appears in the order_item's selected_options snapshot.
      ri.variant_option_id is null
      or exists (
        select 1
        from item_options       io
        join item_option_groups iog on iog.id = io.option_group_id
        cross join lateral jsonb_array_elements(coalesce(oi.selected_options, '[]'::jsonb)) so
        where io.id = ri.variant_option_id
          and so->>'group'  = iog.name
          and so->>'choice' = io.name
      )
    );

  return NEW;
end;
$$;

drop trigger if exists trg_orders_deduct_on_preparing on orders;
create trigger trg_orders_deduct_on_preparing
after update of status on orders
for each row execute function fn_deduct_stock_on_preparing();

-- =================================================================
-- TRIGGER FUNCTION 2: fn_reverse_stock_on_cancel
-- =================================================================
-- Fires on transitions INTO 'cancelled' from any status.
-- For every active (not-yet-reversed) sale_out row pointing at this order,
-- inserts a single 'reversal' row with qty = -original.qty (positive),
-- referencing the original via reversal_of. APPEND-ONLY: never UPDATE or
-- DELETE the original row. Audit lives in history.
--
-- The trigger fn_apply_stock_movement (from 060) lifts on_hand for free
-- because it operates on the signed qty.

create or replace function fn_reverse_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.status <> 'cancelled' or OLD.status = 'cancelled' then
    return NEW;
  end if;

  insert into stock_movements (
    business_id, ingredient_id, type, qty, unit_cost, total_cost,
    source, reason, reference_id, reference_type, reversal_of, created_by
  )
  select
    sm.business_id,
    sm.ingredient_id,
    'reversal',
    -sm.qty,                         -- flip the sign: out becomes in
    sm.unit_cost,                    -- preserve historical cost
    -sm.total_cost,
    sm.source,
    'order_cancelled',
    NEW.id,
    'orders',
    sm.id,
    null
  from stock_movements sm
  where sm.reference_type = 'orders'
    and sm.reference_id   = NEW.id
    and sm.type           = 'sale_out'
    and not exists (
      select 1 from stock_movements r where r.reversal_of = sm.id
    );

  return NEW;
end;
$$;

drop trigger if exists trg_orders_reverse_on_cancel on orders;
create trigger trg_orders_reverse_on_cancel
after update of status on orders
for each row execute function fn_reverse_stock_on_cancel();

-- =================================================================
-- TRIGGER FUNCTION 3: fn_deduct_stock_on_delivered
-- =================================================================
-- Mirror of fn_deduct_stock_on_preparing. Fires on transitions INTO
-- 'delivered' from any other status. Used when menus.stock_deduct_on =
-- 'delivered' (the alternative path; some venues only want to count
-- consumption when the food actually leaves the kitchen).

create or replace function fn_deduct_stock_on_delivered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id    uuid;
  v_stock_enabled  boolean;
  v_deduct_on      text;
begin
  if NEW.status <> 'delivered' or OLD.status = 'delivered' then
    return NEW;
  end if;

  select m.business_id, m.stock_enabled, m.stock_deduct_on
    into v_business_id, v_stock_enabled, v_deduct_on
  from menus m where m.id = NEW.menu_id;

  if v_stock_enabled is not true or v_deduct_on <> 'delivered' then
    return NEW;
  end if;

  if exists (
    select 1 from stock_movements sm
    where sm.reference_type = 'orders'
      and sm.reference_id   = NEW.id
      and sm.type           = 'sale_out'
      and not exists (select 1 from stock_movements r where r.reversal_of = sm.id)
  ) then
    return NEW;
  end if;

  insert into stock_movements (
    business_id, ingredient_id, type, qty, unit_cost, total_cost,
    source, reason, reference_id, reference_type, created_by
  )
  select
    v_business_id,
    ri.ingredient_id,
    'sale_out',
    -1 * (ri.ep_qty / (ri.yield_pct / 100.0)) * oi.quantity,
    i.cost_per_unit,
    -1 * (ri.ep_qty / (ri.yield_pct / 100.0)) * oi.quantity * i.cost_per_unit,
    'auto_recipe',
    null,
    NEW.id,
    'orders',
    null
  from order_items oi
    join recipes            r  on r.menu_item_id = oi.menu_item_id
    join recipe_ingredients ri on ri.recipe_id    = r.id
    join ingredients        i  on i.id            = ri.ingredient_id
  where oi.order_id = NEW.id
    and (
      ri.variant_option_id is null
      or exists (
        select 1
        from item_options       io
        join item_option_groups iog on iog.id = io.option_group_id
        cross join lateral jsonb_array_elements(coalesce(oi.selected_options, '[]'::jsonb)) so
        where io.id = ri.variant_option_id
          and so->>'group'  = iog.name
          and so->>'choice' = io.name
      )
    );

  return NEW;
end;
$$;

drop trigger if exists trg_orders_deduct_on_delivered on orders;
create trigger trg_orders_deduct_on_delivered
after update of status on orders
for each row execute function fn_deduct_stock_on_delivered();

-- =================================================================
-- HELPER: count menu items that are missing a usable recipe
-- =================================================================
-- "Missing" = either no recipe row OR a recipe with zero ingredients.
-- Used by the missing-recipes report page and the stock home banner.
-- security invoker so RLS gates which menu items the caller can see.

create or replace function fn_count_missing_recipes(p_menu_id uuid)
returns int
language sql
security invoker
set search_path = public
as $$
  select count(*)::int
  from menu_items mi
    join menu_sections ms on ms.id = mi.section_id
  where ms.menu_id = p_menu_id
    and (
      not exists (select 1 from recipes r where r.menu_item_id = mi.id)
      or not exists (
        select 1
        from recipes r
          join recipe_ingredients ri on ri.recipe_id = r.id
        where r.menu_item_id = mi.id
      )
    );
$$;

revoke all on function fn_count_missing_recipes(uuid) from public;
grant execute on function fn_count_missing_recipes(uuid) to authenticated;
