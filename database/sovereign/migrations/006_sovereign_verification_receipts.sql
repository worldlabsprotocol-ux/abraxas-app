-- Verification requests and signed receipt references for sovereign Launchpad (Build #744).
begin;

create table if not exists public.partner_launchpad_verification_requests (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.partner_launchpad_applications(id) on delete cascade,
  partner_id text not null references public.partners(partner_id) on delete cascade,
  policy_id text not null,
  policy_version integer not null,
  scenario_id text,
  idempotency_key text unique,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists partner_launchpad_verification_requests_app_idx
  on public.partner_launchpad_verification_requests (application_id, created_at desc);

create table if not exists public.partner_launchpad_signed_receipts (
  id uuid primary key default gen_random_uuid(),
  verification_request_id uuid references public.partner_launchpad_verification_requests(id) on delete set null,
  receipt_id text not null unique,
  application_id uuid not null references public.partner_launchpad_applications(id) on delete cascade,
  partner_id text not null,
  policy_id text not null,
  policy_version integer not null,
  public_payload jsonb not null,
  signature text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists partner_launchpad_signed_receipts_app_idx
  on public.partner_launchpad_signed_receipts (application_id, created_at desc);

create table if not exists public.partner_launchpad_usage_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.partner_launchpad_applications(id) on delete cascade,
  partner_id text not null,
  event_kind text not null,
  quantity integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists partner_launchpad_usage_events_app_idx
  on public.partner_launchpad_usage_events (application_id, created_at desc);

revoke all on public.partner_launchpad_verification_requests from public;
revoke all on public.partner_launchpad_signed_receipts from public;
revoke all on public.partner_launchpad_usage_events from public;

grant select, insert, update on public.partner_launchpad_verification_requests to abraxas_runtime;
grant select, insert, update on public.partner_launchpad_signed_receipts to abraxas_runtime;
grant select, insert on public.partner_launchpad_usage_events to abraxas_runtime;

commit;
