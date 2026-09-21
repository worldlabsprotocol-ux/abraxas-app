-- FILE: supabase/migrations/104_reclaim_private_attestation_sessions.sql
-- DEMO-first Reclaim private attestation sessions and proof-digest replay protection.
-- Apply DEMO first. Do not auto-apply from Vercel. Do not store raw proofs.

create table if not exists public.reclaim_private_attestation_sessions (
  session_ref text not null primary key,
  holder_hmac text not null,
  verify_request_hmac text not null,
  policy_hmac text not null,
  policy_id text not null,
  policy_version integer not null,
  method_category text not null
    check (method_category = 'privacy_preserving'),
  result_class text not null,
  assurance_level text not null,
  environment text not null
    check (environment in ('sandbox', 'production')),
  mapping_id text not null,
  provider_id text not null,
  provider_version text not null,
  nonce_hash text not null unique,
  context_hmac text not null,
  callback_ref text not null,
  status text not null
    check (status in ('created', 'accepted', 'cancelled', 'expired', 'invalid', 'replayed')),
  proof_digest text unique,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  cancelled_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reclaim_private_attestation_sessions_holder_idx
  on public.reclaim_private_attestation_sessions (holder_hmac, verify_request_hmac, status);

comment on table public.reclaim_private_attestation_sessions is
  'Opaque Reclaim private attestation sessions. HMAC/digest and lifecycle only. Raw proofs stay in memory.';

alter table public.reclaim_private_attestation_sessions enable row level security;

revoke all on public.reclaim_private_attestation_sessions from public;
revoke all on public.reclaim_private_attestation_sessions from anon, authenticated;
grant select, insert, update on public.reclaim_private_attestation_sessions to postgres, service_role;
