-- 038_enquiry_calendar.sql
-- Adds room_id, property_id, calendar_status, and expires_at to contact_requests
-- so that stay enquiries can be linked to PMS rooms and surfaced on the calendar.

-- ============================================================
-- NEW COLUMNS
-- ============================================================

alter table public.contact_requests
  add column if not exists room_id uuid references public.rooms(id) on delete set null,
  add column if not exists property_id uuid references public.properties(id) on delete set null,
  add column if not exists calendar_status text default 'pending'
    check (calendar_status in ('pending','accepted','declined','converted')),
  add column if not exists expires_at timestamptz default (now() + interval '48 hours');

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_contact_requests_room_dates
  on public.contact_requests(room_id, check_in, check_out);

create index if not exists idx_contact_requests_property_calendar_status
  on public.contact_requests(property_id, calendar_status);

-- ============================================================
-- RLS — owners can read/update enquiries for their properties
-- ============================================================

-- SELECT: owner sees enquiries where property_id matches their properties
create policy "contact_requests_owner_select" on public.contact_requests
  for select using (
    property_id in (
      select id from public.properties where owner_id = auth.uid()
    )
  );

-- UPDATE: owner can update enquiries for their own properties
create policy "contact_requests_owner_update" on public.contact_requests
  for update using (
    property_id in (
      select id from public.properties where owner_id = auth.uid()
    )
  );
