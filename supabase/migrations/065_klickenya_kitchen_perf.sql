-- 065_klickenya_kitchen_perf.sql
-- Speed pass: closes the three biggest gaps the audit found.
--
-- 1. Index on stock_movements (reference_id) WHERE reference_type='orders'.
--    The auto-deduction triggers (062) and the fallback path of
--    mv_dish_margin_30d (063) both run EXISTS / JOIN on
--    (reference_type='orders', reference_id=...). With no leading-column
--    index on these, every order status change does a sequential scan of
--    stock_movements. Partial index keeps the footprint small.
--
-- 2. fn_ingredient_sums_at(ingredient_ids, at) RPC. The variance "Save
--    as count" handler used to fetch every row of (ingredient_id, qty)
--    up to count_at and reduce in JS. With months of history that's
--    thousands of rows shipped over the wire just to compute one sum
--    per ingredient. RPC lets Postgres do the GROUP BY.
--
-- 3. kitchen_mv_meta(name, refreshed_at). The margin page used to call
--    refresh_dish_margin_30d() every time it found no rows for the
--    caller's business -- which is wrong twice over: the MV might have
--    been populated for OTHER businesses, and a fresh business naturally
--    has no rows yet. The new pattern: page checks last-refreshed time
--    and only triggers refresh if older than 1 hour (or never).
--
-- All idempotent.

-- ----- 1. Index for orders-linked stock_movements -----------------
create index if not exists idx_stock_movements_order_ref
  on stock_movements (reference_id)
  where reference_type = 'orders';

-- ----- 2. Server-side ingredient sums up to a timestamp -----------
-- Used by /api/stock/variance to compute expected_end without round-
-- tripping every movement to the app server. security invoker so RLS
-- still scopes to the caller's business.

create or replace function fn_ingredient_sums_at(
  p_ingredient_ids  uuid[],
  p_at              timestamptz
)
returns table (ingredient_id uuid, total_qty numeric)
language sql
security invoker
set search_path = public
as $$
  select sm.ingredient_id, coalesce(sum(sm.qty), 0)::numeric
  from stock_movements sm
  where sm.ingredient_id = any(p_ingredient_ids)
    and sm.created_at   < p_at
  group by sm.ingredient_id;
$$;

revoke all on function fn_ingredient_sums_at(uuid[], timestamptz) from public;
grant execute on function fn_ingredient_sums_at(uuid[], timestamptz) to authenticated;

-- ----- 3. Materialised-view refresh log + helper ------------------

create table if not exists kitchen_mv_meta (
  name          text primary key,
  refreshed_at  timestamptz not null default now()
);

-- Anyone can read the meta (it just says "the MV was refreshed at X")
-- but writes go through the refresh function (security definer).
alter table kitchen_mv_meta enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'kitchen_mv_meta'
      and policyname = 'kitchen_mv_meta_read_all'
  ) then
    create policy "kitchen_mv_meta_read_all" on kitchen_mv_meta
      for select using (true);
  end if;
end$$;

grant select on kitchen_mv_meta to authenticated;

-- Replace refresh_dish_margin_30d so it stamps the meta row on success.
-- Same body as 063 plus the upsert at the end.
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

  insert into kitchen_mv_meta (name, refreshed_at)
  values ('mv_dish_margin_30d', now())
  on conflict (name) do update set refreshed_at = now();
end;
$$;

revoke all on function refresh_dish_margin_30d() from public;
grant execute on function refresh_dish_margin_30d() to authenticated;
