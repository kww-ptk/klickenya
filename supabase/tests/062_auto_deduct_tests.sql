-- 062_auto_deduct_tests.sql
-- Run with:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/062_auto_deduct_tests.sql
--
-- Six scenarios. Every scenario uses RAISE EXCEPTION on failure so a
-- failed assertion aborts the whole script with a non-zero exit code.
-- The whole thing runs inside one transaction that ROLLBACKs at the end,
-- so nothing persists in the database -- safe to re-run.
--
-- Requires: at least one row in auth.users (we borrow the first one as
-- our test "business owner"). On Supabase a real owner already exists.
-- If your DB is empty, create a user via the Supabase dashboard first.

\set ON_ERROR_STOP on
\timing on

begin;

-- ----- shared setup ----------------------------------------------
do $$
declare
  v_owner       uuid;
  v_menu        uuid;
  v_section     uuid;

  -- pantry ----------------------------------------------------------
  v_chicken     uuid;
  v_rice        uuid;
  v_garlic      uuid;
  v_cheese      uuid;        -- variant ingredient: extra cheese

  -- menu items + recipes -------------------------------------------
  v_pilau_item  uuid;        -- item with a 3-ingredient recipe
  v_pilau_rec   uuid;
  v_no_recipe_item uuid;     -- item with NO recipe at all

  -- options (for variant test) -------------------------------------
  v_extras_grp  uuid;
  v_cheese_opt  uuid;

  -- orders ---------------------------------------------------------
  v_order_a     uuid;        -- scenario 2/3
  v_order_b     uuid;        -- scenario 4 (no-recipe item)
  v_order_c     uuid;        -- scenario 5 (cancellation)
  v_order_d     uuid;        -- scenario 6 (variant)
  v_order_x     uuid;        -- scenario 1 (stock disabled)

  -- assertions -----------------------------------------------------
  v_count       int;
  v_sum_qty     numeric;
  v_unit_cost   numeric;

