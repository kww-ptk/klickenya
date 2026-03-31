-- Add queryable columns for listing title and type.
-- Previously these were only embedded in the free-text notes column.

ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS listing_title text;
ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS listing_type text;

-- Filter enquiries by listing type (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_contact_requests_listing_type
  ON contact_requests (listing_type);

-- Search enquiries by listing title
CREATE INDEX IF NOT EXISTS idx_contact_requests_listing_title
  ON contact_requests (listing_title);
