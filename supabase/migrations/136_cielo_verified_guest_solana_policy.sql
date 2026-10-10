-- 136_cielo_verified_guest_solana_policy.sql
-- Versioned Solana-native Cielo policy (immutable v1 unchanged).

insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
values (
  'cielo-verified-guest-solana-v1',
  'cielo',
  1,
  'Cielo Verified Guest Solana v1',
  '{
    "required_claims": [
      {"claim_type": "wallet_binding_confirmed", "max_age_hours": 720, "min_assurance": "L3", "chain": "solana"}
    ],
    "account_required": true,
    "profile_required": true,
    "consent_required": true,
    "identity_optional": true,
    "wallet_chain": "solana"
  }'::jsonb,
  'active'
)
on conflict (id) do update set
  name = excluded.name,
  rules_json = excluded.rules_json,
  status = excluded.status;
