-- FILE: supabase/migrations/026_cielo_verified_rate.sql
-- Cielo verified-rate pilot: policy, booking requests, public registry events.

insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
values
  (
    'cielo-verified-guest-v1',
    'cielo',
    1,
    'Cielo Verified Guest v1',
    '{
      "required_claims": [
        {"claim_type": "wallet_binding_confirmed", "max_age_hours": 720, "min_assurance": "L3"}
      ],
      "account_required": true,
      "profile_required": true,
      "consent_required": true,
      "identity_optional": true
    }'::jsonb,
    'active'
  )
on conflict (id) do update set
  name = excluded.name,
  rules_json = excluded.rules_json,
  status = excluded.status;

create table if not exists public.cielo_verified_rate_requests (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique,
  subject_sui_address text not null,
  wallet_binding_id uuid references public.wallet_bindings(id) on delete set null,
  cielo_record_id text not null default 'ABX-RE-HOSP-001',
  policy_id text not null default 'cielo-verified-guest-v1',
  policy_version int not null default 1,
  verification_decision_id uuid references public.verification_decisions(id) on delete set null,
  consent_receipt_id uuid references public.consent_receipts(id) on delete set null,
  check_in text,
  check_out text,
  guests int,
  guest_name text,
  contact_email text,
  notes text,
  eligibility_decision text not null
    check (eligibility_decision in ('approved', 'manual_review', 'not_eligible')),
  status text not null default 'request_received'
    check (status in (
      'request_received', 'pending_review', 'eligible', 'not_eligible',
      'operator_confirmed', 'declined'
    )),
  reason_codes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cielo_verified_rate_requests_subject_idx
  on public.cielo_verified_rate_requests (subject_sui_address, created_at desc);

create index if not exists cielo_verified_rate_requests_status_idx
  on public.cielo_verified_rate_requests (status, created_at desc);

create table if not exists public.cielo_registry_public_events (
  id uuid primary key default gen_random_uuid(),
  record_id text not null,
  event_type text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists cielo_registry_public_events_record_idx
  on public.cielo_registry_public_events (record_id, created_at desc);

alter table public.cielo_verified_rate_requests enable row level security;
alter table public.cielo_registry_public_events enable row level security;
