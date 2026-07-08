-- 028_meridian_relying_partner.sql
-- Step 5: first external relying party + Tier 3 investor gate policy.

insert into public.partners (partner_id, company, contact_name, status, allowed_environments)
values (
  'meridian-private-credit',
  'Meridian Private Credit',
  'Pilot integration',
  'active',
  array['sandbox', 'production']
)
on conflict (partner_id) do update set
  company = excluded.company,
  status = excluded.status,
  updated_at = now();

insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
values (
  'meridian-investor-gate-v1',
  'meridian-private-credit',
  1,
  'Meridian investor eligibility',
  '{
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
  status = excluded.status;

-- Optional: pilot screening scope on partner keys (screening API uses verify:requests)
update public.partner_api_keys
set scopes = array(
  select distinct unnest(scopes || array['verify:screening']::text[])
)
where not ('verify:screening' = any(scopes));
