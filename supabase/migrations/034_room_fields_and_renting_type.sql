-- 034_room_fields_and_renting_type.sql
-- Add missing room columns + property-level renting config + booking widget slug

-- Rooms: add bed_type and room_size_sqm (exist in Sanity, now in Supabase too)
alter table public.rooms add column if not exists bed_type text;
alter table public.rooms add column if not exists room_size_sqm numeric;

-- Properties: renting type (entire_place, by_room, both)
alter table public.properties add column if not exists renting_type text default 'both';
-- Add check constraint separately (IF NOT EXISTS not supported for constraints)
do $$ begin
  alter table public.properties add constraint properties_renting_type_check
    check (renting_type in ('entire_place','by_room','both'));
exception when duplicate_object then null;
end $$;

-- Properties: entire place price (used when renting_type is 'entire_place' or 'both')
alter table public.properties add column if not exists entire_place_price numeric;

-- Properties: booking widget custom slug (for /b/[slug] standalone page)
alter table public.properties add column if not exists booking_slug text;

-- Unique index on booking_slug (only non-null values)
create unique index if not exists idx_properties_booking_slug
  on public.properties(booking_slug) where booking_slug is not null;
