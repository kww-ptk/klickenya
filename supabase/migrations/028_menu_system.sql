-- 028_menu_system.sql
-- QR Menu + Food Ordering schema (V0)
-- Designed for V3 (delivery) but only V0 features are active.
-- Future columns are nullable — a nullable column costs nothing,
-- a missing column costs a painful migration later.

-- ─── TABLE 1: menus ─────────────────────────────────────────────
create table menus (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid references auth.users(id) on delete cascade not null,
  slug            text unique not null,
  name            text not null,
  is_published    boolean default false,
  currency        text default 'KES',

  -- V1 ordering flags (dormant in V0)
  ordering_enabled  boolean default false,
  table_ordering    boolean default false,
  takeaway_enabled  boolean default false,

  -- V3 delivery fields (nullable, dormant until V3)
  delivery_enabled    boolean default false,
  delivery_radius_km  numeric,
  delivery_fee_kes    numeric,
  min_order_kes       numeric,

  created_at  timestamptz default now()
);

-- ─── TABLE 2: menu_sections ─────────────────────────────────────
create table menu_sections (
  id             uuid primary key default gen_random_uuid(),
  menu_id        uuid references menus(id) on delete cascade not null,
  title          text not null,
  display_order  int default 0,
  is_visible     boolean default true
);

-- ─── TABLE 3: menu_items ────────────────────────────────────────
create table menu_items (
  id             uuid primary key default gen_random_uuid(),
  section_id     uuid references menu_sections(id) on delete cascade not null,
  name           text not null,
  description    text,
  price_kes      numeric not null,
  photo_url      text,
  dietary_tags   text[] default '{}',
  is_available   boolean default true,
  prep_time_min  int,
  display_order  int default 0,
  created_at     timestamptz default now()
);

-- ─── TABLE 4: menu_scans ────────────────────────────────────────
create table menu_scans (
  id          uuid primary key default gen_random_uuid(),
  menu_id     uuid references menus(id) on delete cascade,
  scanned_at  timestamptz default now(),
  user_agent  text
);

-- ─── INDEXES ────────────────────────────────────────────────────
create index idx_menus_slug        on menus(slug);
create index idx_menus_business_id on menus(business_id);
create index idx_menu_items_section_id on menu_items(section_id);
create index idx_menu_scans_menu_scanned on menu_scans(menu_id, scanned_at);

-- ─── RLS ────────────────────────────────────────────────────────
alter table menus         enable row level security;
alter table menu_sections enable row level security;
alter table menu_items    enable row level security;
alter table menu_scans    enable row level security;

-- menus: owners full CRUD
create policy "menus_owner_all" on menus
  for all using (business_id = auth.uid())
  with check  (business_id = auth.uid());

-- menus: public can read published menus
create policy "menus_public_read" on menus
  for select using (is_published = true);

-- menu_sections: owners full CRUD (join through menus)
create policy "menu_sections_owner_all" on menu_sections
  for all using (
    exists (
      select 1 from menus where menus.id = menu_sections.menu_id
        and menus.business_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from menus where menus.id = menu_sections.menu_id
        and menus.business_id = auth.uid()
    )
  );

-- menu_sections: public can read sections of published menus
create policy "menu_sections_public_read" on menu_sections
  for select using (
    exists (
      select 1 from menus where menus.id = menu_sections.menu_id
        and menus.is_published = true
    )
  );

-- menu_items: owners full CRUD (join through sections → menus)
create policy "menu_items_owner_all" on menu_items
  for all using (
    exists (
      select 1 from menu_sections
        join menus on menus.id = menu_sections.menu_id
      where menu_sections.id = menu_items.section_id
        and menus.business_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from menu_sections
        join menus on menus.id = menu_sections.menu_id
      where menu_sections.id = menu_items.section_id
        and menus.business_id = auth.uid()
    )
  );

-- menu_items: public can read items of published menus
create policy "menu_items_public_read" on menu_items
  for select using (
    exists (
      select 1 from menu_sections
        join menus on menus.id = menu_sections.menu_id
      where menu_sections.id = menu_items.section_id
        and menus.is_published = true
    )
  );

-- menu_scans: anyone can insert (no auth needed to record a scan)
create policy "menu_scans_anon_insert" on menu_scans
  for insert with check (true);

-- menu_scans: owners can read their own scans
create policy "menu_scans_owner_read" on menu_scans
  for select using (
    exists (
      select 1 from menus where menus.id = menu_scans.menu_id
        and menus.business_id = auth.uid()
    )
  );
