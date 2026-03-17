ALTER TYPE listing_type ADD VALUE IF NOT EXISTS 'restaurant';

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS cuisine text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price_range text,
  ADD COLUMN IF NOT EXISTS opening_hours text,
  ADD COLUMN IF NOT EXISTS reservation_required boolean DEFAULT false;
