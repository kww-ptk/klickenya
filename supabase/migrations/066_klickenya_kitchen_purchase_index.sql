-- 066_klickenya_kitchen_purchase_index.sql
-- Speed pass — Tier 2.
--
-- Partial index covering the cross-platform price view + supplier-price-
-- alerts RPC. Both scan stock_movements filtered to
--   type = 'purchase_in' AND unit_cost > 0 AND created_at >= now() - 60d/180d
-- The existing index on (business_id, type, created_at desc) helps when a
-- single business is doing the lookup, but v_platform_ingredient_prices
-- aggregates ACROSS businesses -- so business_id can't lead and the index
-- isn't picked.
--
-- This partial index is small (only purchase_in rows) and exact for the
-- predicate. As the dataset grows it's the difference between O(scan-all)
-- and O(time-window) for both the platform view and the alert RPC.

create index if not exists idx_stock_movements_purchase_recent
  on stock_movements (created_at desc)
  where type = 'purchase_in' and unit_cost > 0;
