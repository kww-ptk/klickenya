-- 089_platform_riders.sql
-- Klickenya's own riders, who work across every restaurant.
--
-- Two kinds of rider, and the difference is who employs them:
--
--   restaurant rider  the kitchen's own guy. Linked to specific menus through
--                     rider_menus, added by the owner, works for them alone.
--   Klickenya rider   hired by the platform. Works any restaurant that
--                     delivers — including ones onboarded next month.
--
-- A flag rather than a row per restaurant. Modelling "all restaurants" as
-- links means every new restaurant needs a backfill across every platform
-- rider, and the day someone forgets, a rider silently stops seeing a kitchen.
-- The flag cannot drift because there is nothing to keep in step.
--
-- rider_menus is still the mechanism for restaurant riders and is untouched.

alter table riders add column if not exists is_platform boolean not null default false;

comment on column riders.is_platform is
  'Klickenya-employed: serves every delivery-enabled menu, present and future. False = restaurant rider, scoped by rider_menus.';

create index if not exists idx_riders_platform on riders(is_platform) where is_platform;
