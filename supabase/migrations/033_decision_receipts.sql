-- 033_decision_receipts.sql
-- Decision Receipts v1 — signed, time-bound policy evaluation artifacts.
--
-- Prerequisite: 018_policy_verification.sql (verification_decisions, consent_receipts)
--
-- ── PREFLIGHT (run before migration) ─────────────────────────────
-- select to_regclass('public.verification_decisions') as verification_decisions;
-- select to_regclass('public.consent_receipts') as consent_receipts;
-- select count(*) from public.verification_decisions;
--
-- ── POST-MIGRATION VERIFICATION (run after migration) ─────────────
-- select to_regclass('public.decision_receipts') as decision_receipts;
-- select column_name, data_type
--   from information_schema.columns
--  where table_schema = 'public' and table_name = 'decision_receipts'
--  order by ordinal_position;
-- select count(*) as receipt_count from public.decision_receipts;

create extension if not exists "pgcrypto";

create table if not exists public.decision_receipts (
  id                        text        primary key,
  verification_decision_id  uuid        not null
                            references public.verification_decisions(id) on delete restrict,
  consent_receipt_id        uuid
                            references public.consent_receipts(id) on delete set null,
  partner_id                text        not null,
  policy_id                 text        not null,
  policy_version            int         not null,
  subject_pseudonym_id      text        not null,
  wallet_binding_ref        text,
  decision_result           text        not null
                            check (decision_result in ('approved','denied','manual_review')),
  reason_codes              text[]      not null default '{}',
  evaluated_claim_refs      jsonb       not null default '[]',
  issuer_refs               text[]      not null default '{}',
  decision_context          text        not null default 'production'
                            check (decision_context in ('production','sandbox_only')),
  evaluated_at              timestamptz not null,
  expires_at                timestamptz,
  revoked_at                timestamptz,
  status                    text        not null default 'active'
                            check (status in ('active','expired','revoked')),
  schema_version            text        not null default '1.0.0',
  payload_hash              text        not null,
  signature                 text        not null,
  signing_key_id            text        not null default 'abraxas-primary',
  anchor_reference          text,
  idempotency_key           text,
  created_at                timestamptz not null default now(),
  unique (verification_decision_id),
  unique (idempotency_key)
);

create index if not exists idx_decision_receipts_partner
  on public.decision_receipts (partner_id, status, evaluated_at desc);

create index if not exists idx_decision_receipts_policy
  on public.decision_receipts (policy_id, policy_version, evaluated_at desc);

create index if not exists idx_decision_receipts_consent
  on public.decision_receipts (consent_receipt_id)
  where consent_receipt_id is not null;

create index if not exists idx_decision_receipts_pseudonym
  on public.decision_receipts (subject_pseudonym_id, evaluated_at desc);

alter table public.decision_receipts enable row level security;
