-- FILE: supabase/migrations/125_scale_operations_durable_state.sql
-- Durable transient state for multi-instance Partner Flow correctness.
-- Forward-only, idempotent. No destructive changes.

-- Provenance partner-flow session context (artifact hash binding across steps).
create table if not exists public.provenance_flow_sessions (
  verification_request_id uuid primary key,
  partner_id text not null,
  policy_id text not null,
  expected_content_hash text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint provenance_flow_sessions_hash_format check (
    expected_content_hash is null or expected_content_hash ~ '^[a-f0-9]{64}$'
  )
);

create index if not exists idx_provenance_flow_sessions_expires
  on public.provenance_flow_sessions (expires_at);

comment on table public.provenance_flow_sessions is
  'Transient provenance partner-flow context. Hash-only artifact binding; no raw content.';

-- Holder disclosure submission pointer (subject + policy → content hash).
create table if not exists public.provenance_content_submissions (
  subject_id text not null,
  policy_id text not null,
  content_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (subject_id, policy_id),
  constraint provenance_content_submissions_hash_format check (content_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists idx_provenance_content_submissions_expires
  on public.provenance_content_submissions (expires_at);

comment on table public.provenance_content_submissions is
  'Transient provenance submission hash pointer. No artifact bytes or internal artifact ids.';

-- Organization eligibility one-time consent records.
create table if not exists public.organization_eligibility_consents (
  consent_ref text primary key,
  partner_hmac text not null,
  result_category text not null,
  purpose text not null,
  action text not null,
  action_scope text not null,
  environment text not null check (environment in ('sandbox', 'production')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  consumed_at timestamptz
);

create index if not exists idx_organization_eligibility_consents_partner
  on public.organization_eligibility_consents (partner_hmac, expires_at);

comment on table public.organization_eligibility_consents is
  'One-time organization eligibility consent. Opaque refs only; no KYB/PII payloads.';

-- Sandbox readiness idempotent stage runs (tenant-scoped).
create table if not exists public.sandbox_readiness_runs (
  partner_id text not null,
  application_id text not null,
  stage text not null,
  idempotency_key text not null,
  status text not null,
  code text not null,
  detail text not null,
  recorded_at timestamptz not null default now(),
  primary key (partner_id, application_id, stage, idempotency_key)
);

create index if not exists idx_sandbox_readiness_runs_application
  on public.sandbox_readiness_runs (application_id, recorded_at desc);

comment on table public.sandbox_readiness_runs is
  'Idempotent sandbox readiness stage results. TEST-only surface; never issues production receipts.';

alter table public.provenance_flow_sessions enable row level security;
alter table public.provenance_content_submissions enable row level security;
alter table public.organization_eligibility_consents enable row level security;
alter table public.sandbox_readiness_runs enable row level security;

grant select, insert, update, delete on public.provenance_flow_sessions to service_role;
grant select, insert, update, delete on public.provenance_content_submissions to service_role;
grant select, insert, update, delete on public.organization_eligibility_consents to service_role;
grant select, insert, update, delete on public.sandbox_readiness_runs to service_role;
