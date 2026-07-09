-- 036_connect_wallet_authority.sql
-- Abraxas Connect + Wallet Authority v1
-- Prerequisite: 018, 025 (partners), 033 (decision_receipts)
--
-- PREFLIGHT:
-- select to_regclass('public.wallet_bindings');
-- select to_regclass('public.partners');
--
-- POST-MIGRATION:
-- select to_regclass('public.connect_authorization_requests');
-- select to_regclass('public.wallet_binding_challenges');

create extension if not exists "pgcrypto";

-- Wallet authority extensions
alter table public.wallet_bindings
  add column if not exists binding_status text,
  add column if not exists chain_id int,
  add column if not exists verified_domain text;

update public.wallet_bindings
set binding_status = case
  when revoked_at is not null then 'revoked'
  when risk_status = 'high' then 'compromised'
  else 'active'
end
where binding_status is null;

alter table public.wallet_bindings drop constraint if exists wallet_bindings_binding_status_check;
alter table public.wallet_bindings
  add constraint wallet_bindings_binding_status_check
  check (binding_status in ('pending','active','revoked','compromised'));

alter table public.wallet_bindings
  alter column binding_status set default 'active';

-- Persisted binding challenges (replay-safe, multi-instance)
create table if not exists public.wallet_binding_challenges (
  id              text        primary key,
  wallet_address  text        not null,
  chain           text        not null default 'evm',
  chain_id        int,
  message         text        not null,
  domain          text        not null,
  subject_id      text,
  expires_at      timestamptz not null,
  consumed_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_wallet_binding_challenges_wallet
  on public.wallet_binding_challenges (wallet_address, expires_at desc);

-- Partner return URL allowlist
alter table public.partners
  add column if not exists allowed_return_urls text[] not null default '{}';

-- Connect authorization requests (consent-gated)
create table if not exists public.connect_authorization_requests (
  id                      text        primary key,
  partner_id              text        not null,
  policy_id               text        not null,
  requested_action        text,
  wallet_address          text,
  chain                   text        not null default 'evm',
  chain_id                int,
  return_url              text        not null,
  status                  text        not null default 'awaiting_user'
                          check (status in (
                            'created','awaiting_user','consented',
                            'approved','denied','expired','cancelled'
                          )),
  subject_id              text,
  verification_request_id uuid references public.verification_requests(id) on delete set null,
  verification_decision_id uuid references public.verification_decisions(id) on delete set null,
  consent_receipt_id      uuid references public.consent_receipts(id) on delete set null,
  receipt_id              text references public.decision_receipts(id) on delete set null,
  reason_codes            text[]      not null default '{}',
  idempotency_key         text,
  expires_at              timestamptz not null,
  completed_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (idempotency_key)
);

create index if not exists idx_connect_auth_requests_partner
  on public.connect_authorization_requests (partner_id, status, created_at desc);

-- Partner webhooks
create table if not exists public.partner_webhook_endpoints (
  id              uuid        primary key default gen_random_uuid(),
  partner_id      text        not null,
  url             text        not null,
  signing_secret  text        not null,
  events          text[]      not null default array['authorization.completed'],
  status          text        not null default 'active'
                  check (status in ('active','disabled')),
  created_at      timestamptz not null default now()
);

create table if not exists public.partner_webhook_deliveries (
  id                  uuid        primary key default gen_random_uuid(),
  endpoint_id         uuid        not null references public.partner_webhook_endpoints(id) on delete cascade,
  event_id            text        not null,
  authorization_id    text,
  payload             jsonb       not null default '{}',
  status              text        not null default 'pending'
                      check (status in ('pending','delivered','failed')),
  attempt_count       int         not null default 0,
  last_error          text,
  idempotency_key     text        not null,
  created_at          timestamptz not null default now(),
  delivered_at        timestamptz,
  unique (idempotency_key)
);

alter table public.wallet_binding_challenges enable row level security;
alter table public.connect_authorization_requests enable row level security;
alter table public.partner_webhook_endpoints enable row level security;
alter table public.partner_webhook_deliveries enable row level security;

-- Demo connect partner (internal pilot)
insert into public.partners (partner_id, company, status, allowed_return_urls, allowed_environments)
values (
  'abraxas-connect-demo',
  'Abraxas Connect Demo (internal)',
  'active',
  array[
    'http://localhost:3000/demo/partner-access',
    'https://abraxas-app.vercel.app/demo/partner-access'
  ],
  array['sandbox','production']
)
on conflict (partner_id) do update set
  allowed_return_urls = excluded.allowed_return_urls,
  company = excluded.company;
