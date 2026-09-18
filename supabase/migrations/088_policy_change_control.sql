-- 088_policy_change_control.sql
-- Policy Change Control: partner-owned immutable version lifecycle, explicit adoption,
-- append-only audit, and fail-closed deletion guards.
--
-- DEMO-only operator apply. Do not run against MAIN / Production Supabase.
-- Immediate authorized target: isolated demo project ocntwbxarpjeixdnzide.
-- SQL Editor: https://supabase.com/dashboard/project/ocntwbxarpjeixdnzide/sql/new
--
-- Prerequisite: 055_policy_immutable_versions.sql, 056_publish_partner_policy_draft_rpc.sql,
-- 084_partner_launchpad_foundation.sql (for launchpad bindings).
--
-- This migration does NOT:
--   - mutate published policy identity or rules_json
--   - auto-apply on Vercel
--   - grant privileges to anon or authenticated
--   - enable production activation
--
-- Idempotent: safe to re-run. Uses IF NOT EXISTS / CREATE OR REPLACE.

begin;

-- Optional future deprecation date. Identity/rules remain frozen by the immutability trigger.
alter table public.partner_policies
  add column if not exists deprecate_effective_at timestamptz;

-- ── Append-only lifecycle audit ─────────────────────────────────
create table if not exists public.partner_policy_lifecycle_audit (
  id uuid primary key default gen_random_uuid(),
  policy_id text not null,
  version int not null,
  partner_id text not null,
  event_type text not null
    check (event_type in ('created', 'draft_changed', 'published', 'adopted', 'deprecated')),
  actor_type text not null default 'partner'
    check (actor_type in ('partner', 'operator', 'system')),
  actor_id text,
  application_id uuid,
  from_version int,
  to_version int,
  safe_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists partner_policy_lifecycle_audit_policy_idx
  on public.partner_policy_lifecycle_audit (policy_id, version, created_at);

create or replace function public.enforce_partner_policy_lifecycle_audit_append_only()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'partner_policy_lifecycle_audit: append-only — updates are forbidden';
  end if;
  if tg_op = 'DELETE' then
    raise exception 'partner_policy_lifecycle_audit: append-only — deletes are forbidden';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_partner_policy_lifecycle_audit_append_only
  on public.partner_policy_lifecycle_audit;
create trigger trg_partner_policy_lifecycle_audit_append_only
  before update or delete on public.partner_policy_lifecycle_audit
  for each row execute function public.enforce_partner_policy_lifecycle_audit_append_only();

alter table public.partner_policy_lifecycle_audit enable row level security;
revoke all on public.partner_policy_lifecycle_audit from public, anon, authenticated;
grant select, insert on public.partner_policy_lifecycle_audit to service_role;

-- ── Explicit version adoptions (append-only) ────────────────────
create table if not exists public.partner_policy_adoptions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  partner_id text not null,
  policy_id text not null,
  from_version int not null,
  to_version int not null,
  actor_id text,
  adopted_at timestamptz not null default now(),
  unique (application_id, policy_id, to_version)
);

create index if not exists partner_policy_adoptions_app_idx
  on public.partner_policy_adoptions (application_id, adopted_at desc);

create or replace function public.enforce_partner_policy_adoptions_append_only()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'partner_policy_adoptions: append-only — updates are forbidden';
  end if;
  if tg_op = 'DELETE' then
    raise exception 'partner_policy_adoptions: append-only — deletes are forbidden';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_partner_policy_adoptions_append_only
  on public.partner_policy_adoptions;
create trigger trg_partner_policy_adoptions_append_only
  before update or delete on public.partner_policy_adoptions
  for each row execute function public.enforce_partner_policy_adoptions_append_only();

alter table public.partner_policy_adoptions enable row level security;
revoke all on public.partner_policy_adoptions from public, anon, authenticated;
grant select, insert on public.partner_policy_adoptions to service_role;

-- ── Immutability trigger: keep published identity/rules frozen; allow scheduled deprecation ──
create or replace function public.enforce_partner_policy_immutability()
returns trigger
language plpgsql
as $$
declare
  immutable_fields text[] := array['id', 'version', 'partner_id', 'name', 'rules_json', 'effective_at'];
  field_name text;
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'partner_policies: cannot delete % policy version %.%',
        old.status, old.id, old.version;
    end if;

    if to_regclass('public.decision_receipts') is not null then
      if exists (
        select 1 from public.decision_receipts
         where policy_id = old.id and policy_version = old.version
      ) then
        raise exception 'partner_policies: cannot delete version %.% — issued receipts exist',
          old.id, old.version;
      end if;
    end if;

    if to_regclass('public.verification_decisions') is not null then
      if exists (
        select 1 from public.verification_decisions
         where policy_id = old.id and policy_version = old.version
      ) then
        raise exception 'partner_policies: cannot delete version %.% — issued decisions exist',
          old.id, old.version;
      end if;
    end if;

    if to_regclass('public.partner_launchpad_applications') is not null then
      if exists (
        select 1 from public.partner_launchpad_applications
         where policy_id = old.id and policy_version = old.version
      ) then
        raise exception 'partner_policies: cannot delete version %.% — active partner bindings exist',
          old.id, old.version;
      end if;
    end if;

    if to_regclass('public.partner_policy_adoptions') is not null then
      if exists (
        select 1 from public.partner_policy_adoptions
         where policy_id = old.id and to_version = old.version
      ) then
        raise exception 'partner_policies: cannot delete version %.% — adoption records exist',
          old.id, old.version;
      end if;
    end if;

    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.version is null or new.version < 1 then
      raise exception 'partner_policies: version must be a positive integer';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'draft' then
      return new;
    end if;

    if old.status in ('active', 'deprecated') then
      foreach field_name in array immutable_fields loop
        if to_jsonb(old) -> field_name is distinct from to_jsonb(new) -> field_name then
          raise exception 'partner_policies: cannot mutate % on % policy version %.%',
            field_name, old.status, old.id, old.version;
        end if;
      end loop;
    end if;

    if old.status = 'active' and new.status not in ('active', 'deprecated') then
      raise exception 'partner_policies: active version may only transition to deprecated';
    end if;
    if old.status = 'deprecated' and new.status <> 'deprecated' then
      raise exception 'partner_policies: deprecated versions cannot be reactivated';
    end if;

    -- Scheduled deprecation may be set while active. Frozen once deprecated.
    if old.status = 'deprecated'
       and old.deprecate_effective_at is distinct from new.deprecate_effective_at then
      raise exception 'partner_policies: cannot mutate deprecate_effective_at on deprecated policy version %.%',
        old.id, old.version;
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_partner_policies_immutability on public.partner_policies;
create trigger trg_partner_policies_immutability
  before insert or update or delete on public.partner_policies
  for each row execute function public.enforce_partner_policy_immutability();

commit;

-- ── POST-APPLY (DEMO SQL Editor) ────────────────────────────────
-- select column_name from information_schema.columns
--  where table_schema = 'public' and table_name = 'partner_policies' and column_name = 'deprecate_effective_at';
-- select to_regclass('public.partner_policy_lifecycle_audit'), to_regclass('public.partner_policy_adoptions');
