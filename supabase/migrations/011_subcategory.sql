-- Step 1: Create the subcategory enum
CREATE TYPE listing_subcategory AS ENUM (
  -- Stays
  'villa', 'private_room', 'boutique_hotel', 'lodge_camp', 'hostel', 'unique_stay',
  -- Experiences
  'safari', 'outdoor', 'beaches', 'restaurants', 'cultural', 'wellness', 'family',
  -- Events
  'parties', 'festival', 'art_culture', 'wellness_sport', 'networking', 'kids', 'other',
  -- Services
  'rentals', 'transfers', 'private_chef', 'wellness_service', 'supermarkets', 'pharmacy', 'fundis', 'it_marketing', 'utility_shops',
  -- Real Estate
  'for_sale', 'land_plots', 'commercial', 'new_developments'
);

-- Step 2: Add subcategory column to listings table
ALTER TABLE listings ADD COLUMN subcategory listing_subcategory;

-- Step 3: Add tags column (array of text) if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'tags'
  ) THEN
    ALTER TABLE listings ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
END $$;

-- Step 4: Index for fast filtering
CREATE INDEX idx_listings_subcategory ON listings (subcategory) WHERE subcategory IS NOT NULL;
CREATE INDEX idx_listings_tags ON listings USING GIN (tags) WHERE tags IS NOT NULL;

-- Step 5: Composite index for fast filtered queries
CREATE INDEX idx_listings_type_subcategory_status ON listings (type, subcategory, status);

-- Step 6: Rebuild search_vector to include subcategory
ALTER TABLE listings DROP COLUMN IF EXISTS search_vector;
ALTER TABLE listings ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('english',
    coalesce(title, '') || ' ' ||
    coalesce(city, '') || ' ' ||
    coalesce(county, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(subcategory::text, '')
  )
) STORED;
CREATE INDEX idx_listings_search_vector ON listings USING GIN (search_vector);
