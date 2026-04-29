-- 056_bill_enhancements.sql
-- Bill management additions for the POS V2 receipt experience:
--   - Flat-amount discounts alongside the existing percentage discount
--   - Free-form bill notes (e.g. "Birthday dinner, VIP")
--   - Split-bill count for "per person" rendering on receipts
--   - Receipt tracking (URL, sent_at, sent_to) so the dashboard can show
--     whether a receipt has been emailed/printed for a session.
--
-- All columns are nullable / have safe defaults so legacy sessions render
-- correctly with zero discounts and split_count = 1.

ALTER TABLE table_sessions
  ADD COLUMN IF NOT EXISTS discount_amount_kes numeric(12,2) NOT NULL DEFAULT 0,  -- ACTIVE V2
  ADD COLUMN IF NOT EXISTS bill_notes          text,                              -- ACTIVE V2
  ADD COLUMN IF NOT EXISTS split_count         int     NOT NULL DEFAULT 1;        -- ACTIVE V2

ALTER TABLE table_sessions
  ADD COLUMN IF NOT EXISTS receipt_url         text,                              -- ACTIVE V2 (path to generated PDF, future use)
  ADD COLUMN IF NOT EXISTS receipt_sent_at     timestamptz,                       -- ACTIVE V2
  ADD COLUMN IF NOT EXISTS receipt_sent_to     text;                              -- ACTIVE V2 (email or phone)

-- Guard against unreasonable split values. 1–20 covers virtually every
-- restaurant table; clamp at the DB level so the API can't slip a bad value
-- past validation.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'table_sessions_split_count_check'
  ) THEN
    ALTER TABLE table_sessions
      ADD CONSTRAINT table_sessions_split_count_check
      CHECK (split_count >= 1 AND split_count <= 20);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'table_sessions_discount_amount_check'
  ) THEN
    ALTER TABLE table_sessions
      ADD CONSTRAINT table_sessions_discount_amount_check
      CHECK (discount_amount_kes >= 0);
  END IF;
END$$;
