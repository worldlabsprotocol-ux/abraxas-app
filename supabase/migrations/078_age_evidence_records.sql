-- 078_age_evidence_records.sql
-- Provider-neutral age-evidence ledger (minimum fields, no raw ID documents).

create table if not exists public.age_evidence_records (
  id                      uuid        primary key default gen_random_uuid(),
  created_at              timestamptz not null    default now(),
  updated_at              timestamptz not null    default now(),
  subject_sui_address     text        not null,
  passport_document_id    uuid        references public.passport_documents (id) on delete set null,
  capture_session_id      text,
  evidence_provider       text        not null,
  evidence_type           text        not null,
  assurance_level         text        not null,
  age_threshold           integer     not null,
  provider_decision       text        not null,
  review_status           text        not null,
  provider_reference_hash text,
  reviewer_id             text,
  reviewer_reason         text,
  reviewed_at             timestamptz,
  expires_at              timestamptz,
  credential_jti          text
);

create index if not exists idx_age_evidence_subject_status
  on public.age_evidence_records (subject_sui_address, review_status, created_at desc);

create index if not exists idx_age_evidence_capture_session
  on public.age_evidence_records (capture_session_id)
  where capture_session_id is not null;

alter table public.age_evidence_records enable row level security;

grant select, insert, update on public.age_evidence_records to service_role;

revoke all on public.age_evidence_records from anon, authenticated;

comment on table public.age_evidence_records is
  'Minimum age-evidence metadata for operator review and credential linkage. No DOB or ID images stored here.';
