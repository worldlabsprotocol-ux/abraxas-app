-- FILE: supabase/migrations/024_partner_api_keys.sql
-- Partner API keys + usage logging for verify endpoints (run manually in Supabase SQL editor).

create table if not exists public.partner_api_keys (
  id uuid primary key default gen_random_uuid(),
  partner_id text not null,
  display_name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default array['verify:credential', 'verify:registry'],
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists partner_api_keys_hash_idx
  on public.partner_api_keys (key_hash)
  where revoked_at is null;

create index if not exists partner_api_keys_partner_idx
  on public.partner_api_keys (partner_id);

create table if not exists public.partner_api_usage (
  id uuid primary key default gen_random_uuid(),
  partner_id text,
  api_key_id uuid references public.partner_api_keys(id) on delete set null,
  endpoint text not null,
  method text not null,
  success boolean,
  response_state text,
  created_at timestamptz not null default now()
);

create index if not exists partner_api_usage_created_idx
  on public.partner_api_usage (created_at desc);

create index if not exists partner_api_usage_partner_idx
  on public.partner_api_usage (partner_id, created_at desc);

alter table public.partner_api_keys enable row level security;
alter table public.partner_api_usage enable row level security;
