-- FILE: supabase/migrations/105_eligibility_presentations.sql
-- DEMO-first audience-bound eligibility presentation requests and one-time nonce consumption.
-- Apply DEMO first. Do not auto-apply from Vercel. Safe audit references only.

create table if not exists public.eligibility_presentation_requests (
  request_ref text not null primary key,
  partner_hmac text not null,
  audience_hash text not null,
  policy_id text not null,
  policy_version integer not null,
  purpose text not null,
  action text not null,
  action_scope text not null,
  environment text not null
    check (environment in ('sandbox', 'production')),
  result_category text not null,
  nonce_hash text not null unique,
  status text not null
    check (status in ('created', 'completed', 'issued', 'expired', 'revoked', 'consumed')),
  expires_at timestamptz not null,
  issued_at timestamptz not null,
  presentation_ref text null,
  source_receipt_id text null,
  holder_session_hmac text null,
  consent_bound boolean not null default false,
  revoked_at timestamptz null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eligibility_presentations (
  presentation_ref text not null primary key,
  request_ref text not null,
  partner_hmac text not null,
  audience_hash text not null,
  policy_id text not null,
  policy_version integer not null,
  action text not null,
  action_scope text not null,
  environment text not null
    check (environment in ('sandbox', 'production')),
  result_category text not null,
  nonce_hash text not null unique,
  receipt_verification_ref text not null,
  signing_key_id text not null,
  payload_hash text not null,
  signature text not null,
  status text not null
    check (status in ('issued', 'consumed', 'expired', 'revoked', 'invalid')),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  revoked_at timestamptz null,
  consent_bound boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists eligibility_presentation_requests_audience_idx
  on public.eligibility_presentation_requests (audience_hash, status);

create index if not exists eligibility_presentations_receipt_idx
  on public.eligibility_presentations (receipt_verification_ref, status);

comment on table public.eligibility_presentation_requests is
  'Audience-bound eligibility presentation requests. HMAC, nonce hash, and lifecycle only.';

comment on table public.eligibility_presentations is
  'Issued eligibility presentations. Public receipt refs and signatures. No KYC/KYB evidence.';

alter table public.eligibility_presentation_requests enable row level security;
alter table public.eligibility_presentations enable row level security;

revoke all on public.eligibility_presentation_requests from public;
revoke all on public.eligibility_presentation_requests from anon, authenticated;
grant select, insert, update on public.eligibility_presentation_requests to postgres, service_role;

revoke all on public.eligibility_presentations from public;
revoke all on public.eligibility_presentations from anon, authenticated;
grant select, insert, update on public.eligibility_presentations to postgres, service_role;
