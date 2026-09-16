-- FILE: supabase/migrations/087_stocklana_pilot.sql
-- Stocklana hackathon demo — sandbox relying party for non-US eligibility gating.
--
-- Prerequisite: 055 (partner_policies PK is (id, version)); optional 086 launchpad
-- adds partners.is_external / public_listing_ok on DEMO.
-- Apply on DEMO/staging only until compliance review. Do not treat as production partner.
--
-- Coexists after 086_partner_launchpad_provision_schema_fix.sql (PR #290).

-- DEMO may lack 039 partner columns; add defensively without weakening NOT NULL defaults.
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_listing_ok boolean NOT NULL DEFAULT false;

-- Policy row first: no FK to partners; partners.assigned_policy_id is logical only.
INSERT INTO public.partner_policies (id, partner_id, version, name, rules_json, status)
VALUES (
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
ON CONFLICT (id, version) DO UPDATE SET
  name = EXCLUDED.name,
  rules_json = EXCLUDED.rules_json,
  status = EXCLUDED.status,
  partner_id = EXCLUDED.partner_id;

INSERT INTO public.partners (
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
VALUES (
  'stocklana-demo',
  'Stocklana (hackathon demo)',
  'Hackathon submission',
  'pilot',
  true,
  false,
  'stocklana-non-us-eligibility-v1',
  ARRAY['sandbox']::text[],
  ARRAY[
    'http://localhost:3000/stocklana/callback',
    'https://abraxas-app-git-cursor-st-21cf4b-worldlabsprotocol-uxs-projects.vercel.app/stocklana/callback'
  ]::text[],
  'Solana tokenized-stock eligibility demo — privacy-preserving non-US gate'
)
ON CONFLICT (partner_id) DO UPDATE SET
  company = EXCLUDED.company,
  status = EXCLUDED.status,
  is_external = EXCLUDED.is_external,
  public_listing_ok = EXCLUDED.public_listing_ok,
  assigned_policy_id = EXCLUDED.assigned_policy_id,
  allowed_environments = EXCLUDED.allowed_environments,
  allowed_return_urls = (
    SELECT ARRAY(
      SELECT DISTINCT unnest(
        COALESCE(partners.allowed_return_urls, ARRAY[]::text[])
          || EXCLUDED.allowed_return_urls
      )
    )
  ),
  use_case = EXCLUDED.use_case,
  updated_at = now();
