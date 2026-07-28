-- 050_identity_review_workflow.sql
-- Immutable admin identity review audit trail + reviewer decisions (separate from engine).

create table if not exists public.identity_review_audit_log (
  id                      uuid        primary key default gen_random_uuid(),
  created_at              timestamptz not null    default now(),
  capture_session_id      text,
  passport_document_id    uuid        references public.passport_documents (id) on delete set null,
  sui_address             text,
  reviewer_id             text        not null,
  action                  text        not null,
  previous_status         text,
  new_status              text        not null,
  engine_decision         text,
  reviewer_decision       text        not null,
  rejection_reasons       text[],
  notes                   text,
  biometric_engine_version text
);

create index if not exists idx_identity_review_audit_session
  on public.identity_review_audit_log (capture_session_id, created_at desc);

create index if not exists idx_identity_review_audit_sui
  on public.identity_review_audit_log (sui_address, created_at desc);

alter table public.identity_biometric_assessments
  add column if not exists reviewer_decision text,
  add column if not exists reviewer_id       text,
  add column if not exists reviewed_at       timestamptz;

alter table public.identity_review_audit_log enable row level security;

grant insert, select on public.identity_review_audit_log to service_role;

-- Immutable audit log: no updates or deletes via API roles.
revoke update, delete on public.identity_review_audit_log from anon, authenticated, service_role;
