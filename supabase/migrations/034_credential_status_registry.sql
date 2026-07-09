-- 034_credential_status_registry.sql
-- Credential Status Registry — live claim status, audit events, receipt dependencies.
--
-- Prerequisite: 018_policy_verification.sql, 033_decision_receipts.sql
--
-- ── PREFLIGHT ────────────────────────────────────────────────────
-- select to_regclass('public.credential_claims') as credential_claims;
-- select to_regclass('public.decision_receipts') as decision_receipts;
-- select distinct status from public.credential_claims;
--
-- ── POST-MIGRATION VERIFICATION ──────────────────────────────────
-- select to_regclass('public.credential_status_events') as credential_status_events;
-- select to_regclass('public.receipt_claim_dependencies') as receipt_claim_dependencies;
-- select column_name from information_schema.columns
--  where table_schema='public' and table_name='credential_claims'
--    and column_name in ('status_updated_at','status_reason_code','status_changed_by');

create extension if not exists "pgcrypto";

-- Extend credential_claims status lifecycle
alter table public.credential_claims
  add column if not exists status_updated_at timestamptz,
  add column if not exists status_reason_code text,
  add column if not exists status_changed_by text;

update public.credential_claims
set status_updated_at = coalesce(status_updated_at, updated_at, issued_at)
where status_updated_at is null;

-- Replace status check to include under_review (idempotent via drop/recreate)
alter table public.credential_claims drop constraint if exists credential_claims_status_check;
alter table public.credential_claims
  add constraint credential_claims_status_check
  check (status in ('active','suspended','revoked','expired','under_review'));

-- Immutable status transition log
create table if not exists public.credential_status_events (
  id                  uuid        primary key default gen_random_uuid(),
  claim_id            uuid        not null references public.credential_claims(id) on delete cascade,
  from_status         text,
  to_status           text        not null
                      check (to_status in ('active','suspended','revoked','expired','under_review')),
  reason_code         text,
  changed_by          text        not null default 'system',
  idempotency_key     text,
  metadata            jsonb       not null default '{}',
  affected_receipt_ids text[]     not null default '{}',
  created_at          timestamptz not null default now(),
  unique (idempotency_key)
);

create index if not exists idx_credential_status_events_claim
  on public.credential_status_events (claim_id, created_at desc);

-- Links decision receipts to claims used at evaluation time
create table if not exists public.receipt_claim_dependencies (
  id                uuid        primary key default gen_random_uuid(),
  receipt_id        text        not null references public.decision_receipts(id) on delete cascade,
  claim_id          uuid        not null references public.credential_claims(id) on delete restrict,
  claim_type        text        not null,
  issuer_id         text        not null,
  signing_key_id    text,
  created_at        timestamptz not null default now(),
  unique (receipt_id, claim_id)
);

create index if not exists idx_receipt_claim_deps_receipt
  on public.receipt_claim_dependencies (receipt_id);

create index if not exists idx_receipt_claim_deps_claim
  on public.receipt_claim_dependencies (claim_id);

alter table public.credential_status_events enable row level security;
alter table public.receipt_claim_dependencies enable row level security;
