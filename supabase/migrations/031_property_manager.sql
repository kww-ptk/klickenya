-- 031_property_manager.sql
-- V0 Property Manager System (PMS)
-- Design for V4, build for V0. Future columns nullable now.

-- ============================================================
-- TABLE 1: properties
-- ============================================================
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  listing_slug text,
  name text not null,
  property_type text check (property_type in ('villa','hotel','guesthouse','apartment','cottage','camp')),
  is_entire_property boolean default false,
  address text,
  city text,
  county text,
  latitude numeric,
  longitude numeric,
  check_in_time time default '14:00',
  check_out_time time default '11:00',
  min_stay_nights int default 1,
  max_stay_nights int,
  base_currency text default 'KES',
  weekend_multiplier numeric default 1.0,
  kra_pin text,                        -- V2: eTIMS
  etims_enabled boolean default false,  -- V2
  team_enabled boolean default false,   -- V3
  channel_manager_id text,              -- V4
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLE 2: rooms
-- ============================================================
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  room_number text,
  room_type text default 'standard',
  max_guests int not null default 2,
  base_price_kes numeric not null,
  description text,
  amenities text[] default '{}',
  photos text[] default '{}',
  is_active boolean default true,
  display_order int default 0,
  ical_export_token text unique default gen_random_uuid()::text,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLE 3: bookings
-- ============================================================
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  source text default 'direct' check (source in ('direct','airbnb','booking_com','manual','walkin')),
  external_id text,
  check_in_date date not null,
  check_out_date date not null,
  nights int generated always as (check_out_date - check_in_date) stored,
  guest_name text not null,
  guest_email text,
  guest_phone text,
  guest_count int default 1,
  guest_notes text,
  rate_per_night numeric not null,
  subtotal_kes numeric not null,
  discount_kes numeric default 0,
  extras_kes numeric default 0,          -- V3: upsells
  total_kes numeric not null,
  amount_paid_kes numeric default 0,
  balance_kes numeric generated always as (total_kes - amount_paid_kes) stored,
  status text default 'confirmed' check (status in ('confirmed','checked_in','checked_out','cancelled','no_show')),
  payment_status text default 'pending' check (payment_status in ('pending','partial','paid','refunded')),
  mpesa_ref text,                        -- V1
  etims_receipt_no text,                 -- V2
  etims_issued_at timestamptz,           -- V2
  assigned_staff_id uuid,               -- V3
  internal_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_dates check (check_out_date > check_in_date)
);

-- ============================================================
-- TABLE 4: booking_payments
-- ============================================================
create table public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount_kes numeric not null,
  method text not null check (method in ('mpesa','cash','bank_transfer','card','ota')),
  reference text,
  notes text,
  recorded_by uuid references auth.users(id),
  paid_at timestamptz default now()
);

-- ============================================================
-- TABLE 5: blocked_dates
-- ============================================================
create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLE 6: ical_feeds (V1 — schema now, activate later)
-- ============================================================
create table public.ical_feeds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  source text not null check (source in ('airbnb','booking_com','vrbo','agoda','other')),
  feed_url text not null,
  last_synced timestamptz,
  last_error text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLE 7: pricing_rules (V2 — schema now, activate later)
-- ============================================================
create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  rule_type text,
  start_date date,
  end_date date,
  price_override numeric,
  multiplier numeric,
  min_stay_nights int,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_properties_owner_id on public.properties(owner_id);
