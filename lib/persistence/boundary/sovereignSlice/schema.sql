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

create table if not exists public.decision_receipt_supersessions (
  superseded_receipt_id text primary key references public.decision_receipts(id),
  superseding_receipt_id text not null,
  partner_id text not null references public.partners(partner_id),
  policy_id text not null,
  policy_version int not null,
  scope text not null default 'session_refresh',
  superseded_at timestamptz not null default now()
);

-- Claim/evidence freshness (no holder PII — status refs only).
create table if not exists public.sovereign_claim_status (
  claim_id text primary key,
  status text not null check (status in ('active', 'revoked', 'expired', 'suspended')),
  expires_at timestamptz
);

create table if not exists public.sovereign_evidence_sources (
  source_credential_id text primary key,
  status text not null check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.sovereign_receipt_status_checkpoints (
  receipt_id text primary key references public.decision_receipts(id),
  status_version int not null default 0 check (status_version >= 0)
);

create table if not exists public.sovereign_receipt_evidence_dependencies (
  receipt_id text not null references public.decision_receipts(id),
  source_credential_id text not null references public.sovereign_evidence_sources(source_credential_id),
  dependency_type text not null default 'source_receipt',
  primary key (receipt_id, source_credential_id)
);

-- Launchpad application scope (minimal slice — mirrors sovereign migration binding, no PII).
create table if not exists public.partner_launchpad_applications (
  id uuid primary key,
  partner_id text not null references public.partners(partner_id),
  status text not null default 'active' check (status in ('active', 'suspended', 'pending')),
  policy_id text not null,
  policy_version int not null default 1
);

create table if not exists public.partner_launchpad_signed_receipts (
  receipt_id text primary key references public.decision_receipts(id),
  application_id uuid not null references public.partner_launchpad_applications(id),
  partner_id text not null references public.partners(partner_id),
  revoked_at timestamptz
);

create index if not exists partner_launchpad_signed_receipts_app_idx
  on public.partner_launchpad_signed_receipts (application_id);

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
