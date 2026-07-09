-- 032_reconcile_sandbox_and_cielo_operator_workflow.sql
-- Idempotent reconciliation for sandbox partner + Cielo operator workflow.
-- Supersedes manual application of 029, 030, and 031.
--
-- PREREQUISITES (must exist before running):
--   018_policy_verification.sql  — partner_policies, verification_*, consent_*, audit_events
--   024_partner_api_keys.sql     — partner_api_keys, partner_api_usage (optional but recommended)
--   025_partners_registry.sql    — partners table (032 can create partners if missing)
--   026_cielo_verified_rate.sql  — optional; 032 creates Cielo tables if missing
--
-- SAFE TO RE-RUN: yes (idempotent upserts and conditional DDL)
--
-- ============================================================================
-- PREFLIGHT — run these SELECTs first to see current state (read-only)
-- ============================================================================
-- select table_name from information_schema.tables
--   where table_schema = 'public'
--     and table_name in (
--       'partners','partner_policies','partner_api_keys','verification_requests',
--       'verification_decisions','consent_receipts','partner_api_usage',
--       'cielo_verified_rate_requests','cielo_verified_rate_request_events',
--       'external_asset_applications'
--     )
--   order by 1;
--
-- select partner_id, company, status from public.partners
--   where partner_id in ('meridian-private-credit','abraxas-partner-sandbox','cielo','abraxas');
--
-- select id, partner_id, name, rules_json->'sandbox_only' as sandbox_only
--   from public.partner_policies
--   where id in ('meridian-investor-gate-v1','partner-sandbox-gate-v1','cielo-verified-guest-v1');
--
-- select count(*) as meridian_requests from public.verification_requests
--   where policy_id = 'meridian-investor-gate-v1' or partner_id = 'meridian-private-credit';
-- ============================================================================

do $preflight$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'partner_policies'
  ) then
    raise exception
      'Prerequisite missing: public.partner_policies. Run supabase/migrations/018_policy_verification.sql first.';
  end if;
end;
$preflight$;

-- ── 1) partners registry (025) if missing ───────────────────────────────────
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  partner_id text not null unique,
  company text not null,
  contact_name text,
  contact_email text,
  status text not null default 'active',
  allowed_environments text[] not null default array['sandbox', 'production'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.partners
  add column if not exists legal_entity text,
  add column if not exists use_case text,
  add column if not exists assigned_policy_id text,
  add column if not exists onboarding_notes text;

create index if not exists partners_status_idx on public.partners (status);

alter table public.partners enable row level security;

-- partner_api_usage enrichment (025) — no-op if already applied
do $usage_cols$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'partner_api_usage'
  ) then
    alter table public.partner_api_usage
      add column if not exists http_status integer,
      add column if not exists response_time_ms integer,
      add column if not exists record_type text,
      add column if not exists record_id text,
      add column if not exists policy_id text,
      add column if not exists policy_version text,
      add column if not exists decision text;
  end if;
end;
$usage_cols$;

-- ── 2) Canonical sandbox partner MUST exist before policy assignment ────────
insert into public.partners (
  partner_id, company, contact_name, status, allowed_environments, updated_at
)
values (
  'abraxas-partner-sandbox',
  'Abraxas Partner Sandbox',
  'Internal sandbox demo',
  'sandbox',
  array['sandbox'],
  now()
)
on conflict (partner_id) do update set
  company = excluded.company,
  contact_name = excluded.contact_name,
  status = excluded.status,
  allowed_environments = excluded.allowed_environments,
  updated_at = now();

-- ── 3) Migrate legacy Meridian partner/policy BEFORE deletes ────────────────
-- Only text/FK repointing — preserves real request/consent/decision rows.

-- 3a) Copy legacy policy row to canonical id if needed (before FK repoint)
insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
select
  'partner-sandbox-gate-v1',
  'abraxas-partner-sandbox',
  coalesce(version, 1),
  coalesce(name, 'Partner sandbox eligibility (demo)'),
  coalesce(rules_json, '{"sandbox_only": true}'::jsonb),
  coalesce(status, 'active')
from public.partner_policies
where id = 'meridian-investor-gate-v1'
  and not exists (
    select 1 from public.partner_policies where id = 'partner-sandbox-gate-v1'
  );

-- 3b) Repoint FK-backed verification_requests.policy_id first
update public.verification_requests
set policy_id = 'partner-sandbox-gate-v1'
where policy_id = 'meridian-investor-gate-v1';

-- 3c) Repoint other policy_id text columns (no FK)
update public.verification_decisions
set policy_id = 'partner-sandbox-gate-v1'
where policy_id = 'meridian-investor-gate-v1';

do $usage_policy$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'partner_api_usage'
  ) then
    update public.partner_api_usage
    set policy_id = 'partner-sandbox-gate-v1'
    where policy_id = 'meridian-investor-gate-v1';
  end if;
end;
$usage_policy$;

update public.audit_events
set policy_id = 'partner-sandbox-gate-v1'
where policy_id = 'meridian-investor-gate-v1';

