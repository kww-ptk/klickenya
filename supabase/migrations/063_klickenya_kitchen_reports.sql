-- 063_klickenya_kitchen_reports.sql
-- V0.3 of Klickenya Kitchen: reports.
--
-- Adds the views + materialised view + helper RPCs that power the
-- reports dashboard, plus one schema addition needed to split COGS by
-- dish: stock_movements.reference_item_id so each auto-deduction row
-- can be attributed back to a specific order_items.id.
--
-- All views set security_invoker so RLS on the underlying tables
-- (stock_movements, ingredients, orders, ...) is enforced when an
-- authenticated user reads through them. Materialised views can't take
-- security_invoker, so we enable RLS directly on the MV.
--
-- Refresh story: mv_dish_margin_30d is refreshed via the RPC
-- refresh_dish_margin_30d(). Wire it to pg_cron in production (one-line
-- doc at the bottom of this file). Until pg_cron is enabled the Reports
-- home page calls the RPC on-demand if the MV is stale.
--
-- Idempotent throughout: drop + recreate views, conditional add column,
-- DO blocks for policies and pg_constraint changes.

-- ============================================================
-- Schema additions
-- ============================================================

-- Per-line attribution for COGS. Nullable: rows written before this
-- migration won't have it; the margin MV falls back to proportional
-- allocation for those rows.
alter table stock_movements
  add column if not exists reference_item_id uuid;

create index if not exists idx_stock_movements_reference_item
  on stock_movements (reference_item_id)
  where reference_item_id is not null;

-- ============================================================
-- Reissue V0.2 deduction triggers to populate reference_item_id
-- ============================================================
-- (Trigger names stay the same; we just CREATE OR REPLACE the function
-- bodies. The triggers attach to whichever function body is current.)

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
  if NEW.status <> 'preparing' or OLD.status = 'preparing' then
    return NEW;
  end if;

  select m.business_id, m.stock_enabled, m.stock_deduct_on
    into v_business_id, v_stock_enabled, v_deduct_on
  from menus m where m.id = NEW.menu_id;

  if v_stock_enabled is not true or v_deduct_on <> 'preparing' then
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
    source, reason, reference_id, reference_type, reference_item_id, created_by
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
    oi.id,                                    -- NEW: per-line attribution
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
    source, reason, reference_id, reference_type, reference_item_id, created_by
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
    oi.id,
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

-- The cancel reversal trigger now copies reference_item_id from the
-- original sale_out so the per-dish margin attribution stays correct.
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
    source, reason, reference_id, reference_type, reference_item_id,
    reversal_of, created_by
  )
  select
    sm.business_id,
    sm.ingredient_id,
    'reversal',
    -sm.qty,
    sm.unit_cost,
    -sm.total_cost,
    sm.source,
    'order_cancelled',
    NEW.id,
    'orders',
    sm.reference_item_id,
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

-- ============================================================
-- VIEW: v_current_stock
-- ============================================================
-- Live stock per ingredient, computed directly from stock_movements
-- (the trigger-cached ingredients.on_hand should always agree, but we
-- treat movements as source of truth).
--
-- days_of_cover divides current_qty by avg daily consumption over the
-- last 14 days. NULL when there's been no consumption — UI renders that
-- as "infinite cover" / no cover info.

