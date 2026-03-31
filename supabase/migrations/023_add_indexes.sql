-- 023_add_indexes.sql
-- Add missing indexes on columns frequently used in WHERE / ORDER BY clauses.
-- Also adds listing_sanity_id column to contact_requests (was previously
-- embedded in the notes text field with no way to query it).

-- ============================================================
-- Schema change: contact_requests.listing_sanity_id
-- ============================================================

-- Store the Sanity document _id so we can filter enquiries by listing
ALTER TABLE contact_requests
  ADD COLUMN IF NOT EXISTS listing_sanity_id text;

-- ============================================================
-- host_profiles
-- ============================================================

-- RLS policies filter every request with auth.uid() = user_id
CREATE INDEX IF NOT EXISTS idx_host_profiles_user_id
  ON host_profiles (user_id);

-- ============================================================
-- contact_requests
-- ============================================================

-- Dashboard sorts all enquiries by date (existing composite index requires status)
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at
  ON contact_requests (created_at DESC);

-- Filter enquiries by Sanity listing
CREATE INDEX IF NOT EXISTS idx_contact_requests_listing_sanity_id
  ON contact_requests (listing_sanity_id);

-- ============================================================
-- claim_requests
-- ============================================================

-- Admin dashboard filters claims by pending / approved / rejected
CREATE INDEX IF NOT EXISTS idx_claim_requests_status
  ON claim_requests (status);

-- Lookup all claims for a given Sanity listing
CREATE INDEX IF NOT EXISTS idx_claim_requests_listing_sanity_id
  ON claim_requests (listing_sanity_id);

-- Sort claims chronologically in admin view
CREATE INDEX IF NOT EXISTS idx_claim_requests_created_at
  ON claim_requests (created_at DESC);

-- ============================================================
-- events_pending
-- ============================================================

-- Sort pending events by submission date in admin review queue
CREATE INDEX IF NOT EXISTS idx_events_pending_submitted_at
  ON events_pending (submitted_at DESC);

-- ============================================================
-- guest_profiles
-- ============================================================

-- Lookup guest profiles by email (invite flows, dedup)
CREATE INDEX IF NOT EXISTS idx_guest_profiles_email
  ON guest_profiles (email);

-- ============================================================
-- saved_listings
-- ============================================================

-- Count saves per listing / reverse lookup from listing side
CREATE INDEX IF NOT EXISTS idx_saved_listings_sanity_listing_id
  ON saved_listings (sanity_listing_id);

-- ============================================================
-- event_rsvps
-- ============================================================

-- Count RSVPs per event / build attendee lists
CREATE INDEX IF NOT EXISTS idx_event_rsvps_sanity_event_id
  ON event_rsvps (sanity_event_id);

-- Filter RSVPs by going / interested
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status
  ON event_rsvps (status);
