-- FILE: supabase/migrations/015_investment_interest.sql
-- Investor interest submissions from portal and data room.

create table if not exists public.investment_interest (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null,
  asset_name text,
  investment_option text,
  email text not null,
  amount_interest text,
  source text default 'investor_portal',
  created_at timestamptz not null default now()
);

create index if not exists investment_interest_asset_idx
  on public.investment_interest (asset_id);

alter table public.investment_interest enable row level security;

grant insert on public.investment_interest to anon, authenticated;
create policy "anon_insert_investment_interest"
  on public.investment_interest for insert to anon, authenticated with check (true);