drop view if exists v_current_stock;
create view v_current_stock with (security_invoker = true) as
with totals as (
  select
    sm.business_id,
    sm.ingredient_id,
    sum(sm.qty)         as current_qty,
    max(sm.created_at)  as last_movement_at
  from stock_movements sm
  group by sm.business_id, sm.ingredient_id
),
consumption_14d as (
  select
    sm.business_id,
    sm.ingredient_id,
    -1 * sum(sm.qty) / 14.0 as avg_daily_consumption_14d
  from stock_movements sm
  where sm.type = 'sale_out'
    and sm.created_at >= now() - interval '14 days'
  group by sm.business_id, sm.ingredient_id
),
last_sale as (
  select
    sm.ingredient_id,
    max(sm.created_at) as last_sale_at
  from stock_movements sm
  where sm.type = 'sale_out'
  group by sm.ingredient_id
)
select
  i.business_id,
  i.id                                       as ingredient_id,
  i.name                                     as ingredient_name,
  i.unit,
  i.cost_per_unit,
  i.archived,
  i.low_stock_threshold,
  coalesce(t.current_qty, 0)                 as current_qty,
  coalesce(t.current_qty, 0) * i.cost_per_unit as current_value_kes,
  t.last_movement_at,
  l.last_sale_at,
  coalesce(c.avg_daily_consumption_14d, 0)   as avg_daily_consumption_14d,
  case
    when coalesce(c.avg_daily_consumption_14d, 0) > 0
      then coalesce(t.current_qty, 0) / c.avg_daily_consumption_14d
    else null
  end                                        as days_of_cover
from ingredients i
left join totals          t on t.business_id = i.business_id and t.ingredient_id = i.id
left join consumption_14d c on c.business_id = i.business_id and c.ingredient_id = i.id
left join last_sale       l on l.ingredient_id = i.id;

-- ============================================================
-- VIEW: v_consumption_by_ingredient_daily
-- ============================================================

drop view if exists v_consumption_by_ingredient_daily;
create view v_consumption_by_ingredient_daily with (security_invoker = true) as
select
  sm.business_id,
  sm.ingredient_id,
  date_trunc('day', sm.created_at)::date as day,
  -1 * sum(sm.qty)                       as qty_consumed
from stock_movements sm
where sm.type = 'sale_out'
group by sm.business_id, sm.ingredient_id, date_trunc('day', sm.created_at)::date;

-- ============================================================
-- MATERIALISED VIEW: mv_dish_margin_30d
-- ============================================================
-- Per menu_item, last 30 days:
--   revenue       sum of order_items.line_total (or item_price*quantity
--                 if line_total is null on legacy rows)
--   cogs          sum of |sale_out total_cost| attributed to this item
--   portions_sold sum of order_items.quantity
--   margin_kes    revenue - cogs
--   margin_pct    margin / revenue
--   food_cost_pct cogs / revenue
--
-- Attribution: stock_movements with reference_item_id set go directly
-- to that order_item. For movements written before V0.3 (no
-- reference_item_id), we fall back to allocating cogs proportionally
-- across all order_items in the same order using each item's share of
-- the order's revenue. This means historical data is approximate but
-- everything from V0.3 onwards is precise.