-- 3d) Repoint partner_id text columns
update public.partner_policies
set partner_id = 'abraxas-partner-sandbox'
where partner_id = 'meridian-private-credit';

update public.verification_requests
set partner_id = 'abraxas-partner-sandbox'
where partner_id = 'meridian-private-credit';

update public.verification_decisions
set partner_id = 'abraxas-partner-sandbox'
where partner_id = 'meridian-private-credit';

update public.consent_receipts
set partner_id = 'abraxas-partner-sandbox'
where partner_id = 'meridian-private-credit';

do $usage_partner$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'partner_api_keys'
  ) then
    update public.partner_api_keys
    set partner_id = 'abraxas-partner-sandbox'
    where partner_id = 'meridian-private-credit';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'partner_api_usage'
  ) then
    update public.partner_api_usage
    set partner_id = 'abraxas-partner-sandbox'
    where partner_id = 'meridian-private-credit';
  end if;
end;
$usage_partner$;

-- 3e) Remove legacy rows only after repoint (no-op if never existed)
delete from public.partner_policies where id = 'meridian-investor-gate-v1';
delete from public.partners where partner_id = 'meridian-private-credit';

-- ── 4) Upsert canonical sandbox policy (sandbox_only — not production-usable) ─
insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
values (
  'partner-sandbox-gate-v1',
  'abraxas-partner-sandbox',
  1,
  'Partner sandbox eligibility (demo)',
  '{
    "sandbox_only": true,
    "required_claims": [
      {"claim_type": "identity_verified", "max_age_hours": 8760, "min_assurance": "L2"},
      {"claim_type": "wallet_binding_confirmed", "max_age_hours": 720, "min_assurance": "L2"},
      {"claim_type": "screening_outcome", "max_age_hours": 24, "must_equal": "clear"}
    ]
  }'::jsonb,
  'active'
)
on conflict (id) do update set
  partner_id = excluded.partner_id,
  name = excluded.name,
  rules_json = excluded.rules_json,
  status = excluded.status;

-- Ensure production Cielo policy is NOT sandbox-only
insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
values (
  'cielo-verified-guest-v1',
  'cielo',
  1,
  'Cielo Verified Guest v1',
  '{
    "required_claims": [
      {"claim_type": "wallet_binding_confirmed", "max_age_hours": 720, "min_assurance": "L3"}
    ],
    "account_required": true,
    "profile_required": true,
    "consent_required": true,
    "identity_optional": true
  }'::jsonb,
  'active'
)
on conflict (id) do update set
  name = excluded.name,
  rules_json = excluded.rules_json,
  status = excluded.status;

-- ── 5) External asset applications (029) ─────────────────────────────────────
create table if not exists public.external_asset_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  originator text not null default 'external',
  asset_name text not null,
  asset_class text not null,
  jurisdiction text,
  estimated_value text,
  evidence_scope text,
  evidence_expires_at timestamptz,
  contact_name text,
  contact_email text not null,
  contact_wallet text,
  description text,
  public_verify_slug text,
  named_reviewer text,
  review_signed_at timestamptz,
  status text not null default 'pending_review',
  is_demo_sample boolean not null default false
);

create index if not exists external_asset_applications_status_idx
  on public.external_asset_applications (status);

alter table public.external_asset_applications enable row level security;

insert into public.external_asset_applications (
  originator, asset_name, asset_class, jurisdiction, estimated_value,
  evidence_scope, contact_email, description, public_verify_slug, status, is_demo_sample
)
select
  'abraxas_sample',
  'Sample Riverside Parcel (DEMO)',
  'REAL_ESTATE_LAND',
  'US · Oregon',
  'Sample only',
  'Owner attestation + county parcel reference — DEMO SAMPLE, not verified',
  'demo@abraxas.internal',
  'Illustrates external asset owner intake flow. Pending named reviewer sign-off before any VERIFIED public status.',
  'ABX-DEMO-LAND-001',
  'pending_review',
  true
where not exists (
  select 1 from public.external_asset_applications where public_verify_slug = 'ABX-DEMO-LAND-001'
);

