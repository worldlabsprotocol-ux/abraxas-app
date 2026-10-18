-- Minimal developer sandbox / launchpad tables for sovereign enroll (no Supabase RPC).
begin;

create table if not exists public.partners (
  partner_id text primary key,
  company text not null,
  status text not null default 'pilot',
  allowed_environments text[] not null default array['sandbox']::text[],
  allowed_return_urls text[] not null default '{}'::text[],
  assigned_policy_id text,
  is_external boolean not null default true,
  public_listing_ok boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_policies (
  id text not null,
  version integer not null,
  partner_id text not null references public.partners(partner_id) on delete cascade,
  name text not null,
  status text not null default 'active',
  rules_json jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (id, version)
);

create table if not exists public.partner_api_keys (
  id uuid primary key default gen_random_uuid(),
  partner_id text not null references public.partners(partner_id) on delete cascade,
  display_name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default array['verify:credential', 'verify:registry', 'webhooks:read']::text[],
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists partner_api_keys_partner_idx on public.partner_api_keys (partner_id);

create table if not exists public.partner_launchpad_applications (
  id uuid primary key default gen_random_uuid(),
  public_slug text not null unique,
  partner_id text not null references public.partners(partner_id) on delete restrict,
  application_name text not null,
  display_name text not null,
  environment text not null default 'sandbox' check (environment in ('sandbox', 'production')),
  policy_id text not null,
  policy_version integer not null default 1,
  policy_template_id text not null,
  allowed_return_urls text[] not null default '{}'::text[],
  api_key_id uuid references public.partner_api_keys(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'suspended', 'pending')),
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_launchpad_applications_partner_idx
  on public.partner_launchpad_applications (partner_id);

create table if not exists public.partner_launchpad_activity (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.partner_launchpad_applications(id) on delete cascade,
  partner_id text not null,
  event_type text not null,
  public_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.abraxas_sandbox_audit_events (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  partner_id text not null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists abraxas_sandbox_audit_events_account_idx
  on public.abraxas_sandbox_audit_events (account_id, created_at desc);

revoke all on public.partners from public;
revoke all on public.partner_policies from public;
revoke all on public.partner_api_keys from public;
revoke all on public.partner_launchpad_applications from public;
revoke all on public.partner_launchpad_activity from public;
revoke all on public.abraxas_sandbox_audit_events from public;

grant select, insert, update, delete on public.partners to abraxas_runtime;
grant select, insert, update, delete on public.partner_policies to abraxas_runtime;
grant select, insert, update, delete on public.partner_api_keys to abraxas_runtime;
grant select, insert, update, delete on public.partner_launchpad_applications to abraxas_runtime;
grant select, insert on public.partner_launchpad_activity to abraxas_runtime;
grant select, insert on public.abraxas_sandbox_audit_events to abraxas_runtime;

commit;