begin
  select id into v_owner from auth.users limit 1;
  if v_owner is null then
    raise exception 'No auth.users row exists. Create a user first.';
  end if;

  raise notice E'\n========================================\n  Auto-deduction trigger tests\n  business: %\n========================================', v_owner;

  -- ----- pantry --------------------------------------------------
  insert into ingredients (business_id, name, unit, cost_per_unit, default_yield)
    values (v_owner, 'TEST Chicken thigh', 'g', 0.50, 0.85)
    returning id into v_chicken;
  insert into ingredients (business_id, name, unit, cost_per_unit)
    values (v_owner, 'TEST Basmati rice', 'g', 0.20)
    returning id into v_rice;
  insert into ingredients (business_id, name, unit, cost_per_unit)
    values (v_owner, 'TEST Garlic', 'g', 1.00)
    returning id into v_garlic;
  insert into ingredients (business_id, name, unit, cost_per_unit)
    values (v_owner, 'TEST Cheddar (variant)', 'g', 2.00)
    returning id into v_cheese;

  -- ============================================================
  -- SCENARIO 1: stock_enabled = false  ->  no movements
  -- ============================================================
  insert into menus (business_id, slug, name, stock_enabled, stock_deduct_on)
    values (v_owner, 'test-menu-disabled-' || gen_random_uuid()::text, 'TEST Disabled', false, 'preparing')
    returning id into v_menu;
  insert into menu_sections (menu_id, title) values (v_menu, 'Main') returning id into v_section;
  insert into menu_items (section_id, name, price_kes) values (v_section, 'TEST Pilau', 600)
    returning id into v_pilau_item;
  insert into recipes (menu_item_id, business_id) values (v_pilau_item, v_owner)
    returning id into v_pilau_rec;
  insert into recipe_ingredients (recipe_id, ingredient_id, ep_qty, yield_pct)
    values (v_pilau_rec, v_chicken, 120, 85);

  insert into orders (menu_id, order_type, status) values (v_menu, 'dine_in', 'new')
    returning id into v_order_x;
  insert into order_items (order_id, menu_item_id, item_name, item_price, quantity)
    values (v_order_x, v_pilau_item, 'TEST Pilau', 600, 1);

  update orders set status = 'preparing' where id = v_order_x;

  select count(*) into v_count
    from stock_movements where reference_id = v_order_x;
  if v_count <> 0 then
    raise exception 'SCENARIO 1 FAILED: stock_enabled=false produced % movements (expected 0)', v_count;
  end if;
  raise notice '  PASS  1. stock_enabled=false  -> 0 movements';

  -- ============================================================
  -- SCENARIO 2: 3-ingredient recipe, qty=1  ->  3 movements
  -- ============================================================
  insert into menus (business_id, slug, name, stock_enabled, stock_deduct_on)
    values (v_owner, 'test-menu-active-' || gen_random_uuid()::text, 'TEST Active', true, 'preparing')
    returning id into v_menu;
  insert into menu_sections (menu_id, title) values (v_menu, 'Main') returning id into v_section;
  insert into menu_items (section_id, name, price_kes) values (v_section, 'TEST Pilau', 600)
    returning id into v_pilau_item;
  insert into recipes (menu_item_id, business_id) values (v_pilau_item, v_owner)
    returning id into v_pilau_rec;

  insert into recipe_ingredients (recipe_id, ingredient_id, ep_qty, yield_pct)
    values
      (v_pilau_rec, v_chicken, 120, 85),       -- chicken
      (v_pilau_rec, v_rice,    150, 100),      -- rice
      (v_pilau_rec, v_garlic,    5, 100);      -- garlic

  -- Add an item-with-no-recipe to confirm SCENARIO 4 in the same menu
  insert into menu_items (section_id, name, price_kes) values (v_section, 'TEST Mystery dish', 500)
    returning id into v_no_recipe_item;

  -- Order A: pilau qty=1
  insert into orders (menu_id, order_type, status) values (v_menu, 'dine_in', 'new')
    returning id into v_order_a;
  insert into order_items (order_id, menu_item_id, item_name, item_price, quantity)
    values (v_order_a, v_pilau_item, 'TEST Pilau', 600, 1);

  update orders set status = 'preparing' where id = v_order_a;

  select count(*) into v_count
    from stock_movements where reference_id = v_order_a and type = 'sale_out';
  if v_count <> 3 then
    raise exception 'SCENARIO 2 FAILED: expected 3 sale_out movements, got %', v_count;
  end if;

  -- AP qty for chicken should be 120 / 0.85 * 1 = 141.176...; sign negative.
  select round(qty::numeric, 4) into v_sum_qty
    from stock_movements where reference_id = v_order_a and ingredient_id = v_chicken;
  if abs(v_sum_qty - round(-120 / 0.85, 4)) > 0.01 then
    raise exception 'SCENARIO 2 FAILED: chicken qty=%, expected ~%',
      v_sum_qty, round(-120 / 0.85, 4);
  end if;

  -- unit_cost snapshot: must equal cost_per_unit at deduction time (0.50)
  select unit_cost into v_unit_cost
    from stock_movements where reference_id = v_order_a and ingredient_id = v_chicken;
  if v_unit_cost <> 0.50 then
    raise exception 'SCENARIO 2 FAILED: chicken unit_cost=%, expected 0.50', v_unit_cost;
  end if;
  raise notice '  PASS  2. 3-ingredient recipe  -> 3 movements, AP qty + unit_cost correct';

  -- ============================================================
  -- SCENARIO 3: qty=2  ->  AP qty doubles
  -- ============================================================
  insert into orders (menu_id, order_type, status) values (v_menu, 'dine_in', 'new')
    returning id into v_order_a;     -- reuse var; new id
  insert into order_items (order_id, menu_item_id, item_name, item_price, quantity)
    values (v_order_a, v_pilau_item, 'TEST Pilau', 600, 2);

  update orders set status = 'preparing' where id = v_order_a;

  select round(qty::numeric, 4) into v_sum_qty
    from stock_movements where reference_id = v_order_a and ingredient_id = v_chicken;
  if abs(v_sum_qty - round(-120 / 0.85 * 2, 4)) > 0.01 then
    raise exception 'SCENARIO 3 FAILED: qty=2 chicken qty=%, expected ~%',
      v_sum_qty, round(-120 / 0.85 * 2, 4);
  end if;
  raise notice '  PASS  3. qty=2                -> AP qty doubles cleanly';

  -- ============================================================
  -- SCENARIO 4: item with no recipe  ->  0 movements, no error
  -- ============================================================
  insert into orders (menu_id, order_type, status) values (v_menu, 'dine_in', 'new')
    returning id into v_order_b;
  insert into order_items (order_id, menu_item_id, item_name, item_price, quantity)
    values (v_order_b, v_no_recipe_item, 'TEST Mystery dish', 500, 1);

  update orders set status = 'preparing' where id = v_order_b;

  select count(*) into v_count from stock_movements where reference_id = v_order_b;
  if v_count <> 0 then
    raise exception 'SCENARIO 4 FAILED: no-recipe item produced % movements', v_count;
  end if;
  raise notice '  PASS  4. item with no recipe  -> 0 movements (silent skip)';

  -- ============================================================
  -- SCENARIO 5: cancel after preparing  ->  reversal pairs sum to 0
  -- ============================================================
  insert into orders (menu_id, order_type, status) values (v_menu, 'dine_in', 'new')
    returning id into v_order_c;
  insert into order_items (order_id, menu_item_id, item_name, item_price, quantity)
    values (v_order_c, v_pilau_item, 'TEST Pilau', 600, 1);

  update orders set status = 'preparing'  where id = v_order_c;
  update orders set status = 'cancelled'  where id = v_order_c;

  -- 3 sale_out + 3 reversal expected
  select count(*) into v_count
    from stock_movements where reference_id = v_order_c and type = 'sale_out';
  if v_count <> 3 then raise exception 'SCENARIO 5 FAILED: expected 3 sale_out, got %', v_count; end if;

  select count(*) into v_count
    from stock_movements where reference_id = v_order_c and type = 'reversal';
  if v_count <> 3 then raise exception 'SCENARIO 5 FAILED: expected 3 reversal, got %', v_count; end if;

  -- For each ingredient on this order, sale_out + reversal = 0
  perform 1 from (
    select ingredient_id, sum(qty) total
    from stock_movements
    where reference_id = v_order_c and type in ('sale_out','reversal')
    group by ingredient_id
    having abs(sum(qty)) > 0.0001
  ) as bad;
  if found then
    raise exception 'SCENARIO 5 FAILED: sale_out + reversal does not net to 0';
  end if;

  -- Originals must still exist untouched (append-only law)
  select count(*) into v_count
    from stock_movements
    where reference_id = v_order_c and type = 'sale_out'
      and id in (select reversal_of from stock_movements where reference_id = v_order_c and type = 'reversal');
  if v_count <> 3 then
    raise exception 'SCENARIO 5 FAILED: reversal_of links broken (got % matches)', v_count;
  end if;

  raise notice '  PASS  5. cancel after preparing -> 3 sale_out + 3 reversal, net zero, originals intact';

  -- ============================================================
  -- SCENARIO 6: variant ingredient  ->  only deducted when chosen
  -- ============================================================
  -- Add an Extras option group with a "Cheese" choice; bind the
  -- variant ingredient to that option.
  insert into item_option_groups (menu_item_id, name, group_type)
    values (v_pilau_item, 'Extras', 'multi') returning id into v_extras_grp;
  insert into item_options (option_group_id, name, price_modifier)
    values (v_extras_grp, 'Cheese', 100) returning id into v_cheese_opt;

  insert into recipe_ingredients (recipe_id, ingredient_id, ep_qty, yield_pct, variant_option_id)
    values (v_pilau_rec, v_cheese, 30, 100, v_cheese_opt);

  -- 6a: order WITHOUT cheese  ->  3 movements (base only), no cheese
  insert into orders (menu_id, order_type, status) values (v_menu, 'dine_in', 'new')
    returning id into v_order_d;
  insert into order_items (order_id, menu_item_id, item_name, item_price, quantity, selected_options)
    values (v_order_d, v_pilau_item, 'TEST Pilau', 600, 1, '[]'::jsonb);

  update orders set status = 'preparing' where id = v_order_d;

  select count(*) into v_count
    from stock_movements where reference_id = v_order_d and ingredient_id = v_cheese;
  if v_count <> 0 then
    raise exception 'SCENARIO 6a FAILED: cheese deducted on order without variant (% movements)', v_count;
  end if;

  select count(*) into v_count
    from stock_movements where reference_id = v_order_d and type = 'sale_out';
  if v_count <> 3 then
    raise exception 'SCENARIO 6a FAILED: expected 3 base movements, got %', v_count;
  end if;

  -- 6b: order WITH cheese  ->  4 movements (base + cheese)
  insert into orders (menu_id, order_type, status) values (v_menu, 'dine_in', 'new')
    returning id into v_order_d;
  insert into order_items (order_id, menu_item_id, item_name, item_price, quantity, selected_options)
    values (
      v_order_d, v_pilau_item, 'TEST Pilau', 600, 1,
      jsonb_build_array(jsonb_build_object('group', 'Extras', 'choice', 'Cheese', 'price_add', 100))
    );

  update orders set status = 'preparing' where id = v_order_d;

  select count(*) into v_count
    from stock_movements where reference_id = v_order_d and ingredient_id = v_cheese;
  if v_count <> 1 then
    raise exception 'SCENARIO 6b FAILED: expected 1 cheese movement when chosen, got %', v_count;
  end if;

  select count(*) into v_count
    from stock_movements where reference_id = v_order_d and type = 'sale_out';
  if v_count <> 4 then
    raise exception 'SCENARIO 6b FAILED: expected 4 movements (3 base + cheese), got %', v_count;
  end if;
  raise notice '  PASS  6. variant ingredient   -> only deducted when chosen';

  raise notice E'\n========================================\n  All 6 scenarios passed.\n========================================';
end$$;

rollback;
