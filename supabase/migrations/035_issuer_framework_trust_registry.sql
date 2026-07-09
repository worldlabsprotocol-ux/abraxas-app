-- 035_issuer_framework_trust_registry.sql
-- Issuer Framework + Trust Registry Enforcement tables.
--
-- Prerequisite: 019_trust_registry_complete.sql (credential_issuers), 018 (partner_policies)
--
-- ── PREFLIGHT ────────────────────────────────────────────────────
-- select to_regclass('public.credential_issuers') as credential_issuers;
-- select count(*) from public.credential_issuers;
--
-- ── POST-MIGRATION VERIFICATION ──────────────────────────────────
-- select to_regclass('public.issuer_signing_keys') as issuer_signing_keys;
-- select to_regclass('public.partner_issuer_trust_rules') as partner_issuer_trust_rules;
-- select id, display_name, issuer_status from public.credential_issuers limit 5;

create extension if not exists "pgcrypto";

-- Extend credential_issuers for issuer framework
alter table public.credential_issuers
  add column if not exists display_name text,
  add column if not exists issuer_status text,
  add column if not exists verification_methods text[] not null default '{}';

update public.credential_issuers
set display_name = coalesce(display_name, legal_name),
    issuer_status = coalesce(issuer_status,
      case trust_status
        when 'active' then 'active'
        when 'suspended' then 'suspended'
        when 'deprecated' then 'revoked'
        when 'pending_audit' then 'pending'
        else 'pending'
      end);

alter table public.credential_issuers drop constraint if exists credential_issuers_issuer_status_check;
alter table public.credential_issuers
  add constraint credential_issuers_issuer_status_check
  check (issuer_status in ('pending','active','suspended','revoked'));

-- Issuer Ed25519 public signing keys (private keys never stored)
create table if not exists public.issuer_signing_keys (
  id                text        primary key,
  issuer_id         text        not null references public.credential_issuers(id) on delete cascade,
  public_key_jwk    jsonb       not null,
  status            text        not null default 'active'
                    check (status in ('active','expired','revoked')),
  allowed_claim_scopes text[]   not null default '{}',
  created_at        timestamptz not null default now(),
  expires_at        timestamptz,
  revoked_at        timestamptz,
  rotation_metadata jsonb       not null default '{}'
);

create index if not exists idx_issuer_signing_keys_issuer
  on public.issuer_signing_keys (issuer_id, status);

-- Per-partner / per-policy issuer trust rules
create table if not exists public.partner_issuer_trust_rules (
  id                      uuid        primary key default gen_random_uuid(),
  partner_id              text        not null,
  policy_id               text        references public.partner_policies(id) on delete cascade,
  claim_type              text        not null,
  accepted_issuer_ids     text[]      not null default '{}',
  minimum_assurance_level text        check (minimum_assurance_level in ('L1','L2','L3','L4')),
  accepted_jurisdictions  text[]      not null default '{}',
  credential_max_age_hours int,
  status                  text        not null default 'active'
                          check (status in ('active','deprecated')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_partner_issuer_trust_partner
  on public.partner_issuer_trust_rules (partner_id, policy_id, claim_type);

-- Issuer audit trail
create table if not exists public.issuer_audit_events (
  id            uuid        primary key default gen_random_uuid(),
  issuer_id     text        not null references public.credential_issuers(id) on delete cascade,
  action        text        not null,
  actor_type    text        not null,
  actor_id      text,
  metadata      jsonb       not null default '{}',
  idempotency_key text,
  created_at    timestamptz not null default now(),
  unique (idempotency_key)
);

create index if not exists idx_issuer_audit_events_issuer
  on public.issuer_audit_events (issuer_id, created_at desc);

alter table public.issuer_signing_keys enable row level security;
alter table public.partner_issuer_trust_rules enable row level security;
alter table public.issuer_audit_events enable row level security;

-- Internal pilot issuers — not live third-party integrations
insert into public.credential_issuers (
  id, legal_name, display_name, issuer_type, trust_status, issuer_status,
  supported_claims, jurisdictions, assurance_levels, credential_ttl_days,
  audit_status, verification_methods, metadata
)
values
  (
    'issuer:abraxas-sandbox',
    'Abraxas Sandbox (internal demo)',
    'Abraxas Sandbox DEMO',
    'sandbox',
    'active',
    'active',
    array['screening_outcome'],
    array['global'],
    array['L1'],
    1,
    'self_attested',
    array['internal_demo'],
    '{"pilot":"internal_only","demo":true}'::jsonb
  )
on conflict (id) do update set
  display_name = excluded.display_name,
  issuer_status = excluded.issuer_status,
  metadata = excluded.metadata;
