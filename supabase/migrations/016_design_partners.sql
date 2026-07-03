-- FILE: supabase/migrations/016_design_partners.sql
-- External protocol / design partner applications.

create table if not exists public.design_partners (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact_name text,
  email text not null,
  website text,
  use_case text,
  monthly_volume text,
  integration_type text default 'passport_gate',
  public_name_ok boolean default false,
  status text default 'submitted',
  created_at timestamptz not null default now()
);

create index if not exists design_partners_status_idx on public.design_partners (status);

alter table public.design_partners enable row level security;

grant insert on public.design_partners to anon, authenticated;
create policy "anon_insert_design_partners"
  on public.design_partners for insert to anon, authenticated with check (true);