drop materialized view if exists mv_dish_margin_30d;
create materialized view mv_dish_margin_30d as
with valid_orders as (
  select o.id as order_id, m.business_id
  from orders o
    join menus m on m.id = o.menu_id
  where o.status in ('preparing','ready','delivered')
    and o.created_at >= now() - interval '30 days'
),
items_in_window as (
  select
    vo.business_id,
    oi.id           as order_item_id,
    oi.order_id,
    oi.menu_item_id,
    oi.quantity,
    coalesce(oi.line_total, oi.item_price * oi.quantity) as line_revenue
  from order_items oi
    join valid_orders vo on vo.order_id = oi.order_id
  where oi.menu_item_id is not null
),
order_revenue_totals as (
  -- Used for proportional fallback only.
  select order_id, sum(line_revenue) as order_revenue
  from items_in_window
  group by order_id
),
attributed_cogs as (
  -- Movements with reference_item_id -> direct attribution.
  select
    iiw.business_id,
    iiw.menu_item_id,
    sum(-1 * sm.total_cost) as cogs
  from stock_movements sm
    join items_in_window iiw on iiw.order_item_id = sm.reference_item_id
  where sm.reference_type = 'orders'
    and sm.type           = 'sale_out'
  group by iiw.business_id, iiw.menu_item_id
),
unattributed_cogs as (
  -- Movements with NULL reference_item_id -> proportional fallback.
  select
    iiw.business_id,
    iiw.menu_item_id,
    sum(
      (-1 * sm.total_cost) *
      case when ort.order_revenue > 0
        then iiw.line_revenue / ort.order_revenue
        else 0
      end
    ) as cogs
  from stock_movements sm
    join valid_orders         vo  on vo.order_id  = sm.reference_id
    join items_in_window      iiw on iiw.order_id = sm.reference_id
    left join order_revenue_totals ort on ort.order_id = sm.reference_id
  where sm.reference_type     = 'orders'
    and sm.type               = 'sale_out'
    and sm.reference_item_id is null
  group by iiw.business_id, iiw.menu_item_id
),
revenue as (
  select
    business_id,
    menu_item_id,
    sum(line_revenue) as revenue,
    sum(quantity)     as portions_sold
  from items_in_window
  group by business_id, menu_item_id
),
combined_cogs as (
  select business_id, menu_item_id, sum(cogs) as cogs from (
    select * from attributed_cogs
    union all
    select * from unattributed_cogs
  ) u
  group by business_id, menu_item_id
)
select
  r.business_id,
  r.menu_item_id,
  mi.name                                  as menu_item_name,
  r.portions_sold,
  r.revenue,
  coalesce(c.cogs, 0)                      as cogs,
  r.revenue - coalesce(c.cogs, 0)          as margin_kes,
  case when r.revenue > 0
    then ((r.revenue - coalesce(c.cogs, 0)) / r.revenue) * 100
    else 0
  end                                      as margin_pct,
  case when r.revenue > 0
    then (coalesce(c.cogs, 0) / r.revenue) * 100
    else 0
  end                                      as food_cost_pct,
  now()                                    as refreshed_at
from revenue r
  join menu_items mi on mi.id = r.menu_item_id
  left join combined_cogs c on c.business_id = r.business_id and c.menu_item_id = r.menu_item_id;

-- Required for REFRESH MATERIALIZED VIEW CONCURRENTLY.
create unique index if not exists ux_mv_dish_margin_30d
  on mv_dish_margin_30d (business_id, menu_item_id);

-- RLS on the materialised view itself (PG 15+).
alter materialized view mv_dish_margin_30d enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='mv_dish_margin_30d' and policyname='mv_dish_margin_30d_owner_read'
  ) then
    create policy "mv_dish_margin_30d_owner_read" on mv_dish_margin_30d
      for select using (business_id = auth.uid());
  end if;
end$$;

grant select on mv_dish_margin_30d to authenticated;

-- Refresh helper. Caller is the menu owner; we use security definer so
-- they don't need REFRESH privilege on the MV. The CONCURRENT refresh
-- avoids locking readers (it only works once the MV has been populated
-- the first time -- the function falls back to non-concurrent on the
-- first call).
create or replace function refresh_dish_margin_30d()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_populated boolean;
begin
  select ispopulated into v_populated
  from pg_matviews
  where schemaname = 'public' and matviewname = 'mv_dish_margin_30d';

  if v_populated then
    refresh materialized view concurrently mv_dish_margin_30d;
  else
    refresh materialized view mv_dish_margin_30d;
  end if;
end;
$$;

revoke all on function refresh_dish_margin_30d() from public;
grant execute on function refresh_dish_margin_30d() to authenticated;

-- ============================================================
-- RPC: fn_variance_report(start, end)
-- ============================================================
-- Per-ingredient cumulative + period figures used by the variance
-- report. Costs the caller one full-table scan of stock_movements; the
-- existing (business_id, created_at desc) index makes this manageable.

