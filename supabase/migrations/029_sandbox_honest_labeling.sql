-- 029_sandbox_honest_labeling.sql
-- Relabel internal sandbox partner; mark policy sandbox-only.

update public.partners
set
  company = 'Abraxas Partner Sandbox',
  contact_name = 'Internal sandbox demo',
  status = 'sandbox',
  allowed_environments = array['sandbox'],
  updated_at = now()
where partner_id in ('meridian-private-credit', 'abraxas-partner-sandbox');

update public.partner_policies
set
  name = 'Partner sandbox eligibility (demo)',
  rules_json = '{
    "sandbox_only": true,
    "required_claims": [
      {"claim_type": "identity_verified", "max_age_hours": 8760, "min_assurance": "L2"},
      {"claim_type": "wallet_binding_confirmed", "max_age_hours": 720, "min_assurance": "L2"},
      {"claim_type": "screening_outcome", "max_age_hours": 24, "must_equal": "clear"}
    ]
  }'::jsonb,
  status = 'active',
  partner_id = 'abraxas-partner-sandbox'
where id in ('meridian-investor-gate-v1', 'partner-sandbox-gate-v1');

-- Partner onboarding fields for real future relying parties
alter table public.partners
  add column if not exists legal_entity text,
  add column if not exists use_case text,
  add column if not exists assigned_policy_id text,
  add column if not exists onboarding_notes text;

-- External asset owner applications (Step 5 intake)
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

-- Sample DEMO record (clearly labeled — not a real external owner)
insert into public.external_asset_applications (
  originator,
  asset_name,
  asset_class,
  jurisdiction,
  estimated_value,
  evidence_scope,
  contact_email,
  description,
  public_verify_slug,
  status,
  is_demo_sample
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
