-- 139_sovereign_idv_claims_evidence.sql
-- Multi-artifact evidence custody, sovereign issuance audit (portable, disposable PG).

alter table public.abraxas_evidence_custody
  add column if not exists artifact_kind text not null default 'bundle';

alter table public.abraxas_evidence_custody
  drop constraint if exists abraxas_evidence_custody_session_uq;

create unique index if not exists abraxas_evidence_custody_session_artifact_uq
  on public.abraxas_evidence_custody (capture_session_id, artifact_kind);

create table if not exists public.sovereign_credential_issuance_audit (
  id                  uuid        primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  holder_subject_id   text        not null,
  credential_jti      text        not null,
  capture_session_id  text,
  source              text        not null,
  claim_count         int         not null,
  outcome             text        not null check (outcome in ('committed', 'rejected_duplicate', 'failed')),
  detail              jsonb
);

create index if not exists sovereign_credential_issuance_audit_subject_idx
  on public.sovereign_credential_issuance_audit (holder_subject_id, created_at desc);

alter table public.sovereign_credential_issuance_audit enable row level security;
revoke all on public.sovereign_credential_issuance_audit from public, anon, authenticated;
grant select, insert on public.sovereign_credential_issuance_audit to service_role;
