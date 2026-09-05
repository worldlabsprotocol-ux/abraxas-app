-- 079_identity_review_sessions.sql
-- Partner-scoped identity review sessions with purge metadata (additive, non-destructive).

create table if not exists public.identity_review_sessions (
  id                        uuid        primary key default gen_random_uuid(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  capture_session_id        text        not null unique,
  sui_address               text        not null,
  partner_id                text,
  policy_id                 text,
  verification_request_id   text,
  review_status             text        not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected', 'expired')),
  engine_decision           text,
  eligibility_result        text,
  raw_evidence_purged_at    timestamptz,
  raw_evidence_retained_until timestamptz,
  evidence_content_hash     text,
  purge_attempt_count       int         not null default 0,
  last_purge_error_code     text,
  reviewed_at               timestamptz,
  reviewer_id               text,
  reviewer_category         text,
  reason_code               text
);

create index if not exists idx_identity_review_sessions_status_created
  on public.identity_review_sessions (review_status, created_at desc);

create index if not exists idx_identity_review_sessions_partner_status
  on public.identity_review_sessions (partner_id, review_status, created_at desc)
  where partner_id is not null;

create index if not exists idx_identity_review_sessions_policy_status
  on public.identity_review_sessions (policy_id, review_status, created_at desc)
  where policy_id is not null;

create index if not exists idx_identity_review_sessions_sui
  on public.identity_review_sessions (sui_address, review_status, created_at desc);

create index if not exists idx_identity_review_sessions_purge_eligible
  on public.identity_review_sessions (raw_evidence_retained_until, review_status)
  where raw_evidence_purged_at is null
    and review_status in ('approved', 'rejected', 'expired');

create unique index if not exists idx_identity_review_sessions_one_pending_flow
  on public.identity_review_sessions (sui_address, partner_id, verification_request_id)
  where review_status = 'pending'
    and partner_id is not null
    and verification_request_id is not null;

create unique index if not exists idx_identity_review_sessions_one_pending_partner
  on public.identity_review_sessions (sui_address, partner_id)
  where review_status = 'pending'
    and partner_id is not null
    and verification_request_id is null;

alter table public.identity_review_sessions enable row level security;

revoke all on public.identity_review_sessions from anon, authenticated;
grant select, insert, update on public.identity_review_sessions to service_role;

-- Post-apply verification (safe to run repeatedly)
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'identity_review_sessions'
  ) then
    raise exception 'identity_review_sessions table missing after migration 079';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_identity_review_sessions_partner_status'
  ) then
    raise exception 'identity_review_sessions partner index missing';
  end if;
end $$;
