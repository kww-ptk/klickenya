-- 059_order_items_void.sql
-- Item-level void (a single line removed from a sent order without
-- cancelling the whole order). Soft-delete pattern so the row stays around
-- for audit/forensics but stops counting toward the bill.

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_voided      boolean     NOT NULL DEFAULT false,         -- ACTIVE V2
  ADD COLUMN IF NOT EXISTS voided_at      timestamptz,                                -- ACTIVE V2
  ADD COLUMN IF NOT EXISTS voided_by      uuid REFERENCES restaurant_staff(id) ON DELETE SET NULL, -- ACTIVE V2
  ADD COLUMN IF NOT EXISTS voided_reason  text;                                       -- ACTIVE V2

-- Index for the bill aggregation query, which now filters voided items out.
CREATE INDEX IF NOT EXISTS idx_order_items_order_active
  ON order_items (order_id) WHERE NOT is_voided;
