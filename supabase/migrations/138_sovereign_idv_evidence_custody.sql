-- 138_sovereign_idv_evidence_custody.sql
-- Portable sovereign IDV: consent, encrypted evidence custody metadata, access audit.
-- Apply on Abraxas-operated PostgreSQL (with core IDV tables from 006–079, 136–137).

-- Ensure identity_verifications supports sovereign IDV state machine (portable additive).
alter table public.identity_verifications
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists user_email text,
  add column if not exists status text default 'pending',
  add column if not exists document_type text,
  add column if not exists document_country text,
  add column if not exists document_state text,
  add column if not exists document_verified boolean not null default false,
  add column if not exists liveness_passed boolean not null default false,
  add column if not exists liveness_provider text,
  add column if not exists veriff_session_id text;

create table if not exists public.passport_idv_consent_records (
  id                  uuid        primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  holder_subject_id   text        not null,
  consent_version     text        not null,
  consent_scope       text        not null,
  ip_hash             text,
  user_agent_hash     text,
  constraint passport_idv_consent_holder_format
    check (holder_subject_id ~ '^abx_hs_[0-9a-f]{32}$')
);

create index if not exists passport_idv_consent_holder_idx
  on public.passport_idv_consent_records (holder_subject_id, created_at desc);

create table if not exists public.abraxas_evidence_custody (
  id                  uuid        primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  holder_subject_id   text        not null,
  capture_session_id  text        not null,
  storage_path        text        not null,
  content_sha256      text        not null,
  encryption_key_id   text        not null default 'env:ABRAXAS_EVIDENCE_ENCRYPTION_KEY',
  retained_until      timestamptz,
  purged_at           timestamptz,
  constraint abraxas_evidence_custody_holder_format
    check (holder_subject_id ~ '^abx_hs_[0-9a-f]{32}$'),
  constraint abraxas_evidence_custody_session_uq unique (capture_session_id)
);

create index if not exists abraxas_evidence_custody_holder_idx
  on public.abraxas_evidence_custody (holder_subject_id, created_at desc);

create table if not exists public.abraxas_evidence_access_audit (
  id                  uuid        primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  holder_subject_id   text        not null,
  capture_session_id  text,
  action              text        not null,
  actor               text        not null,
  outcome             text        not null,
  detail              jsonb
);

create index if not exists abraxas_evidence_access_audit_holder_idx
  on public.abraxas_evidence_access_audit (holder_subject_id, created_at desc);

create table if not exists public.identity_verification_events (
  id                uuid        primary key default gen_random_uuid(),
  sui_address       text        not null default '',
  holder_subject_id text,
  from_status       text,
  to_status         text        not null,
  source            text        not null,
  veriff_session_id text,
  payload_hash      text,
  created_at        timestamptz not null default now()
);

alter table public.identity_verification_events
  add column if not exists holder_subject_id text;

create index if not exists idx_idv_events_holder_subject
  on public.identity_verification_events (holder_subject_id, created_at desc)
  where holder_subject_id is not null;

alter table public.passport_idv_consent_records enable row level security;
alter table public.abraxas_evidence_custody enable row level security;
alter table public.abraxas_evidence_access_audit enable row level security;

revoke all on public.passport_idv_consent_records from public, anon, authenticated;
revoke all on public.abraxas_evidence_custody from public, anon, authenticated;
revoke all on public.abraxas_evidence_access_audit from public, anon, authenticated;

grant select, insert on public.passport_idv_consent_records to service_role;
grant select, insert, update on public.abraxas_evidence_custody to service_role;
grant select, insert on public.abraxas_evidence_access_audit to service_role;