create or replace function fn_variance_report(
  p_start  timestamptz,
  p_end    timestamptz
)
returns table (
  ingredient_id     uuid,
  ingredient_name   text,
  unit              text,
  cost_per_unit     numeric,
  starting_count    numeric,
  purchases_in      numeric,
  theoretical_used  numeric,
  expected_end      numeric
)
language sql
security invoker
set search_path = public
as $$
  select
    i.id,
    i.name,
    i.unit,
    i.cost_per_unit,
    coalesce(sum(sm.qty) filter (where sm.created_at < p_start), 0)
                                                              as starting_count,
    coalesce(sum(sm.qty) filter (
      where sm.type = 'purchase_in'
        and sm.created_at >= p_start
        and sm.created_at <  p_end
    ), 0)                                                     as purchases_in,
    coalesce(-sum(sm.qty) filter (
      where sm.type = 'sale_out'
        and sm.created_at >= p_start
        and sm.created_at <  p_end
    ), 0)                                                     as theoretical_used,
    coalesce(sum(sm.qty) filter (where sm.created_at < p_end), 0)
                                                              as expected_end
  from ingredients i
    left join stock_movements sm on sm.ingredient_id = i.id
                                and sm.business_id  = i.business_id
  where i.business_id = auth.uid()
    and i.archived = false
  group by i.id, i.name, i.unit, i.cost_per_unit;
$$;

revoke all on function fn_variance_report(timestamptz, timestamptz) from public;
grant execute on function fn_variance_report(timestamptz, timestamptz) to authenticated;

-- ============================================================
-- RPC: fn_supplier_price_alerts() — month-over-month price changes
-- ============================================================
-- Compares average purchase_in unit_cost in the last 30 days to the
-- prior 30 days, per ingredient. Returns rows where the delta is at
-- least +/- 10%. Used by the supplier-prices report.

create or replace function fn_supplier_price_alerts()
returns table (
  ingredient_id   uuid,
  ingredient_name text,
  unit            text,
  prev_avg_cost   numeric,
  recent_avg_cost numeric,
  delta_pct       numeric
)
language sql
security invoker
set search_path = public
as $$
  with prev as (
    select sm.ingredient_id, avg(sm.unit_cost) as avg_cost
    from stock_movements sm
    where sm.business_id = auth.uid()
      and sm.type = 'purchase_in'
      and sm.unit_cost > 0
      and sm.created_at >= now() - interval '60 days'
      and sm.created_at <  now() - interval '30 days'
    group by sm.ingredient_id
  ),
  recent as (
    select sm.ingredient_id, avg(sm.unit_cost) as avg_cost
    from stock_movements sm
    where sm.business_id = auth.uid()
      and sm.type = 'purchase_in'
      and sm.unit_cost > 0
      and sm.created_at >= now() - interval '30 days'
    group by sm.ingredient_id
  )
  select
    i.id,
    i.name,
    i.unit,
    p.avg_cost,
    r.avg_cost,
    case when p.avg_cost > 0
      then ((r.avg_cost - p.avg_cost) / p.avg_cost) * 100
      else null
    end as delta_pct
  from ingredients i
    join recent r on r.ingredient_id = i.id
    join prev   p on p.ingredient_id = i.id
  where i.business_id = auth.uid()
    and i.archived = false
    and p.avg_cost > 0
    and abs((r.avg_cost - p.avg_cost) / p.avg_cost) >= 0.10
  order by abs((r.avg_cost - p.avg_cost) / p.avg_cost) desc;
$$;

revoke all on function fn_supplier_price_alerts() from public;
grant execute on function fn_supplier_price_alerts() to authenticated;

-- ============================================================
-- Production refresh — pg_cron (manual setup, see notes below)
-- ============================================================
--
-- Once pg_cron is enabled in the Supabase dashboard:
--
--   select cron.schedule(
--     'refresh-dish-margin-30d',
--     '15 2 * * *',                          -- 02:15 every day (UTC)
--     $$select refresh_dish_margin_30d();$$
--   );
--
-- Until then, the Reports home page calls refresh_dish_margin_30d() on
-- demand whenever it loads with no MV rows or stale data.
