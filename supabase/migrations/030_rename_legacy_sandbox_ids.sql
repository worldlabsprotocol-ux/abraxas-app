-- 030_rename_legacy_sandbox_ids.sql
-- SUPERSEDED: use 032_reconcile_sandbox_and_cielo_operator_workflow.sql instead.
-- Kept for history only — do not run if applying 032.

-- 1) Ensure target partner row exists under new ID
insert into public.partners (partner_id, company, contact_name, status, allowed_environments)
select
  'abraxas-partner-sandbox',
  'Abraxas Partner Sandbox',
  'Internal sandbox demo',
  'sandbox',
  array['sandbox']
where exists (select 1 from public.partners where partner_id = 'meridian-private-credit')
  and not exists (select 1 from public.partners where partner_id = 'abraxas-partner-sandbox');

-- 2) Ensure target policy exists under new ID
insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
select
  'partner-sandbox-gate-v1',
  'abraxas-partner-sandbox',
  version,
  coalesce(name, 'Partner sandbox eligibility (demo)'),
  coalesce(rules_json, '{"sandbox_only": true}'::jsonb),
  coalesce(status, 'active')
from public.partner_policies
where id = 'meridian-investor-gate-v1'
  and not exists (select 1 from public.partner_policies where id = 'partner-sandbox-gate-v1');

-- 3) Repoint references from legacy policy id
update public.verification_requests
set policy_id = 'partner-sandbox-gate-v1'
where policy_id = 'meridian-investor-gate-v1';

update public.verification_decisions
set policy_id = 'partner-sandbox-gate-v1'
where policy_id = 'meridian-investor-gate-v1';

update public.partner_api_usage
set policy_id = 'partner-sandbox-gate-v1'
where policy_id = 'meridian-investor-gate-v1';

-- 4) Repoint references from legacy partner id
update public.partner_policies
set partner_id = 'abraxas-partner-sandbox'
where partner_id = 'meridian-private-credit';

update public.partner_api_keys
set partner_id = 'abraxas-partner-sandbox'
where partner_id = 'meridian-private-credit';

update public.verification_requests
set partner_id = 'abraxas-partner-sandbox'
where partner_id = 'meridian-private-credit';

update public.consent_receipts
set partner_id = 'abraxas-partner-sandbox'
where partner_id = 'meridian-private-credit';

update public.verification_decisions
set partner_id = 'abraxas-partner-sandbox'
where partner_id = 'meridian-private-credit';

update public.partner_api_usage
set partner_id = 'abraxas-partner-sandbox'
where partner_id = 'meridian-private-credit';

-- 5) Remove legacy rows
delete from public.partner_policies where id = 'meridian-investor-gate-v1';
delete from public.partners where partner_id = 'meridian-private-credit';

-- 6) Final relabel on canonical IDs
update public.partners
set
  company = 'Abraxas Partner Sandbox',
  contact_name = 'Internal sandbox demo',
  status = 'sandbox',
  allowed_environments = array['sandbox'],
  updated_at = now()
where partner_id = 'abraxas-partner-sandbox';

update public.partner_policies
set
  name = 'Partner sandbox eligibility (demo)',
  partner_id = 'abraxas-partner-sandbox',
  rules_json = '{
    "sandbox_only": true,
    "required_claims": [
      {"claim_type": "identity_verified", "max_age_hours": 8760, "min_assurance": "L2"},
      {"claim_type": "wallet_binding_confirmed", "max_age_hours": 720, "min_assurance": "L2"},
      {"claim_type": "screening_outcome", "max_age_hours": 24, "must_equal": "clear"}
    ]
  }'::jsonb,
  status = 'active'
where id = 'partner-sandbox-gate-v1';
