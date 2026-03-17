ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS previous_price decimal,
  ADD COLUMN IF NOT EXISTS completion_percentage int,
  ADD COLUMN IF NOT EXISTS developer_name text,
  ADD COLUMN IF NOT EXISTS units_available int;

CREATE INDEX IF NOT EXISTS idx_properties_is_featured ON properties(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_properties_is_new_development ON properties(is_new_development) WHERE is_new_development = true;
