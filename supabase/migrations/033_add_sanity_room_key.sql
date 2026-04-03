-- 033_add_sanity_room_key.sql
-- Maps Supabase rooms to Sanity room _key for listing connection

alter table public.rooms add column if not exists sanity_room_key text;

create index idx_rooms_sanity_room_key on public.rooms(sanity_room_key)
  where sanity_room_key is not null;
