-- Tenant-scoped Partner Flow OAuth continuations. No receipts or PII.

create table if not exists public.partner_flow_continuations (
  jti text primary key,
  partner_id text not null,
  policy_id text not null,
  policy_version integer,
  return_url text not null,
  permission text,
  permission_version text,
  purpose text,
  app_slug text,
  verify_request_id uuid,
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_partner_flow_continuations_partner_expires
  on public.partner_flow_continuations (partner_id, expires_at);

alter table public.partner_flow_continuations enable row level security;

grant select, insert, update on table public.partner_flow_continuations to service_role;
