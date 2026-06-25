-- 075: Make host/account deletion possible by relaxing the two RESTRICT
-- foreign keys to auth.users.
--
-- Bug: deleting a host via /admin/hosts (auth.admin.deleteUser) failed with a
-- foreign-key violation because these columns reference auth.users with NO
-- ON DELETE rule (RESTRICT). The failed auth delete happened AFTER host_profiles
-- and public.users were already removed, leaving a partial-deleted host whose
-- email stayed reserved in auth.users — so re-creating with the same email
-- returned "A user with this email address has already been registered".
--
-- Fix: ON DELETE SET NULL. The analytics / payment rows are preserved; only the
-- link to the deleted user is cleared. (apps/web/lib/admin/deleteHost.ts also
-- nulls these columns before the auth delete as a pre-migration safety net.)
--
-- Note: migration numbering on disk has a collision at 073 (073_partner_linkage
-- and 073_staff_cross_station_access) plus 074_reservation_source_tracking, so
-- 075 is the next free number.

ALTER TABLE public.listing_events
  DROP CONSTRAINT IF EXISTS listing_events_host_user_id_fkey,
  ADD CONSTRAINT listing_events_host_user_id_fkey
    FOREIGN KEY (host_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.booking_payments
  DROP CONSTRAINT IF EXISTS booking_payments_recorded_by_fkey,
  ADD CONSTRAINT booking_payments_recorded_by_fkey
    FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;
