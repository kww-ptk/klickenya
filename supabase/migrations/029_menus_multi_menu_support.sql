-- 029_menus_multi_menu_support.sql
-- Add listing_slug and display_name to support multiple menus per restaurant.
-- listing_slug groups menus by restaurant listing.
-- display_name is the human-readable name shown in the dashboard.
-- slug remains the public URL identifier (/m/[slug]).

ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS listing_slug text,
  ADD COLUMN IF NOT EXISTS display_name text;

-- Backfill existing rows: listing_slug = slug, display_name = name
UPDATE menus
  SET listing_slug = slug,
      display_name = name
  WHERE listing_slug IS NULL;
