-- Minimal operational slice for sovereign persistence proof (disposable/staging only).
-- No Production data. No holder PII tables.

create extension if not exists pgcrypto;

create table if not exists public.partners (
  partner_id text primary key,
  status text not null default 'active' check (status in ('active', 'suspended'))
);

create table if not exists public.partner_policies (
  id text not null,
  partner_id text not null references public.partners(partner_id),
  version int not null,
  name text not null default 'slice-policy',
  rules_json jsonb not null default '{}',
  effective_at timestamptz not null default now(),
  status text not null default 'active'
    check (status in ('active', 'deprecated', 'draft', 'revoked')),
  deprecate_effective_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (id, version)
);

create table if not exists public.issuer_signing_keys (
  signing_key_id text primary key,
  status text not null default 'active' check (status in ('active', 'rotated', 'revoked'))
);

create table if not exists public.decision_receipts (
  id text primary key,
  verification_decision_id uuid not null,
  consent_receipt_id uuid,
  partner_id text not null references public.partners(partner_id),
  policy_id text not null,
  policy_version int not null,
  subject_pseudonym_id text not null,
  wallet_binding_ref text,
  decision_result text not null check (decision_result in ('approved', 'denied', 'manual_review')),
  reason_codes text[] not null default '{}',
  evaluated_claim_refs jsonb not null default '[]',
  issuer_refs text[] not null default '{}',
  decision_context text not null default 'production'
    check (decision_context in ('production', 'sandbox_only')),
  evaluated_at timestamptz not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  schema_version text not null default '1.0.0',
  payload_hash text not null,
  signature text not null,
  signing_key_id text not null references public.issuer_signing_keys(signing_key_id),
  anchor_reference text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  foreign key (policy_id, policy_version) references public.partner_policies(id, version)
);

create table if not exists public.partner_metering_events (
  id bigserial primary key,
  partner_id text not null references public.partners(partner_id),
  event_type text not null,
  idempotency_key text not null unique,
  policy_id text,
  decision_id text,
  receipt_id text,
  occurred_at timestamptz not null default now()
);
