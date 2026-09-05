-- 080_age_assurance_sessions.sql
-- Provider-neutral age-assurance sessions (additive, privacy-minimized).

create table if not exists public.age_assurance_sessions (
  id                    uuid        primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  session_nonce         text        not null unique,
  provider_id           text        not null,
  provider_session_id   text,
  subject_sui_address   text        not null,
  partner_id            text        not null,
  policy_id             text        not null,
  return_url            text        not null,
  requested_threshold   int         not null check (requested_threshold in (18, 21)),
  status                text        not null default 'pending'
    check (status in ('pending', 'redirected', 'completed', 'failed', 'expired', 'cancelled')),
  age_band_result       text check (age_band_result in ('under_18', 'over_18', 'over_21', 'unknown')),
  assurance_level       text,
  evidence_ref_hash     text,
  callback_consumed_at  timestamptz,
  expires_at            timestamptz not null,
  completed_at          timestamptz,
  reason_code           text
);

create unique index if not exists idx_age_assurance_provider_session
  on public.age_assurance_sessions (provider_id, provider_session_id)
  where provider_session_id is not null;

create index if not exists idx_age_assurance_subject_status
  on public.age_assurance_sessions (subject_sui_address, status, created_at desc);

create index if not exists idx_age_assurance_partner_policy
  on public.age_assurance_sessions (partner_id, policy_id, status);

create index if not exists idx_age_assurance_expires
  on public.age_assurance_sessions (expires_at)
  where status in ('pending', 'redirected');

alter table public.age_assurance_sessions enable row level security;
revoke all on public.age_assurance_sessions from anon, authenticated;
grant select, insert, update on public.age_assurance_sessions to service_role;

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'age_assurance_sessions'
  ) then
    raise exception 'age_assurance_sessions table missing after migration 080';
  end if;
end $$;
