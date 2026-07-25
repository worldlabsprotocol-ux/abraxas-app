-- 049_good_trouble_cannabis_pilot.sql
-- Good Trouble Cannabis — sandbox relying party + retail eligibility policy (pilot).

insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
values
  (
    'good-trouble-retail-v1',
    'good-trouble-cannabis',
    1,
    'Good Trouble — regulated retail eligibility v1 (pilot)',
    '{
      "sandbox_only": true,
      "required_claims": [
        {"claim_type": "identity_verified", "max_age_hours": 8760, "min_assurance": "L2"},
        {"claim_type": "liveness_passed", "max_age_hours": 8760},
        {"claim_type": "wallet_binding_confirmed", "max_age_hours": 720, "min_assurance": "L2"},
        {"claim_type": "residency_country", "max_age_hours": 8760}
      ],
      "account_required": true,
      "consent_required": true
    }'::jsonb,
    'active'
  ),
  (
    'good-trouble-batch-v1',
    'good-trouble-cannabis',
    1,
    'Good Trouble — batch provenance attestation v1 (pilot)',
    '{
      "sandbox_only": true,
      "required_claims": [
        {"claim_type": "asset_ownership_reviewed", "max_age_hours": 2160, "min_assurance": "L2"}
      ]
    }'::jsonb,
    'active'
  )
on conflict (id) do update set
  name = excluded.name,
  rules_json = excluded.rules_json,
  status = excluded.status,
  partner_id = excluded.partner_id;

insert into public.partners (
  partner_id,
  company,
  contact_name,
  status,
  is_external,
  public_listing_ok,
  assigned_policy_id,
  allowed_environments,
  use_case
)
values (
  'good-trouble-cannabis',
  'Good Trouble Cannabis',
  'Pilot onboarding',
  'pilot',
  true,
  false,
  'good-trouble-retail-v1',
  array['sandbox'],
  'Age-gated retail eligibility + batch provenance pilot (Kansas City, MO)'
)
on conflict (partner_id) do update set
  company = excluded.company,
  status = excluded.status,
  is_external = excluded.is_external,
  assigned_policy_id = excluded.assigned_policy_id,
  allowed_environments = excluded.allowed_environments,
  use_case = excluded.use_case,
  updated_at = now();

insert into public.credential_schemas (id, name, version, claim_types, w3c_type, status)
values (
  'schema:abraxas-cannabis-batch-v1',
  'Abraxas Cannabis Batch Attestation',
  1,
  array['asset_ownership_reviewed', 'product_eligibility'],
  'AbraxasCannabisBatchCredential',
  'draft'
)
on conflict (id) do update set
  name = excluded.name,
  claim_types = excluded.claim_types,
  w3c_type = excluded.w3c_type,
  status = excluded.status;