-- ── 6) Cielo verified-rate base (026) if missing ────────────────────────────
create table if not exists public.cielo_verified_rate_requests (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique,
  subject_sui_address text not null,
  wallet_binding_id uuid,
  cielo_record_id text not null default 'ABX-RE-HOSP-001',
  policy_id text not null default 'cielo-verified-guest-v1',
  policy_version int not null default 1,
  verification_decision_id uuid,
  consent_receipt_id uuid,
  check_in text,
  check_out text,
  guests int,
  guest_name text,
  contact_email text,
  notes text,
  eligibility_decision text not null
    check (eligibility_decision in ('approved', 'manual_review', 'not_eligible')),
  status text not null default 'request_received'
    check (status in (
      'request_received', 'pending_review', 'eligible', 'not_eligible',
      'operator_confirmed', 'declined'
    )),
  reason_codes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add FKs only when referenced tables exist (026 used conditional refs)
do $cielo_fks$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'wallet_bindings'
  ) and not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'cielo_verified_rate_requests'
      and constraint_name = 'cielo_verified_rate_requests_wallet_binding_id_fkey'
  ) then
    alter table public.cielo_verified_rate_requests
      add constraint cielo_verified_rate_requests_wallet_binding_id_fkey
      foreign key (wallet_binding_id) references public.wallet_bindings(id) on delete set null;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'verification_decisions'
  ) and not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'cielo_verified_rate_requests'
      and constraint_name = 'cielo_verified_rate_requests_verification_decision_id_fkey'
  ) then
    alter table public.cielo_verified_rate_requests
      add constraint cielo_verified_rate_requests_verification_decision_id_fkey
      foreign key (verification_decision_id) references public.verification_decisions(id) on delete set null;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'consent_receipts'
  ) and not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'cielo_verified_rate_requests'
      and constraint_name = 'cielo_verified_rate_requests_consent_receipt_id_fkey'
  ) then
    alter table public.cielo_verified_rate_requests
      add constraint cielo_verified_rate_requests_consent_receipt_id_fkey
      foreign key (consent_receipt_id) references public.consent_receipts(id) on delete set null;
  end if;
end;
$cielo_fks$;

create index if not exists cielo_verified_rate_requests_subject_idx
  on public.cielo_verified_rate_requests (subject_sui_address, created_at desc);

create index if not exists cielo_verified_rate_requests_status_idx
  on public.cielo_verified_rate_requests (status, created_at desc);

create table if not exists public.cielo_registry_public_events (
  id uuid primary key default gen_random_uuid(),
  record_id text not null,
  event_type text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists cielo_registry_public_events_record_idx
  on public.cielo_registry_public_events (record_id, created_at desc);

alter table public.cielo_verified_rate_requests enable row level security;
alter table public.cielo_registry_public_events enable row level security;

-- ── 7) Cielo operator workflow (031) ─────────────────────────────────────────
alter table public.cielo_verified_rate_requests
  add column if not exists assigned_to text,
  add column if not exists operator_notes jsonb not null default '[]'::jsonb,
  add column if not exists contacted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists decided_at timestamptz,
  add column if not exists decision_reason text;

create table if not exists public.cielo_verified_rate_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cielo_verified_rate_requests(id) on delete cascade,
  public_reference text not null,
  actor_type text not null check (actor_type in ('operator', 'system', 'subject')),
  actor_id text not null,
  prior_status text,
  next_status text not null,
  action text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists cielo_vr_events_request_idx
  on public.cielo_verified_rate_request_events (request_id, created_at asc);

create index if not exists cielo_vr_events_ref_idx
  on public.cielo_verified_rate_request_events (public_reference, created_at asc);

create index if not exists cielo_verified_rate_requests_assigned_idx
  on public.cielo_verified_rate_requests (assigned_to, status, created_at desc);

create index if not exists cielo_verified_rate_requests_queue_idx
  on public.cielo_verified_rate_requests (status, created_at desc);

alter table public.cielo_verified_rate_request_events enable row level security;

-- RLS: match 018 pattern — enabled, no client policies; Next.js APIs use service role.
-- Do NOT add permissive policies here; admin/user access is enforced in API routes.

-- Remove incorrect deny-all policy if a prior 031 run created it
drop policy if exists "cielo_vr_events_service_only" on public.cielo_verified_rate_request_events;

-- ── 8) Optional scope bumps (027/028) when partner_api_keys exists ───────────
do $scopes$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'partner_api_keys'
  ) then
    update public.partner_api_keys
    set scopes = array(
      select distinct unnest(scopes || array['verify:requests']::text[])
    )
    where not ('verify:requests' = any(scopes));

    update public.partner_api_keys
    set scopes = array(
      select distinct unnest(scopes || array['verify:screening']::text[])
    )
    where not ('verify:screening' = any(scopes));
  end if;
end;
$scopes$;

-- ============================================================================
-- POST-MIGRATION VERIFICATION — run after 032 (read-only)
-- ============================================================================
-- select partner_id, company, status from public.partners
--   where partner_id = 'abraxas-partner-sandbox';
-- -- expect 1 row, status sandbox, company Abraxas Partner Sandbox
--
-- select count(*) from public.partners where partner_id = 'meridian-private-credit';
-- -- expect 0
--
-- select id, partner_id, rules_json->'sandbox_only' as sandbox_only
--   from public.partner_policies where id = 'partner-sandbox-gate-v1';
-- -- expect sandbox_only = true
--
-- select count(*) from public.partner_policies where id = 'meridian-investor-gate-v1';
-- -- expect 0
--
-- select count(*) from public.verification_requests
--   where policy_id = 'meridian-investor-gate-v1' or partner_id = 'meridian-private-credit';
-- -- expect 0
--
-- select column_name from information_schema.columns
--   where table_name = 'cielo_verified_rate_requests'
--     and column_name in ('assigned_to','operator_notes','decision_reason');
-- -- expect 3 rows
--
-- select count(*) from information_schema.tables
--   where table_name = 'cielo_verified_rate_request_events';
-- -- expect 1
-- ============================================================================
