-- Migration 039: Hold status for enquiries
-- Adds hold_type column and extends calendar_status constraint

ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS hold_type text
    CHECK (hold_type IN ('soft', 'internal', 'deposit'));

ALTER TABLE public.contact_requests
  DROP CONSTRAINT IF EXISTS contact_requests_calendar_status_check;

ALTER TABLE public.contact_requests
  ADD CONSTRAINT contact_requests_calendar_status_check
    CHECK (calendar_status IN ('pending', 'accepted', 'declined', 'converted', 'held'));
