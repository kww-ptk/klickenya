-- 084_valuations_property_type.sql
--
-- /api/real-estate/valuation has always inserted a `property_type` column that
-- the valuations table (migration 001) never had. PostgREST rejected every
-- insert with PGRST204, the route logged the error and carried on returning the
-- estimate to the caller, so the failure was invisible and every valuation
-- request was silently dropped. The table is still empty as a result.
--
-- property_type is a real input to the estimate (it drives TYPE_MULTIPLIERS in
-- the route), so storing it is the point.

ALTER TABLE valuations
  ADD COLUMN IF NOT EXISTS property_type text;

COMMENT ON COLUMN valuations.property_type IS
  'apartment | house | villa | studio | townhouse | land | commercial — mirrors the propertyType field on the Sanity property schema.';

-- Valuations are looked up by area when reviewing demand; this index matches
-- the existing (neighbourhood, bedrooms) one for the type-filtered case.
CREATE INDEX IF NOT EXISTS valuations_neighbourhood_type_idx
  ON valuations (neighbourhood, property_type);
