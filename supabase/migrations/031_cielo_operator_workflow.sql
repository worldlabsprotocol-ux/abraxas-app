-- 031_cielo_operator_workflow.sql
-- SUPERSEDED: use 032_reconcile_sandbox_and_cielo_operator_workflow.sql instead.
-- Kept for history only — do not run if applying 032.

alter table public.cielo_verified_rate_requests
  add column if not exists assigned_to text,
  add column if not exists operator_notes jsonb not null default '[]'::jsonb,
  add column if not exists contacted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists decided_at timestamptz,
  add column if not exists decision_reason text;

create table if not exists public.cielo_verified_rate_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cielo_verified_rate_requests(id) on delete cascade,
  public_reference text not null,
  actor_type text not null check (actor_type in ('operator', 'system', 'subject')),
  actor_id text not null,
  prior_status text,
  next_status text not null,
  action text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists cielo_vr_events_request_idx
  on public.cielo_verified_rate_request_events (request_id, created_at asc);

create index if not exists cielo_vr_events_ref_idx
  on public.cielo_verified_rate_request_events (public_reference, created_at asc);

create index if not exists cielo_verified_rate_requests_assigned_idx
  on public.cielo_verified_rate_requests (assigned_to, status, created_at desc);

create index if not exists cielo_verified_rate_requests_queue_idx
  on public.cielo_verified_rate_requests (status, created_at desc);

alter table public.cielo_verified_rate_request_events enable row level security;

-- Direct client access denied; API routes use service role.
-- SUPERSEDED by 032 — do not run 031 if applying 032.
create policy "cielo_vr_events_service_only"
  on public.cielo_verified_rate_request_events
  for all
  using (false)
  with check (false);
