-- 028_meridian_relying_partner.sql
-- DEPRECATED filename (historical). Seeds Abraxas Partner Sandbox policy.
-- Fresh installs: uses abraxas-partner-sandbox IDs directly.
-- If you previously ran an older 028 with meridian-* IDs, run 030_rename_legacy_sandbox_ids.sql after 029.

insert into public.partners (partner_id, company, contact_name, status, allowed_environments)
values (
  'abraxas-partner-sandbox',
  'Abraxas Partner Sandbox',
  'Internal sandbox demo',
  'sandbox',
  array['sandbox']
)
on conflict (partner_id) do update set
  company = excluded.company,
  status = excluded.status,
  allowed_environments = excluded.allowed_environments,
  updated_at = now();

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
  name = excluded.name,
  rules_json = excluded.rules_json,
  status = excluded.status,
  partner_id = excluded.partner_id;

update public.partner_api_keys
set scopes = array(
  select distinct unnest(scopes || array['verify:screening']::text[])
)
where not ('verify:screening' = any(scopes));
