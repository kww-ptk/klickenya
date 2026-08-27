-- 083_takeaway_orders.sql
-- Takeaway ordering V1: accept-first flow columns on orders.
-- order_type='takeaway' + menus.takeaway_enabled already exist (028/043) — dormant until now.

alter table orders add column if not exists accepted_at        timestamptz;  -- ACTIVE V1: set when restaurant accepts a takeaway order
alter table orders add column if not exists estimated_ready_at timestamptz;  -- ACTIVE V1: promised pickup time (accept + N minutes)
alter table orders add column if not exists decline_reason     text;         -- ACTIVE V1: shown to the guest on the status page when declined
