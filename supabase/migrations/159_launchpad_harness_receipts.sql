-- Server-only, application-bound sandbox harness receipts for current verification.
begin;

create table if not exists public.partner_launchpad_harness_receipts (
  receipt_id text primary key,
  application_id uuid not null references public.partner_launchpad_applications(id) on delete cascade,
  partner_id text not null,
  policy_id text not null,
  policy_version integer not null,
  scenario_id text not null,
  request_status text not null check (request_status in ('completed', 'failed')),
  public_payload jsonb not null,
  signature text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists partner_launchpad_harness_receipts_app_idx
  on public.partner_launchpad_harness_receipts (application_id, created_at desc);

alter table public.partner_launchpad_harness_receipts enable row level security;
revoke all on public.partner_launchpad_harness_receipts from public, anon, authenticated;
grant select, insert on public.partner_launchpad_harness_receipts to service_role;

commit;
