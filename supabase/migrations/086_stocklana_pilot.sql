-- 086_stocklana_pilot.sql
-- Stocklana hackathon demo — sandbox relying party for non-US eligibility gating.
-- Apply on DEMO/staging only until compliance review. Do not treat as production partner.

insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
values (
  'stocklana-non-us-eligibility-v1',
  'stocklana-demo',
  1,
  'Stocklana — non-US investor eligibility (sandbox demo)',
  '{
    "sandbox_only": true,
    "blocked_jurisdictions": ["US"],
    "required_claims": [
      {"claim_type": "identity_verified", "max_age_hours": 8760, "min_assurance": "L2"},
      {"claim_type": "liveness_passed", "max_age_hours": 8760},
      {"claim_type": "residency_country", "max_age_hours": 8760}
    ],
    "account_required": true,
    "consent_required": true,
    "session_receipt_hours": 24
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
  allowed_return_urls,
  use_case
)
values (
  'stocklana-demo',
  'Stocklana (hackathon demo)',
  'Hackathon submission',
  'pilot',
  true,
  false,
  'stocklana-non-us-eligibility-v1',
  array['sandbox'],
  array[
    'http://localhost:3000/stocklana/callback',
    'https://abraxas-app.vercel.app/stocklana/callback'
  ]::text[],
  'Solana tokenized-stock eligibility demo — privacy-preserving non-US gate'
)
on conflict (partner_id) do update set
  company = excluded.company,
  status = excluded.status,
  is_external = excluded.is_external,
  assigned_policy_id = excluded.assigned_policy_id,
  allowed_environments = excluded.allowed_environments,
  allowed_return_urls = excluded.allowed_return_urls,
  use_case = excluded.use_case,
  updated_at = now();
