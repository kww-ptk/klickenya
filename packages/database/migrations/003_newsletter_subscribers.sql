create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  subscribed_at timestamptz default now() not null,
  unsubscribed_at timestamptz
);

-- Enable RLS
alter table public.newsletter_subscribers enable row level security;

-- Allow inserts from anon (public signup)
create policy "Allow anonymous inserts" on public.newsletter_subscribers
  for insert with check (true);
