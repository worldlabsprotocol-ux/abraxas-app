-- 022_verified_participant_policy.sql
-- Reference policy: Abraxas Verified Participant v1 (closed-loop demo gate)

insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
values
  (
    'abraxas-verified-participant-v1',
    'abraxas',
    1,
    'Abraxas Verified Participant v1',
    '{
      "required_claims": [
        {"claim_type":"identity_verified","max_age_hours":8760,"min_assurance":"L2"},
        {"claim_type":"liveness_passed","max_age_hours":8760},
        {"claim_type":"wallet_binding_confirmed","max_age_hours":720}
      ]
    }'::jsonb,
    'active'
  )
on conflict (id) do update set
  name = excluded.name,
  rules_json = excluded.rules_json,
  status = excluded.status;
