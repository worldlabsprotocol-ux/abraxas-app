-- FILE: supabase/migrations/126_zklogin_oauth_jti_consumed.sql
-- Durable one-time OAuth state JTI consumption for multi-instance zkLogin replay protection.
-- Forward-only, idempotent. No destructive changes.

create table if not exists public.zklogin_oauth_jti_consumed (
  jti_hash text primary key,
  consumed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint zklogin_oauth_jti_hash_format check (jti_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists idx_zklogin_oauth_jti_consumed_expires
  on public.zklogin_oauth_jti_consumed (expires_at);

comment on table public.zklogin_oauth_jti_consumed is
  'One-time zkLogin OAuth state JTI hashes. No raw JTI, tokens, or identity payloads.';

alter table public.zklogin_oauth_jti_consumed enable row level security;

revoke all on public.zklogin_oauth_jti_consumed from anon, authenticated;
grant select, insert, delete on public.zklogin_oauth_jti_consumed to service_role;
