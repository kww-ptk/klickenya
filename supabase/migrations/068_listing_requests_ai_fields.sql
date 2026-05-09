-- Migration 068: Extend listing_requests for /list flow
-- Adds AI-assist, OTP verification, consent, content, and admin fields.
-- All columns use IF NOT EXISTS so re-running is safe.

-- OTP / verification
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS otp_code          text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS otp_expires_at    timestamptz;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS otp_verified       boolean     NOT NULL DEFAULT false;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS otp_verified_at   timestamptz;

-- Submitter identity (supplement existing name/email/phone)
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS business_name     text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS website_url       text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS google_place_id   text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS social_media_url  text;

-- AI analysis
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS ai_score          integer;   -- 0-100
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS ai_summary        text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS ai_flags          text[];    -- array of warning strings
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS ai_analysed_at    timestamptz;

-- Draft listing content (filled by AI or manually by submitter)
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS draft_title       text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS draft_description text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS draft_city        text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS draft_subcategory text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS draft_tags        text[];
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS draft_website     text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS draft_instagram   text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS draft_facebook    text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS draft_phone       text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS draft_email       text;

-- Consent
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS consent_given     boolean     NOT NULL DEFAULT false;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS consent_text      text;

-- Admin
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS admin_notes       text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS reviewed_at       timestamptz;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS reviewed_by       text;       -- admin user id

-- GHL
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS ghl_contact_id     text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS ghl_opportunity_id text;

-- Sanity (set on approve)
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS sanity_listing_id  text;
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS sanity_host_id     text;

-- New status values for this flow:
--   pending_otp  → submitted but OTP not yet verified
--   submitted    → OTP verified, awaiting admin review
--   approved     → admin approved, listing created in Sanity
--   rejected     → admin rejected
-- Existing values (new, responded, converted, closed) remain valid.

-- Index for admin list queries
CREATE INDEX IF NOT EXISTS idx_listing_requests_status     ON listing_requests (status);
CREATE INDEX IF NOT EXISTS idx_listing_requests_created_at ON listing_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_requests_email      ON listing_requests (email);
