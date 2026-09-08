-- 081_self_attestation_ledger.sql
-- Tier 1 self-attestation ledger (age-band only — no DOB persisted).

create table if not exists public.self_attestation_ledger (
  id                  uuid        primary key default gen_random_uuid(),
  holder_ref          text        not null,
  partner_id          text        not null,
  policy_id           text        not null,
  age_band            text        not null check (age_band in ('over_21', 'under_21')),
  assurance_level     text        not null default 'L0' check (assurance_level = 'L0'),
  provenance          text        not null default 'user_self_attestation'
    check (provenance = 'user_self_attestation'),
  purpose             text        not null check (purpose in ('browse')),
  attested_at         timestamptz not null default now(),
  expires_at          timestamptz not null,
  revoked_at          timestamptz,
  browse_receipt_id   text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_self_attest_holder_partner_policy_active
  on public.self_attestation_ledger (holder_ref, partner_id, policy_id, attested_at desc)
  where revoked_at is null;

create index if not exists idx_self_attest_expires
  on public.self_attestation_ledger (expires_at)
  where revoked_at is null;

create unique index if not exists idx_self_attest_browse_receipt
  on public.self_attestation_ledger (browse_receipt_id)
  where browse_receipt_id is not null;

alter table public.self_attestation_ledger enable row level security;
revoke all on public.self_attestation_ledger from anon, authenticated;
grant select, insert, update on public.self_attestation_ledger to service_role;

-- Browse-only policy — does not modify good-trouble-retail-v1.
insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
values (
  'good-trouble-browse-v1',
  'good-trouble-cannabis',
  1,
  'Good Trouble — browse access (self-attestation L0)',
  '{
    "sandbox_only": true,
    "browse_access_only": true,
    "allowed_purposes": ["browse"],
    "required_claims": [
      {"claim_type": "self_attested_age_band", "must_equal": "over_21", "max_age_hours": 24}
    ],
    "session_receipt_hours": 4,
    "minimum_assurance_cap": "L0"
  }'::jsonb,
  'active'
)
on conflict (id) do update set
  name = excluded.name,
  rules_json = excluded.rules_json,
  status = excluded.status,
  partner_id = excluded.partner_id;

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'self_attestation_ledger'
  ) then
    raise exception 'self_attestation_ledger table missing after migration 081';
  end if;
end $$;
