-- Add notes column to listing_requests for admin internal notes
ALTER TABLE listing_requests ADD COLUMN IF NOT EXISTS notes text;

-- Add notes column to ambassador_applications for admin internal notes
ALTER TABLE ambassador_applications ADD COLUMN IF NOT EXISTS notes text;
