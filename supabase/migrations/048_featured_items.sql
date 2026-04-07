-- 048_featured_items.sql
-- Add is_featured flag to menu_items so owners can highlight up to 5 dishes
-- on the restaurant listing page ("Featured dishes" row).

alter table menu_items
  add column is_featured boolean default false;

-- Partial index — only featured items are queried by the listing page,
-- keeping the index tiny regardless of total item count.
create index on menu_items(section_id, is_featured)
  where is_featured = true;