create index idx_properties_listing_slug on public.properties(listing_slug);
create index idx_rooms_property_id on public.rooms(property_id);
create index idx_bookings_property_id on public.bookings(property_id);
create index idx_bookings_room_id on public.bookings(room_id);
create index idx_bookings_dates on public.bookings(check_in_date, check_out_date);
create index idx_bookings_status on public.bookings(status);
create index idx_blocked_dates_room_dates on public.blocked_dates(room_id, start_date, end_date);
create index idx_ical_feeds_room_id on public.ical_feeds(room_id);
create index idx_booking_payments_booking_id on public.booking_payments(booking_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- properties: owner_id = auth.uid()
alter table public.properties enable row level security;

create policy "properties_select" on public.properties
  for select using (owner_id = auth.uid());
create policy "properties_insert" on public.properties
  for insert with check (owner_id = auth.uid());
create policy "properties_update" on public.properties
  for update using (owner_id = auth.uid());
create policy "properties_delete" on public.properties
  for delete using (owner_id = auth.uid());

-- rooms: via property → owner_id
alter table public.rooms enable row level security;

create policy "rooms_select" on public.rooms
  for select using (
    exists (select 1 from public.properties where id = rooms.property_id and owner_id = auth.uid())
  );
create policy "rooms_insert" on public.rooms
  for insert with check (
    exists (select 1 from public.properties where id = rooms.property_id and owner_id = auth.uid())
  );
create policy "rooms_update" on public.rooms
  for update using (
    exists (select 1 from public.properties where id = rooms.property_id and owner_id = auth.uid())
  );
create policy "rooms_delete" on public.rooms
  for delete using (
    exists (select 1 from public.properties where id = rooms.property_id and owner_id = auth.uid())
  );

-- bookings: via property → owner_id
alter table public.bookings enable row level security;

create policy "bookings_select" on public.bookings
  for select using (
    exists (select 1 from public.properties where id = bookings.property_id and owner_id = auth.uid())
  );
create policy "bookings_insert" on public.bookings
  for insert with check (
    exists (select 1 from public.properties where id = bookings.property_id and owner_id = auth.uid())
  );
create policy "bookings_update" on public.bookings
  for update using (
    exists (select 1 from public.properties where id = bookings.property_id and owner_id = auth.uid())
  );
create policy "bookings_delete" on public.bookings
  for delete using (
    exists (select 1 from public.properties where id = bookings.property_id and owner_id = auth.uid())
  );

-- booking_payments: via booking → property → owner_id
alter table public.booking_payments enable row level security;

create policy "booking_payments_select" on public.booking_payments
  for select using (
    exists (
      select 1 from public.bookings b
      join public.properties p on p.id = b.property_id
      where b.id = booking_payments.booking_id and p.owner_id = auth.uid()
    )
  );
create policy "booking_payments_insert" on public.booking_payments
  for insert with check (
    exists (
      select 1 from public.bookings b
      join public.properties p on p.id = b.property_id
      where b.id = booking_payments.booking_id and p.owner_id = auth.uid()
    )
  );
create policy "booking_payments_update" on public.booking_payments
  for update using (
    exists (
      select 1 from public.bookings b
      join public.properties p on p.id = b.property_id
      where b.id = booking_payments.booking_id and p.owner_id = auth.uid()
    )
  );
create policy "booking_payments_delete" on public.booking_payments
  for delete using (
    exists (
      select 1 from public.bookings b
      join public.properties p on p.id = b.property_id
      where b.id = booking_payments.booking_id and p.owner_id = auth.uid()
    )
  );

-- blocked_dates: via room → property → owner_id
alter table public.blocked_dates enable row level security;

create policy "blocked_dates_select" on public.blocked_dates
  for select using (
    exists (
      select 1 from public.rooms r
      join public.properties p on p.id = r.property_id
      where r.id = blocked_dates.room_id and p.owner_id = auth.uid()
    )
  );
create policy "blocked_dates_insert" on public.blocked_dates
  for insert with check (
    exists (
      select 1 from public.rooms r
      join public.properties p on p.id = r.property_id
      where r.id = blocked_dates.room_id and p.owner_id = auth.uid()
    )
  );
create policy "blocked_dates_update" on public.blocked_dates
  for update using (
    exists (
      select 1 from public.rooms r
      join public.properties p on p.id = r.property_id
      where r.id = blocked_dates.room_id and p.owner_id = auth.uid()
    )
  );
create policy "blocked_dates_delete" on public.blocked_dates
  for delete using (
    exists (
      select 1 from public.rooms r
      join public.properties p on p.id = r.property_id
      where r.id = blocked_dates.room_id and p.owner_id = auth.uid()
    )
  );

-- ical_feeds: via room → property → owner_id
alter table public.ical_feeds enable row level security;

create policy "ical_feeds_select" on public.ical_feeds
  for select using (
    exists (
      select 1 from public.rooms r
      join public.properties p on p.id = r.property_id
      where r.id = ical_feeds.room_id and p.owner_id = auth.uid()
    )
  );
create policy "ical_feeds_insert" on public.ical_feeds
  for insert with check (
    exists (
      select 1 from public.rooms r
      join public.properties p on p.id = r.property_id
      where r.id = ical_feeds.room_id and p.owner_id = auth.uid()
    )
  );
create policy "ical_feeds_update" on public.ical_feeds
  for update using (
    exists (
      select 1 from public.rooms r
      join public.properties p on p.id = r.property_id
      where r.id = ical_feeds.room_id and p.owner_id = auth.uid()
    )
  );
create policy "ical_feeds_delete" on public.ical_feeds
  for delete using (
    exists (
      select 1 from public.rooms r
      join public.properties p on p.id = r.property_id
      where r.id = ical_feeds.room_id and p.owner_id = auth.uid()
    )
  );

-- pricing_rules: via room → property → owner_id
alter table public.pricing_rules enable row level security;

create policy "pricing_rules_select" on public.pricing_rules
  for select using (
    exists (
      select 1 from public.rooms r
      join public.properties p on p.id = r.property_id
      where r.id = pricing_rules.room_id and p.owner_id = auth.uid()
    )
  );
create policy "pricing_rules_insert" on public.pricing_rules
  for insert with check (
    exists (
      select 1 from public.rooms r
      join public.properties p on p.id = r.property_id
      where r.id = pricing_rules.room_id and p.owner_id = auth.uid()
    )
  );
create policy "pricing_rules_update" on public.pricing_rules
  for update using (
    exists (
      select 1 from public.rooms r
      join public.properties p on p.id = r.property_id
      where r.id = pricing_rules.room_id and p.owner_id = auth.uid()
    )
  );
create policy "pricing_rules_delete" on public.pricing_rules
  for delete using (
    exists (
      select 1 from public.rooms r
      join public.properties p on p.id = r.property_id
      where r.id = pricing_rules.room_id and p.owner_id = auth.uid()
    )
  );

-- ============================================================
-- AVAILABILITY FUNCTION
-- ============================================================
create or replace function public.is_room_available(
  p_room_id uuid,
  p_check_in date,
  p_check_out date
)
returns boolean
language plpgsql
security definer
as $$
begin
  -- Check for overlapping bookings (excluding cancelled)
  if exists (
    select 1 from public.bookings
    where room_id = p_room_id
      and status not in ('cancelled')
      and check_in_date < p_check_out
      and check_out_date > p_check_in
  ) then
    return false;
  end if;

  -- Check for overlapping blocked dates
  if exists (
    select 1 from public.blocked_dates
    where room_id = p_room_id
      and start_date < p_check_out
      and end_date > p_check_in
  ) then
    return false;
  end if;

  return true;
end;
$$;
