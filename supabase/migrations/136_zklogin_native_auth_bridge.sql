-- FILE: supabase/migrations/136_zklogin_native_auth_bridge.sql
-- Native holder OAuth bridge: encrypted pending zkLogin material + one-time handoff codes.

create table if not exists public.zklogin_native_pending (
  jti_hash text primary key,
  pending_ciphertext text not null,
  consume_verifier_hash text not null,
  expires_at timestamptz not null,
  constraint zklogin_native_pending_jti_hash_format check (jti_hash ~ '^[a-f0-9]{64}$'),
  constraint zklogin_native_pending_verifier_hash_format check (consume_verifier_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists idx_zklogin_native_pending_expires
  on public.zklogin_native_pending (expires_at);

comment on table public.zklogin_native_pending is
  'Encrypted short-lived zkLogin pending sessions for native external-browser OAuth. Includes consume verifier hash.';

create table if not exists public.zklogin_native_handoff_pending (
  handoff_code_hash text primary key,
  oauth_jti_hash text not null,
  consume_verifier_hash text not null,
  handoff_ciphertext text not null,
  expires_at timestamptz not null,
  constraint zklogin_native_handoff_code_hash_format check (handoff_code_hash ~ '^[a-f0-9]{64}$'),
  constraint zklogin_native_handoff_oauth_jti_hash_format check (oauth_jti_hash ~ '^[a-f0-9]{64}$'),
  constraint zklogin_native_handoff_verifier_hash_format check (consume_verifier_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists idx_zklogin_native_handoff_pending_expires
  on public.zklogin_native_handoff_pending (expires_at);

comment on table public.zklogin_native_handoff_pending is
  'Opaque native handoff codes awaiting WebView consume verifier. No OAuth tokens in URLs.';

create table if not exists public.zklogin_native_handoff_consumed (
  handoff_code_hash text primary key,
  consumed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint zklogin_native_handoff_consumed_code_hash_format check (handoff_code_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists idx_zklogin_native_handoff_consumed_expires
  on public.zklogin_native_handoff_consumed (expires_at);

comment on table public.zklogin_native_handoff_consumed is
  'One-time native holder handoff code consumption ledger.';

create table if not exists public.zklogin_native_auth_rate_limit (
  bucket_hash text primary key,
  window_start timestamptz not null,
  request_count integer not null default 1,
  expires_at timestamptz not null
);

create index if not exists idx_zklogin_native_auth_rate_limit_expires
  on public.zklogin_native_auth_rate_limit (expires_at);

alter table public.zklogin_native_pending enable row level security;
alter table public.zklogin_native_handoff_pending enable row level security;
alter table public.zklogin_native_handoff_consumed enable row level security;
alter table public.zklogin_native_auth_rate_limit enable row level security;

revoke all on public.zklogin_native_pending from anon, authenticated;
revoke all on public.zklogin_native_handoff_pending from anon, authenticated;
revoke all on public.zklogin_native_handoff_consumed from anon, authenticated;
revoke all on public.zklogin_native_auth_rate_limit from anon, authenticated;

grant select, insert, update, delete on public.zklogin_native_pending to service_role;
grant select, insert, delete on public.zklogin_native_handoff_pending to service_role;
grant select, insert, delete on public.zklogin_native_handoff_consumed to service_role;
grant select, insert, update, delete on public.zklogin_native_auth_rate_limit to service_role;
