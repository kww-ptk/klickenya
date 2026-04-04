-- 036_pricing_rules.sql
-- Season pricing rules for the PMS

create table public.pricing_rules (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties(id) on delete cascade,
  name          text not null,
  start_date    date not null,
  end_date      date not null,
  price_type    text not null default 'multiplier'
                  check (price_type in ('multiplier', 'fixed')),
  -- multiplier: e.g. 1.5 = 50% above base price
  -- fixed:      e.g. 25000 = KSh 25,000 / night regardless of room base price
  value         numeric not null check (value > 0),
  priority      int not null default 0, -- higher number = takes precedence when rules overlap
  is_active     boolean default true,
  created_at    timestamptz default now(),

  constraint pricing_rules_dates_check check (end_date >= start_date)
);

create index idx_pricing_rules_property_id on public.pricing_rules(property_id);
create index idx_pricing_rules_dates on public.pricing_rules(start_date, end_date);

-- RLS: owners manage their own pricing rules
alter table public.pricing_rules enable row level security;

create policy "Owners manage pricing rules"
  on public.pricing_rules
  for all
  using (
    property_id in (
      select id from public.properties where owner_id = auth.uid()
    )
  );
