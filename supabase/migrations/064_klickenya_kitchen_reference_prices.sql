-- 064_klickenya_kitchen_reference_prices.sql
-- V0.4 of Klickenya Kitchen: cross-platform reference prices.
--
-- The reports dashboard already shows EACH RESTAURANT what THEY paid.
-- This migration adds a view that aggregates real purchase data ACROSS
-- the platform so a new restaurant (or one buying an ingredient for the
-- first time) can sanity-check their costs against the median paid by
-- comparable Kenyan venues.
--
-- Privacy: aggregates only surface when at least 3 distinct businesses
-- have paid for that ingredient. Below that threshold, the row is
-- suppressed -- we never expose what one specific restaurant paid.
--
-- Canonicalisation: ingredients are matched by lower(trim(name)). It's
-- an imperfect match (chicken thigh vs chicken thighs vs chicken thigh
-- fillet stay distinct), but it's a good enough starting point. A
-- future migration can normalise via a synonyms table.

-- ----- VIEW: v_platform_ingredient_prices -----------------------
-- security_invoker stays FALSE (the default) here on purpose: the
-- aggregate is the entire platform, not the caller's own data, and
-- aggregating across rows the caller couldn't normally see is exactly
-- the point. The privacy gate is the HAVING clause -- never the
-- caller's auth.uid().
drop view if exists v_platform_ingredient_prices;
create view v_platform_ingredient_prices as
  select
    lower(trim(i.name))                                                    as canonical_name,
    i.unit                                                                 as unit,
    count(distinct sm.business_id)::int                                    as restaurant_count,
    count(*)::int                                                          as sample_size,
    percentile_cont(0.5) within group (order by sm.unit_cost)::numeric(12,4) as median_kes,
    percentile_cont(0.25) within group (order by sm.unit_cost)::numeric(12,4) as p25_kes,
    percentile_cont(0.75) within group (order by sm.unit_cost)::numeric(12,4) as p75_kes,
    min(sm.unit_cost)::numeric(12,4)                                       as min_kes,
    max(sm.unit_cost)::numeric(12,4)                                       as max_kes,
    max(sm.created_at)                                                     as last_seen_at
  from stock_movements sm
    join ingredients i on i.id = sm.ingredient_id
  where sm.type        = 'purchase_in'
    and sm.unit_cost   > 0
    and sm.created_at >= now() - interval '180 days'
  group by lower(trim(i.name)), i.unit
  having count(distinct sm.business_id) >= 3;

-- Aggregated, k-anonymised data -- safe for any authenticated user to read.
revoke all on v_platform_ingredient_prices from public;
grant select on v_platform_ingredient_prices to authenticated;
