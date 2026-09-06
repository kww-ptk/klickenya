-- 085_property_enquiries_schema_drift.sql
--
-- The property enquiry form has never worked. `property_enquiries` was created
-- in 001 and never touched again, while the route, the whole admin surface and
-- packages/shared/types all moved on to a different shape. Every submission
-- failed the PostgREST insert and returned "Failed to submit enquiry", and the
-- table has zero rows to show for it.
--
-- Drift, as of this migration:
--   route inserts      name, property_title, mortgage_interest
--   table has          full_name, and neither of the other two
--   admin reads        name, property_title, mortgage_interest, notes
--   shared types say   name, property_title
--   queries.ts says    full_name
--
-- The table is the outlier, so it moves. Nothing is renamed away from what the
-- application already expects.

BEGIN;

-- `full_name` -> `name`. Guarded because RENAME is not idempotent, and because
-- a partially applied run should be re-runnable.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'property_enquiries' AND column_name = 'full_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'property_enquiries' AND column_name = 'name'
  ) THEN
    ALTER TABLE property_enquiries RENAME COLUMN full_name TO name;
  END IF;
END $$;

-- Which property the enquiry is about, denormalised. The admin list, the detail
-- page, the AI draft-reply prompt and the notification email all read it, and
-- resolving a Sanity title per row on every admin page load is not worth it.
ALTER TABLE property_enquiries
  ADD COLUMN IF NOT EXISTS property_title text;

-- Set on the form and shown in the admin detail view.
ALTER TABLE property_enquiries
  ADD COLUMN IF NOT EXISTS mortgage_interest boolean NOT NULL DEFAULT false;

-- Admin notes. /api/admin/property-enquiries/[id]/note writes this and the
-- detail page renders it. Same omission as listing_requests.admin_notes in 068.
ALTER TABLE property_enquiries
  ADD COLUMN IF NOT EXISTS notes text;

-- property_id holds a SANITY document _id, not a row in the Supabase
-- `properties` table. Properties are content and live in Sanity; this table is
-- transactional (see the architecture rule in CLAUDE.md). A foreign key across
-- that boundary can never be satisfied, so every insert would still have failed
-- even once the columns above existed. The uuid type has to go too: Sanity ids
-- are usually uuid shaped but are not guaranteed to be.
ALTER TABLE property_enquiries
  DROP CONSTRAINT IF EXISTS property_enquiries_property_id_fkey;

ALTER TABLE property_enquiries
  ALTER COLUMN property_id TYPE text USING property_id::text;

-- Same reasoning for agent_id: the route never sets it today, but the reference
-- it would carry is a Sanity agent document, not a Supabase row.
ALTER TABLE property_enquiries
  DROP CONSTRAINT IF EXISTS property_enquiries_agent_id_fkey;

ALTER TABLE property_enquiries
  ALTER COLUMN agent_id TYPE text USING agent_id::text;

-- The admin list filters by status and orders by created_at on every load.
CREATE INDEX IF NOT EXISTS property_enquiries_status_created_idx
  ON property_enquiries (status, created_at DESC);

-- /admin/real-estate counts enquiries per property.
CREATE INDEX IF NOT EXISTS property_enquiries_property_id_idx
  ON property_enquiries (property_id);

COMMIT;
