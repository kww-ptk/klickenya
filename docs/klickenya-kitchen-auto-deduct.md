# Klickenya Kitchen — auto-deduction triggers

Migration: `supabase/migrations/062_klickenya_kitchen_auto_deduct.sql`
Tests: `supabase/tests/062_auto_deduct_tests.sql`

This is the V0.2 piece that closes the loop. When the chef advances an order
to the menu's chosen stock-deduction status, every ingredient's `on_hand` drops
without anyone touching a form. Cancelling that order writes append-only
reversal rows; nothing is ever deleted.

## Triggers at a glance

| Trigger | Fires when | Effect |
|---|---|---|
| `trg_orders_deduct_on_preparing` | `orders.status` enters `preparing` | inserts one `sale_out` per ingredient, **only if** `menus.stock_enabled = true` AND `menus.stock_deduct_on = 'preparing'` |
| `trg_orders_deduct_on_delivered` | `orders.status` enters `delivered` | same, but gated on `menus.stock_deduct_on = 'delivered'` |
| `trg_orders_reverse_on_cancel` | `orders.status` enters `cancelled` | inserts one `reversal` per existing un-reversed `sale_out` linked to the order |

All three live on `AFTER UPDATE OF status ON orders, FOR EACH ROW`.

## The arithmetic

For each order line that has a recipe:

```
AP qty (per ingredient) = (ep_qty / (yield_pct / 100)) * order_item.quantity
```

Then we insert one `stock_movements` row per ingredient with:

| column | value |
|---|---|
| `qty` | `-1 × AP qty` (signed: negative = OUT) |
| `unit_cost` | snapshot of `ingredients.cost_per_unit` at the moment the trigger ran |
| `total_cost` | `qty × unit_cost` (cached for the activity feed) |
| `type` | `sale_out` |
| `source` | `auto_recipe` |
| `reference_type` | `'orders'` |
| `reference_id` | `orders.id` |

The `trg_stock_movements_apply` trigger from migration 060 lifts
`ingredients.on_hand` automatically — every `qty` is signed, so deductions and
reversals both work through the same code path. **Never write `on_hand`
directly.**

> **Naming note:** the spec calls these `source_table` / `source_id`. The
> existing column names in 060 are `reference_type` / `reference_id` with the
> same semantics. We kept the 060 names rather than introducing parallel
> columns. Read `reference_type='orders'` as "the row in `reference_id` is an
> orders.id."

## Idempotency

The two deduction triggers each guard against double-firing:

```sql
if exists (
  select 1 from stock_movements
  where reference_type = 'orders'
    and reference_id   = NEW.id
    and type           = 'sale_out'
    and not exists (select 1 from stock_movements r where r.reversal_of = sm.id)
) then
  return NEW;
end if;
```

This means the trigger is safe against status bounces:

- `new → preparing` ✅ deducts
- `preparing → ready → preparing` ✅ does NOT re-deduct (movements already exist)
- `cancelled → preparing` ✅ does NOT re-deduct (because reversals don't make
  the original `sale_out` count as "reversed" for *this* check — it does, see
  the `not exists … reversal_of = sm.id` clause)

Wait, that last bullet matters: after cancellation, there are reversed
`sale_out` rows. If the order is then re-opened back to `preparing` (which is
unusual but possible), the guard sees no *un-reversed* `sale_out` rows and
deducts again. That's the correct behaviour: the cancellation already paid
back the stock, so re-preparing should pay it out again.

## Append-only law

Reversals are **always inserts**, never updates or deletes. The original
`sale_out` row stays in the audit trail forever. The reversal row carries
`reversal_of = original.id` so we can link them.

The activity feed shows both sides of the pair, which is the right behaviour:
"we took 120g of chicken at 18:42, then put it back at 19:01 because the order
was cancelled" is more honest than silently rewriting history.

## Variant ingredients

`recipe_ingredients.variant_option_id` is nullable.

- **NULL** = base ingredient, always deducted on every order of this menu item.
- **non-null** = variant ingredient, only deducted when the matching option
  was chosen on the order line.

Matching happens against the `order_items.selected_options` JSONB snapshot,
which has shape `[{group, choice, price_add}]`. The trigger's variant clause:

```sql
exists (
  select 1
  from item_options io
    join item_option_groups iog on iog.id = io.option_group_id
    cross join lateral jsonb_array_elements(coalesce(oi.selected_options, '[]'::jsonb)) so
  where io.id = ri.variant_option_id
    and so->>'group'  = iog.name
    and so->>'choice' = io.name
)
```

i.e. we look up the option pinned to the recipe row, find its parent group,
and check whether the order's snapshot mentions that *group + choice* pair.
Matching by name not id because the existing snapshot format doesn't carry
ids. If/when the order writer starts including `option_id` in the JSON, this
clause can be simplified to `so->>'option_id' = ri.variant_option_id`.

## Items without a recipe

The trigger uses `JOIN recipes` and `JOIN recipe_ingredients`, so menu items
with no recipe simply don't appear in the join — they're silently skipped
without raising. The owner sees them in **`/stock/missing-recipes`**, and a
banner appears on the stock home page when the count > 0.

## What is NOT supported (yet)

- **`stock_deduct_on = 'placed'`** — would need a separate trigger on
  `INSERT ON orders` plus a way to deduct from order_items inserted *after*
  the order header (orders are usually inserted as header-then-items in the
  same transaction; the AFTER INSERT trigger would fire too early). V0.3.
- **`stock_deduct_on = 'paid'`** — `payment_status` is a different column, so
  this needs a fourth trigger on `AFTER UPDATE OF payment_status`. V0.3.
- **Per-ingredient cost overrides on cancel** — the reversal preserves the
  original `unit_cost` (the cost at the moment of deduction), which is what
  you want for an honest cost accounting.

## Running the tests

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/062_auto_deduct_tests.sql
```

The file wraps everything in `BEGIN; … ROLLBACK;` so no test data persists.
Six scenarios, all assertions self-checking — the script exits non-zero on the
first failure.

| # | Scenario | Asserts |
|---|---|---|
| 1 | `stock_enabled = false` | 0 movements |
| 2 | 3-ingredient recipe, qty=1 | exactly 3 movements; AP qty correct; `unit_cost` is a snapshot |
| 3 | qty=2 | AP qty doubles |
| 4 | item without a recipe | 0 movements, no error |
| 5 | cancel after preparing | 3 sale_out + 3 reversal, sums to 0, originals unmodified |
| 6 | variant ingredient | only deducts when the option appears in `selected_options` |

## Debugging in production

When stock seems wrong:

```sql
-- Recent activity for one order
select created_at, type, ingredient_id, qty, unit_cost, total_cost, source, reversal_of
  from stock_movements
 where reference_type = 'orders'
   and reference_id = '<order id>'
 order by created_at;

-- Items on this menu that won't deduct (no recipe / empty recipe)
select * from fn_count_missing_recipes('<menu id>');
```

If a particular order *should* have deducted but didn't, walk the gates in
order: was `menus.stock_enabled = true`? Did `menus.stock_deduct_on` match the
status the order entered? Is there a `recipe` row + at least one
`recipe_ingredient` for every item?
