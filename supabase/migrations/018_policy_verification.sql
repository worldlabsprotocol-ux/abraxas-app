-- 018_policy_verification.sql
-- Partner policy engine, normalized credential claims, verification requests, audit trail.
--
-- IMPORTANT: Paste THIS file in Supabase SQL Editor — NOT docs/SUPABASE_MIGRATION_018.md
-- Prerequisite: migration 006_abraxas_id.sql recommended (abraxas_credentials) but not required.

create extension if not exists "pgcrypto";

-- ── Wallet bindings (subject ↔ chain address) ───────────────────
create table if not exists public.wallet_bindings (
  id              uuid        primary key default gen_random_uuid(),
  subject_id      text        not null,
  chain           text        not null default 'sui',
  wallet_address  text        not null,
  binding_method  text        not null default 'zklogin',
  proof_signature text,
  verified_at     timestamptz not null default now(),
  revoked_at      timestamptz,
  risk_status     text        not null default 'unknown'
                  check (risk_status in ('unknown','low','medium','high')),
  unique (subject_id, wallet_address)
);

create index if not exists idx_wallet_bindings_subject
  on public.wallet_bindings (subject_id);

-- ── Normalized credential claims ───────────────────────────────
create table if not exists public.credential_claims (
  id                    uuid        primary key default gen_random_uuid(),
  subject_id            text        not null,
  credential_jti        text,        -- soft link to abraxas_credentials.jti (FK added below if table exists)
  claim_type            text        not null,
  claim_value           jsonb       not null default '{}',
  issuer_id             text        not null,
  assurance_level       text        check (assurance_level in ('L1','L2','L3','L4')),
  issued_at             timestamptz not null default now(),
  expires_at            timestamptz,
  status                text        not null default 'active'
                        check (status in ('active','suspended','revoked','expired')),
  revocation_reference  text,
  evidence_reference    text,
  jurisdiction          text,
  policy_scope          text,
  updated_at            timestamptz not null default now()
);

create index if not exists idx_credential_claims_subject
  on public.credential_claims (subject_id, status);
create index if not exists idx_credential_claims_type
  on public.credential_claims (claim_type, status);

-- ── Partner policies ─────────────────────────────────────────────
create table if not exists public.partner_policies (
  id            text        primary key,
  partner_id    text        not null,
  version       int         not null default 1,
  name          text        not null,
  rules_json    jsonb       not null,
  effective_at  timestamptz not null default now(),
  status        text        not null default 'active'
                check (status in ('active','deprecated','draft')),
  created_at    timestamptz not null default now()
);

-- ── Verification requests (partner → user consent) ───────────────
create table if not exists public.verification_requests (
  id                uuid        primary key default gen_random_uuid(),
  partner_id        text        not null,
  policy_id         text        references public.partner_policies(id),
  subject_id        text,
  sui_address       text,
  requested_action  text,
  requested_claims  text[]      not null default '{}',
  consent_id        uuid,
  status            text        not null default 'pending'
                    check (status in ('pending','consented','decided','expired','cancelled')),
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null default (now() + interval '24 hours')
);

create index if not exists idx_verification_requests_partner
  on public.verification_requests (partner_id, status);

-- ── Consent receipts ─────────────────────────────────────────────
create table if not exists public.consent_receipts (
  id                 uuid        primary key default gen_random_uuid(),
  subject_id         text        not null,
  partner_id         text        not null,
  request_id         uuid        references public.verification_requests(id) on delete cascade,
  purpose            text,
  claims_authorized  text[]      not null default '{}',
  created_at         timestamptz not null default now(),
  expires_at         timestamptz,
  revoked_at         timestamptz
);

-- ── Policy decisions (audit-friendly outcomes) ───────────────────
create table if not exists public.verification_decisions (
  id              uuid        primary key default gen_random_uuid(),
  request_id      uuid        references public.verification_requests(id) on delete set null,
  partner_id      text        not null,
  subject_id      text        not null,
  policy_id       text        not null,
  policy_version  int         not null default 1,
  decision        text        not null
                  check (decision in ('approved','denied','manual_review')),
  claims_json     jsonb       not null default '{}',
  reason_codes    text[]      not null default '{}',
  valid_until     timestamptz,
  decided_at      timestamptz not null default now(),
  status          text        not null default 'active'
                  check (status in ('active','revoked','superseded'))
);

create index if not exists idx_verification_decisions_subject
  on public.verification_decisions (subject_id, status);

-- ── Immutable audit log ──────────────────────────────────────────
create table if not exists public.audit_events (
  id              uuid        primary key default gen_random_uuid(),
  actor_type      text        not null,
  actor_id        text,
  action          text        not null,
  object_type     text,
  object_id       text,
  policy_id       text,
  policy_version  int,
  metadata        jsonb       not null default '{}',
  event_hash      text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_audit_events_object
  on public.audit_events (object_type, object_id, created_at desc);

-- RLS: service role only (partner APIs use service key server-side)
alter table public.wallet_bindings enable row level security;
alter table public.credential_claims enable row level security;
alter table public.partner_policies enable row level security;
alter table public.verification_requests enable row level security;
alter table public.consent_receipts enable row level security;
alter table public.verification_decisions enable row level security;
alter table public.audit_events enable row level security;

-- Seed default Abraxas policies
insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
values
  (
    'abraxas-core-v1',
    'abraxas',
    1,
    'Passport Core — browse & account',
    '{"allow_core_only":true,"required_claims":[]}'::jsonb,
    'active'
  ),
  (
    'abraxas-booking-v1',
    'abraxas',
    1,
    'Verified stay / high-trust booking',
    '{
      "required_claims": [
        {"claim_type":"identity_verified","max_age_hours":8760,"min_assurance":"L2"},
        {"claim_type":"liveness_passed","max_age_hours":8760},
        {"claim_type":"wallet_binding_confirmed","max_age_hours":8760}
      ]
    }'::jsonb,
    'active'
  ),
  (
    'abraxas-rwa-us-v1',
    'abraxas',
    1,
    'US RWA eligibility (pilot)',
    '{
      "required_claims": [
        {"claim_type":"identity_verified","max_age_hours":8760,"min_assurance":"L2"},
        {"claim_type":"liveness_passed","max_age_hours":8760},
        {"claim_type":"screening_outcome","max_age_hours":24,"must_equal":"clear"},
        {"claim_type":"wallet_binding_confirmed","max_age_hours":720}
      ],
      "blocked_jurisdictions": []
    }'::jsonb,
    'active'
  )
on conflict (id) do nothing;

-- Optional FK when abraxas_credentials (migration 006) is present
do $migration$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'abraxas_credentials'
  ) and not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'credential_claims'
      and constraint_name = 'credential_claims_credential_jti_fkey'
  ) then
    alter table public.credential_claims
      add constraint credential_claims_credential_jti_fkey
      foreign key (credential_jti)
      references public.abraxas_credentials(jti)
      on delete set null;
  end if;
end $migration$;
