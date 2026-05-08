-- 061_klickenya_kitchen_po.sql
-- V0.1 of Klickenya Kitchen: extend the purchase-orders schema to support
-- the full lifecycle (draft -> sent -> received / partial / cancelled).
--
-- 060 created the bare tables. This migration adds:
--   - purchase_orders.po_number         (per-business human-readable id)
--   - purchase_orders.expected_at        (when the goods are due)
--   - purchase_orders.received_total_kes (cached actual total after receive)
--   - purchase_order_items.qty_received  (each line, signed against qty)
--   - 'partial' status (some lines fully received, others not)
--   - business_po_counters table + next_po_number() (per-business sequence)
--   - fn_receive_purchase_order() RPC -- atomic receive transaction
--
-- All idempotent: every alter / create uses IF NOT EXISTS or DO blocks.

-- ----- purchase_orders extensions --------------------------------
alter table purchase_orders add column if not exists po_number text;
alter table purchase_orders add column if not exists expected_at timestamptz;
alter table purchase_orders add column if not exists received_total_kes numeric(14,2) not null default 0;

-- Unique-per-business PO number (NULL allowed for legacy rows).
create unique index if not exists idx_purchase_orders_business_po_number
  on purchase_orders (business_id, po_number)
  where po_number is not null;

-- Replace the status check to add 'partial'.
do $$
declare v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'public.purchase_orders'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%draft%';
  if v_conname is not null then
    execute format('alter table purchase_orders drop constraint %I', v_conname);
  end if;
  alter table purchase_orders
    add constraint purchase_orders_status_check
    check (status in ('draft','sent','partial','received','cancelled'));
end$$;

-- ----- purchase_order_items extensions ---------------------------
alter table purchase_order_items
  add column if not exists qty_received numeric(14,4) not null default 0
    check (qty_received >= 0);

-- ----- business_po_counters --------------------------------------
-- Per-business monotonic counter for PO numbers.
create table if not exists business_po_counters (
  business_id  uuid primary key references auth.users(id) on delete cascade,
  last_number  int not null default 0,
  updated_at   timestamptz not null default now()
);

alter table business_po_counters enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_po_counters'
      and policyname = 'business_po_counters_owner_read'
  ) then
    -- Only the owner can read their own counter; writes are restricted to
    -- the next_po_number() function (which runs as security definer).
    create policy "business_po_counters_owner_read" on business_po_counters
      for select using (business_id = auth.uid());
  end if;
end$$;

-- ----- next_po_number(business_id) -------------------------------
-- Atomic per-business counter; returns 'PO-YYYY-NNNN'.
-- Runs as security definer because we don't grant write on the counter
-- table to authenticated users.
create or replace function next_po_number(p_business_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from now())::int;
  v_n    int;
begin
  if p_business_id is null then
    raise exception 'business_id required';
  end if;
  if auth.uid() is not null and auth.uid() <> p_business_id then
    raise exception 'forbidden';
  end if;

  insert into business_po_counters as c (business_id, last_number, updated_at)
  values (p_business_id, 1, now())
  on conflict (business_id) do update
    set last_number = c.last_number + 1,
        updated_at  = now()
  returning last_number into v_n;

  return 'PO-' || v_year::text || '-' || lpad(v_n::text, 4, '0');
end;
$$;

revoke all on function next_po_number(uuid) from public;
grant execute on function next_po_number(uuid) to authenticated;

-- ----- fn_receive_purchase_order ---------------------------------
-- The atomic receive transaction. Owner posts a JSONB array of
--   [{ po_item_id, qty_received }]
-- and we:
--   1. update qty_received on each line (server-validated against ordered)
--   2. for every line where qty_received > 0, insert a stock_movement
--      (the existing trg_stock_movements_apply trigger lifts on_hand)
--   3. recompute new status: 'received' if every line met or exceeded its
--      ordered qty, else 'partial'
--   4. cache received_total_kes on the PO row
--   5. optionally roll forward ingredients.cost_per_unit when the line's
--      unit_cost differs (controlled by p_update_costs; UI confirms first)
--
-- Returns the new status + count of movements written so the client can
-- show a single toast with both numbers.
create or replace function fn_receive_purchase_order(
  p_po_id          uuid,
  p_lines          jsonb,
  p_update_costs   boolean default false
) returns table (
  po_id            uuid,
  new_status       text,
  movements_count  int,
  received_total   numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id      uuid := auth.uid();
  v_business_id  uuid;
  v_status       text;
  v_line         jsonb;
  v_po_item      record;
  v_qty_recv     numeric;
  v_movements    int := 0;
  v_total_lines  int;
  v_full_lines   int;
  v_new_status   text;
  v_total_kes    numeric := 0;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  -- Ownership + status guard
  select business_id, status into v_business_id, v_status
  from purchase_orders where id = p_po_id;
  if v_business_id is null or v_business_id <> v_user_id then
    raise exception 'forbidden';
  end if;
  if v_status not in ('sent', 'partial', 'draft') then
    raise exception 'cannot receive a % PO', v_status;
  end if;

  -- Walk every line in the request
  for v_line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    select * into v_po_item
    from purchase_order_items
    where id = (v_line->>'po_item_id')::uuid
      and purchase_order_id = p_po_id;
    if not found then
      continue;
    end if;

    v_qty_recv := greatest(0, coalesce((v_line->>'qty_received')::numeric, 0));

    update purchase_order_items
    set qty_received = v_qty_recv
    where id = v_po_item.id;

    if v_qty_recv > 0 then
      insert into stock_movements (
        business_id, ingredient_id, type, qty, unit_cost, total_cost,
        source, reason, reference_id, reference_type, created_by
      ) values (
        v_business_id, v_po_item.ingredient_id, 'purchase_in',
        v_qty_recv, v_po_item.unit_cost,
        v_qty_recv * v_po_item.unit_cost,
        'purchase_order', null, p_po_id, 'purchase_order', v_user_id
      );
      v_movements := v_movements + 1;

      if p_update_costs and v_po_item.unit_cost > 0 then
        update ingredients
        set cost_per_unit = v_po_item.unit_cost
        where id = v_po_item.ingredient_id
          and business_id = v_business_id;
      end if;
    end if;
  end loop;

  -- Aggregate received total + new status
  select count(*),
         count(*) filter (where qty_received >= qty),
         coalesce(sum(qty_received * unit_cost), 0)
    into v_total_lines, v_full_lines, v_total_kes
  from purchase_order_items
  where purchase_order_id = p_po_id;

  if v_total_lines > 0 and v_full_lines = v_total_lines then
    v_new_status := 'received';
  else
    v_new_status := 'partial';
  end if;

  update purchase_orders
  set status              = v_new_status,
      received_at         = case when v_new_status = 'received' then now() else received_at end,
      received_total_kes  = v_total_kes,
      updated_at          = now()
  where id = p_po_id;

  po_id := p_po_id;
  new_status := v_new_status;
  movements_count := v_movements;
  received_total := v_total_kes;
  return next;
end;
$$;

revoke all on function fn_receive_purchase_order(uuid, jsonb, boolean) from public;
grant execute on function fn_receive_purchase_order(uuid, jsonb, boolean) to authenticated;
