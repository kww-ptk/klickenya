-- Backfill listing_title and listing_type from the notes text field
-- for existing contact_requests created before migration 024.
-- Notes format: "Listing: {title} ({sanity_id})\nType: {type}\n..."

UPDATE contact_requests
SET listing_title = substring(notes::text from 'Listing: (.+?)(?:\s*\()')
WHERE listing_title IS NULL AND notes IS NOT NULL;

UPDATE contact_requests
SET listing_type = substring(notes::text from 'Type: (.+)')
WHERE listing_type IS NULL AND notes IS NOT NULL;
