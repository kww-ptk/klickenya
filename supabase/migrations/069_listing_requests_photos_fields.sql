-- Migration 069: Add photo upload and extended content fields to listing_requests
-- All columns use IF NOT EXISTS so re-running is safe.

-- Extended location / pricing fields
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS draft_county     text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS draft_address    text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS draft_price      integer;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS draft_price_unit text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS draft_amenities  text[];

-- Photo uploads (Sanity asset refs)
-- Stored as JSONB array of { assetId: string, url: string, alt: string }
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS draft_photos     jsonb;

-- Photo consent (mirrors the claim flow)
-- Values: yes_all | yes_logo_only | no
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS photo_consent    text;
