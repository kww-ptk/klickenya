-- 092_commission.sql
-- What Klickenya earns per order, and what it owes the rider.
--
-- Rates in basis points, matching PLATFORM_TICKET_FEE_BPS. 1000 bps = 10%.
-- Integers, because a percentage stored as a float drifts, and a ledger that
-- disagrees with itself by a shilling every few hundred orders is worse than
-- one that is plainly wrong.
--
-- Rates live on the MENU because they are negotiated per restaurant. The
-- rider's share of the delivery fee does not: that is a platform term with
-- riders, and no restaurant has a say in it, so it stays in code.

alter table menus add column if not exists commission_delivery_bps int not null default 1000; -- 10%
alter table menus add column if not exists commission_pickup_bps   int not null default 700;  -- 7%

comment on column menus.commission_delivery_bps is
  'Klickenya commission on the FOOD of a delivery order, in basis points. 1000 = 10%.';
comment on column menus.commission_pickup_bps is
  'Klickenya commission on the FOOD of a pickup/takeaway order, in basis points. 700 = 7%.';

-- ─── Snapshots on the order ───────────────────────────────────────────────
-- Every figure is frozen at placement. Rates get renegotiated, and an order
-- settled in March must not change because a rate changed in June — which is
-- exactly what would happen if these were recomputed from the menu on read.
alter table orders add column if not exists commission_bps            int;
alter table orders add column if not exists commission_kes            numeric;
alter table orders add column if not exists restaurant_payout_kes     numeric;
alter table orders add column if not exists rider_fee_kes             numeric;
alter table orders add column if not exists platform_delivery_fee_kes numeric;

comment on column orders.commission_bps is
  'The rate actually applied to this order. Snapshot — never recompute from menus.';
comment on column orders.rider_fee_kes is
  'The rider''s share of delivery_fee_kes. Owed to whoever delivered it.';
