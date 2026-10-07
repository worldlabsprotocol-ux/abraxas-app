-- FILE: supabase/migrations/136_zklogin_native_auth_bridge.sql
-- Native holder OAuth bridge: encrypted pending zkLogin material + one-time handoff JTIs.

create table if not exists public.zklogin_native_pending (
  jti_hash text primary key,
  pending_ciphertext text not null,
  expires_at timestamptz not null,
  constraint zklogin_native_pending_jti_hash_format check (jti_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists idx_zklogin_native_pending_expires
  on public.zklogin_native_pending (expires_at);

comment on table public.zklogin_native_pending is
  'Encrypted short-lived zkLogin pending sessions for native external-browser OAuth. No raw tokens.';

create table if not exists public.zklogin_native_handoff_consumed (
  jti_hash text primary key,
  consumed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint zklogin_native_handoff_jti_hash_format check (jti_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists idx_zklogin_native_handoff_consumed_expires
  on public.zklogin_native_handoff_consumed (expires_at);

comment on table public.zklogin_native_handoff_consumed is
  'One-time native holder handoff token JTIs. No session secrets or OAuth tokens.';

alter table public.zklogin_native_pending enable row level security;
alter table public.zklogin_native_handoff_consumed enable row level security;

revoke all on public.zklogin_native_pending from anon, authenticated;
revoke all on public.zklogin_native_handoff_consumed from anon, authenticated;
grant select, insert, update, delete on public.zklogin_native_pending to service_role;
grant select, insert, delete on public.zklogin_native_handoff_consumed to service_role;
