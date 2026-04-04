-- 037_fees.sql
-- Fee system for the PMS

-- ============================================================
-- TABLE: property_fees — reusable fee templates per property
-- ============================================================
create table public.property_fees (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references public.properties(id) on delete cascade,
  name           text not null,
  fee_type       text not null default 'fixed'
                   check (fee_type in ('fixed', 'per_night', 'per_guest', 'percentage')),
  -- fixed:      flat one-time fee (e.g. KSh 2,000 cleaning fee)
  -- per_night:  amount × nights (e.g. KSh 500 resort fee / night)
  -- per_guest:  amount × guest_count (e.g. KSh 300 / person)
  -- percentage: % of room subtotal (store 16 for 16% VAT)
  amount         numeric not null check (amount >= 0),
  apply_by_default boolean default true,
  is_active      boolean default true,
  sort_order     int default 0,
  created_at     timestamptz default now()
);

create index idx_property_fees_property_id on public.property_fees(property_id);

alter table public.property_fees enable row level security;

create policy "Owners manage property fees"
  on public.property_fees for all
  using (
    property_id in (
      select id from public.properties where owner_id = auth.uid()
    )
  );

-- ============================================================
-- TABLE: booking_fees — per-booking fee line items
-- Amounts are pre-calculated at booking time and frozen.
-- ============================================================
create table public.booking_fees (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  name        text not null,
  fee_type    text not null,
  amount_kes  numeric not null,
  created_at  timestamptz default now()
);

create index idx_booking_fees_booking_id on public.booking_fees(booking_id);

alter table public.booking_fees enable row level security;

create policy "Owners view booking fees"
  on public.booking_fees for all
  using (
    booking_id in (
      select b.id from public.bookings b
      join public.properties p on b.property_id = p.id
      where p.owner_id = auth.uid()
    )
  );
