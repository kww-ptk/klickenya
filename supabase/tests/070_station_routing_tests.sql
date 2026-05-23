-- 070_station_routing_tests.sql
-- Run with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/070_station_routing_tests.sql
--
-- 9 scenarios covering the derive_order_status FSM. Whole script runs
-- inside one transaction that ROLLBACKs at the end, so re-runnable and
-- leaves nothing behind. Requires at least one row in auth.users.

\set ON_ERROR_STOP on
\timing on

begin;

do $$
declare
  v_owner   uuid;
  v_menu    uuid;
  v_sec_k   uuid;
  v_sec_b   uuid;
  v_item_k  uuid;
  v_item_b  uuid;
  v_order   uuid;
  v_oi_k    uuid;
  v_oi_b    uuid;
  v_got     text;

  -- Inline assertion helper. plpgsql doesn't allow nested procedures
  -- inside a do block in older Postgres, so we inline the check pattern.
begin
  select id into v_owner from auth.users limit 1;
  if v_owner is null then
    raise exception 'No auth.users row exists. Create a user first.';
  end if;

  raise notice E'\n========================================\n  derive_order_status FSM tests\n========================================';

  ----- fixture ----------------------------------------------------
  v_menu := gen_random_uuid();
  insert into menus (id, business_id, slug, name, table_ordering, is_published)
  values (v_menu, v_owner, 'fsm-test-' || substr(v_menu::text,1,8),
          'FSM Test Menu', true, false);

  insert into menu_sections (menu_id, title, station, display_order)
  values (v_menu, 'Burgers', 'kitchen', 0) returning id into v_sec_k;
  insert into menu_sections (menu_id, title, station, display_order)
  values (v_menu, 'Drinks',  'bar',     1) returning id into v_sec_b;

  insert into menu_items (section_id, name, price_kes, is_available)
  values (v_sec_k, 'Burger', 800, true) returning id into v_item_k;
  insert into menu_items (section_id, name, price_kes, is_available)
  values (v_sec_b, 'Beer',   300, true) returning id into v_item_b;

  insert into orders (menu_id, order_type, status, table_number, subtotal_kes, total_kes)
  values (v_menu, 'dine_in', 'new', 'T1', 1100, 1100)
  returning id into v_order;

  insert into order_items (order_id, menu_item_id, item_name, item_price, quantity,
                           station, station_status)
  values (v_order, v_item_k, 'Burger', 800, 1, 'kitchen', 'new')
  returning id into v_oi_k;

  insert into order_items (order_id, menu_item_id, item_name, item_price, quantity,
                           station, station_status)
  values (v_order, v_item_b, 'Beer', 300, 1, 'bar', 'new')
  returning id into v_oi_b;

  ----- scenarios --------------------------------------------------

  -- Initial: trigger only fires on UPDATE, so call directly to seed.
  perform derive_order_status(v_order);
  select status into v_got from orders where id = v_order;
  if v_got <> 'new' then
    raise exception 'scenario 1 (both new): expected new, got %', v_got;
  end if;
  raise notice 'OK 1: both new -> %', v_got;

  -- Scenario 2: kitchen preparing while bar new -> mixed -> preparing
  update order_items set station_status = 'preparing' where id = v_oi_k;
  select status into v_got from orders where id = v_order;
  if v_got <> 'preparing' then
    raise exception 'scenario 2 (kitchen preparing): expected preparing, got %', v_got;
  end if;
  raise notice 'OK 2: kitchen preparing + bar new -> %', v_got;

  -- Scenario 3: kitchen ready while bar still new -> still preparing
  update order_items set station_status = 'ready' where id = v_oi_k;
  select status into v_got from orders where id = v_order;
  if v_got <> 'preparing' then
    raise exception 'scenario 3 (kitchen ready, bar new): expected preparing, got %', v_got;
  end if;
  raise notice 'OK 3: kitchen ready + bar new -> %', v_got;

  -- Scenario 4: both ready -> ready
  update order_items set station_status = 'ready' where id = v_oi_b;
  select status into v_got from orders where id = v_order;
  if v_got <> 'ready' then
    raise exception 'scenario 4 (both ready): expected ready, got %', v_got;
  end if;
  raise notice 'OK 4: both ready -> %', v_got;

  -- Scenario 5: one delivered, one ready -> ready
  update order_items set station_status = 'delivered' where id = v_oi_k;
  select status into v_got from orders where id = v_order;
  if v_got <> 'ready' then
    raise exception 'scenario 5 (kitchen delivered, bar ready): expected ready, got %', v_got;
  end if;
  raise notice 'OK 5: kitchen delivered + bar ready -> %', v_got;

  -- Scenario 6: both delivered -> delivered
  update order_items set station_status = 'delivered' where id = v_oi_b;
  select status into v_got from orders where id = v_order;
  if v_got <> 'delivered' then
    raise exception 'scenario 6 (both delivered): expected delivered, got %', v_got;
  end if;
  raise notice 'OK 6: both delivered -> %', v_got;

  -- Terminal-order safeguard: try to "un-deliver" by reverting bar to new.
  -- orders.status should stay 'delivered'.
  update order_items set station_status = 'new' where id = v_oi_b;
  select status into v_got from orders where id = v_order;
  if v_got <> 'delivered' then
    raise exception 'scenario 7 (terminal safeguard): expected delivered to stick, got %', v_got;
  end if;
  raise notice 'OK 7: terminal safeguard kept orders.status = %', v_got;

  -- New order for cancellation scenarios (the previous one is terminal).
  insert into orders (menu_id, order_type, status, table_number, subtotal_kes, total_kes)
  values (v_menu, 'dine_in', 'new', 'T2', 1100, 1100)
  returning id into v_order;

  insert into order_items (order_id, menu_item_id, item_name, item_price, quantity,
                           station, station_status)
  values (v_order, v_item_k, 'Burger', 800, 1, 'kitchen', 'ready')
  returning id into v_oi_k;

  insert into order_items (order_id, menu_item_id, item_name, item_price, quantity,
                           station, station_status)
  values (v_order, v_item_b, 'Beer', 300, 1, 'bar', 'new')
  returning id into v_oi_b;

  perform derive_order_status(v_order);
  select status into v_got from orders where id = v_order;
  if v_got <> 'preparing' then
    raise exception 'scenario 8 precond: expected preparing, got %', v_got;
  end if;

  -- Scenario 8: cancel the new bar item -> orders should reflect the
  -- remaining ready kitchen item, i.e. 'ready'.
  update order_items set station_status = 'cancelled' where id = v_oi_b;
  select status into v_got from orders where id = v_order;
  if v_got <> 'ready' then
    raise exception 'scenario 8 (cancel one, other ready): expected ready, got %', v_got;
  end if;
  raise notice 'OK 8: bar cancelled + kitchen ready -> %', v_got;

  -- Scenario 9: void the remaining kitchen item -> only voided items left
  -- (the bar one is station_status=cancelled but not voided). Aggregate of
  -- non-voided items: 1 item cancelled out of 1 -> cancelled.
  update order_items set is_voided = true, voided_at = now(), voided_reason = 'test'
    where id = v_oi_k;
  select status into v_got from orders where id = v_order;
  if v_got <> 'cancelled' then
    raise exception 'scenario 9 (void kitchen, bar cancelled): expected cancelled, got %', v_got;
  end if;
  raise notice 'OK 9: kitchen voided + bar cancelled -> %', v_got;

  raise notice E'\n========================================\n  All FSM assertions passed.\n========================================';
end;
$$;

rollback;
