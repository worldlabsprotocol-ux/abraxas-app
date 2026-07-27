-- 037_biometric_assessments.sql
-- Abraxas biometric engine scores per capture session.

create table if not exists public.identity_biometric_assessments (
  id                      uuid        primary key default gen_random_uuid(),
  created_at              timestamptz not null    default now(),
  capture_session_id      text        not null unique,
  sui_address             text        not null,
  face_match_score        numeric     not null,
  liveness_score          numeric     not null,
  document_quality_score  numeric     not null,
  selfie_quality_score    numeric     not null,
  decision                text        not null,
  assurance_level         text        not null,
  review_method           text        not null,
  engine_version          text        not null,
  signals                 jsonb,
  analyzed_at             timestamptz not null
);

create index if not exists idx_biometric_assessments_sui
  on public.identity_biometric_assessments (sui_address);

alter table public.identity_biometric_assessments enable row level security;
grant insert, select on public.identity_biometric_assessments to service_role;
