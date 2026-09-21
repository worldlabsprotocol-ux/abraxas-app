-- FILE: supabase/migrations/106_private_organization_eligibility.sql
-- DEMO-first private organization and authorized-signer eligibility.
-- Apply DEMO first: https://supabase.com/dashboard/project/ocntwbxarpjeixdnzide/sql/new
-- Do not auto-apply from Vercel, this PR, or any agent. Opaque HMAC refs only.

create table if not exists public.organization_eligibility_records (
  organization_ref text not null primary key,
  actor_ref text not null,
  partner_hmac text not null,
  audience_hash text not null,
  issuer_ref text not null,
  method_category text not null,
  assurance_level text not null,
  result_category text not null
    check (result_category in (
      'organization_eligible',
      'authorized_signer',
      'jurisdiction_eligible',
      'institutional_counterparty_eligible'
    )),
  policy_id text not null,
  policy_version integer not null,
  purpose text not null,
  action text not null,
  action_scope text not null,
  environment text not null
    check (environment in ('sandbox', 'production')),
  status text not null
    check (status in ('issued', 'expired', 'revoked', 'withdrawn')),
  consent_bound boolean not null default false,
  currently_valid boolean not null default false,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  withdrawn_at timestamptz null,
  derivation_hash text not null unique,
  presentation_ref text null,
  subject_binding_hash text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_eligibility_partner_idx
  on public.organization_eligibility_records (partner_hmac, policy_id, status);

create index if not exists organization_eligibility_actor_idx
  on public.organization_eligibility_records (actor_ref, status);

comment on table public.organization_eligibility_records is
  'Private organization eligibility. Opaque HMAC organization/actor refs, policy/action bindings, and lifecycle only. No legal names, KYB/KYC evidence, tax IDs, or beneficial-owner data.';

alter table public.organization_eligibility_records enable row level security;

revoke all on public.organization_eligibility_records from public;
revoke all on public.organization_eligibility_records from anon, authenticated;
grant select, insert, update on public.organization_eligibility_records to postgres, service_role;
