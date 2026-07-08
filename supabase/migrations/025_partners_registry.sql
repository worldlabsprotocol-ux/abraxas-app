-- FILE: supabase/migrations/025_partners_registry.sql
-- Partner org registry + richer API usage events (run manually in Supabase SQL editor).

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  partner_id text not null unique,
  company text not null,
  contact_name text,
  contact_email text,
  status text not null default 'active',
  allowed_environments text[] not null default array['sandbox', 'production'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partners_status_idx on public.partners (status);

alter table public.partner_api_usage
  add column if not exists http_status integer,
  add column if not exists response_time_ms integer,
  add column if not exists record_type text,
  add column if not exists record_id text,
  add column if not exists policy_id text,
  add column if not exists policy_version text,
  add column if not exists decision text;

alter table public.partners enable row level security;
