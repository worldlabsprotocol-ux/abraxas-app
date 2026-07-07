-- 019_trust_registry.sql
-- Trust Registry: subjects, credential issuers, schemas.
-- Run after 018_policy_verification.sql

-- ── Subjects (individual or organization) ────────────────────────
create table if not exists public.subjects (
  id                text        primary key,  -- did:sui:… or stable internal id
  subject_type      text        not null default 'individual'
                    check (subject_type in ('individual','organization')),
  private_identifier text,
  status            text        not null default 'active'
                    check (status in ('active','suspended','closed')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_subjects_status on public.subjects (status);

-- ── Trusted credential issuers ───────────────────────────────────
create table if not exists public.credential_issuers (
  id                text        primary key,
  legal_name        text        not null,
  issuer_type       text        not null,
  public_key_ref    text,
  trust_status      text        not null default 'active'
                    check (trust_status in ('active','suspended','pending_audit','deprecated')),
  supported_schemas text[]      not null default '{}',
  supported_claims  text[]      not null default '{}',
  jurisdictions     text[]      not null default '{}',
  assurance_levels  text[]      not null default '{}',
  credential_ttl_days int,
  audit_status      text        not null default 'self_attested'
                    check (audit_status in ('self_attested','reviewed','contracted')),
  metadata          jsonb       not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── Credential schema registry ───────────────────────────────────
create table if not exists public.credential_schemas (
  id                text        primary key,
  name              text        not null,
  version           int         not null default 1,
  claim_types       text[]      not null default '{}',
  w3c_type          text,
  status            text        not null default 'active'
                    check (status in ('active','deprecated','draft')),
  created_at        timestamptz not null default now()
);

alter table public.subjects enable row level security;
alter table public.credential_issuers enable row level security;
alter table public.credential_schemas enable row level security;

-- Seed trusted issuers (Trust Registry v1)
insert into public.credential_issuers (
  id, legal_name, issuer_type, trust_status, supported_claims,
  jurisdictions, assurance_levels, credential_ttl_days, audit_status, metadata
)
values
  (
    'issuer:veriff',
    'Veriff (licensed IDV)',
    'identity_provider',
    'active',
    array['identity_verified','liveness_passed','government_id_verified','residency_country'],
    array['global'],
    array['L2','L3'],
    365,
    'contracted',
    '{"provider":"veriff","assurance":"high"}'::jsonb
  ),
  (
    'issuer:abraxas',
    'Abraxas Network',
    'network_coordinator',
    'active',
    array['wallet_binding_confirmed'],
    array['global'],
    array['L2'],
    30,
    'self_attested',
    '{"binding_method":"signed_challenge"}'::jsonb
  ),
  (
    'issuer:abraxas-manual',
    'Abraxas Manual Review',
    'manual_reviewer',
    'active',
    array['kyb_verified','asset_ownership_reviewed','risk_review'],
    array['US','global'],
    array['L2','L3'],
    365,
    'self_attested',
    '{}'::jsonb
  ),
  (
    'issuer:screening-partner',
    'Sanctions / AML Provider (partner-gated)',
    'screening_provider',
    'pending_audit',
    array['screening_outcome','wallet_risk_band'],
    array['US','global'],
    array['L1','L2'],
    1,
    'pending_audit',
    '{"note":"Full AML program requires partner onboarding"}'::jsonb
  )
on conflict (id) do nothing;

insert into public.credential_schemas (id, name, version, claim_types, w3c_type, status)
values
  (
    'schema:abraxas-identity-v1',
    'Government Identity Credential',
    1,
    array['identity_verified','liveness_passed','government_id_verified','residency_country'],
    'GovernmentIdentityCredential',
    'active'
  ),
  (
    'schema:abraxas-wallet-v1',
    'Wallet Binding Credential',
    1,
    array['wallet_binding_confirmed'],
    'WalletBindingCredential',
    'active'
  ),
  (
    'schema:abraxas-compliance-v1',
    'Compliance Eligibility Credential',
    1,
    array['screening_outcome','accredited_status','product_eligibility'],
    'ComplianceEligibilityCredential',
    'active'
  ),
  (
    'schema:abraxas-asset-v1',
    'Asset Attestation Credential',
    1,
    array['asset_ownership_reviewed','asset_title_verified','transfer_eligibility'],
    'AssetAttestationCredential',
    'active'
  )
on conflict (id) do nothing;
