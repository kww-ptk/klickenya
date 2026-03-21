CREATE TABLE claim_requests (
  id                uuid PRIMARY KEY
                    DEFAULT gen_random_uuid(),
  listing_slug      text NOT NULL,
  listing_sanity_id text NOT NULL,
  listing_title     text NOT NULL,
  listing_type      text NOT NULL,
  listing_city      text,
  claimant_name     text NOT NULL,
  claimant_email    text NOT NULL,
  claimant_phone    text NOT NULL,
  otp_code          text NOT NULL,
  otp_expires_at    timestamptz NOT NULL,
  otp_attempts      integer DEFAULT 0,
  status            text DEFAULT 'pending',
  created_at        timestamptz DEFAULT now(),
  verified_at       timestamptz
);

CREATE INDEX idx_claim_slug
  ON claim_requests(listing_slug);

CREATE INDEX idx_claim_email_time
  ON claim_requests(claimant_email, created_at);

ALTER TABLE claim_requests
  ENABLE ROW LEVEL SECURITY;
