-- 137_good_trouble_age_21_solana_idv.sql
-- Solana-native Good Trouble age-21 policy (immutable successor) + IDV holder linkage.

alter table public.identity_verifications
  add column if not exists holder_account_id text references public.holder_accounts(id);

create index if not exists idx_identity_verifications_holder_account
  on public.identity_verifications (holder_account_id)
  where holder_account_id is not null;

insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
values (
  'good-trouble-age_21_retail-solana-v1',
  'good-trouble',
  1,
  'Good Trouble Age 21 Retail Solana v1',
  '{
    "minimum_age": 21,
    "disclosed_result": "age_eligible_21",
    "wallet_chain": "solana",
    "account_required": true,
    "consent_required": true,
    "identity_required": true,
    "minimum_assurance_floor": "L2",
    "required_claims": [
      {"claim_type": "identity_verified", "max_age_hours": 8760, "min_assurance": "L2"},
      {"claim_type": "liveness_passed", "max_age_hours": 8760},
      {"claim_type": "wallet_binding_confirmed", "max_age_hours": 720, "min_assurance": "L2", "chain": "solana"}
    ],
    "session_receipt_hours": 24,
    "sandbox_only": false
  }'::jsonb,
  'active'
)
on conflict (id) do update set
  name = excluded.name,
  rules_json = excluded.rules_json,
  status = excluded.status;

comment on column public.identity_verifications.holder_account_id is
  'Canonical holder account for Solana-native IDV (claims subject remains wallet_address/sui_address compat key).';
