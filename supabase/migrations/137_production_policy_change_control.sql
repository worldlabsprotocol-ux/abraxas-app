-- 137_production_policy_change_control.sql
-- Production enablement for Policy Change Control (088-equivalent schema).
--
-- Operator apply ONLY to production Supabase bztwutzprwsdrtqdpymf after explicit approval.
-- Do NOT run adoption or production activation in the same transaction.
--
-- Prerequisites (must already exist on target):
--   055_policy_immutable_versions.sql  — composite PK + immutability trigger
--   056_publish_partner_policy_draft_rpc.sql
--   084_partner_launchpad_foundation.sql
--
-- Idempotent: safe to re-run. Uses IF NOT EXISTS / CREATE OR REPLACE.
--
-- Rollback (manual; operator only — drops audit/adoption history):
--   drop trigger if exists trg_partner_policies_immutability on public.partner_policies;
--   -- Re-apply enforce_partner_policy_immutability() from 055_policy_immutable_versions.sql
--   drop trigger if exists trg_partner_policy_adoptions_append_only on public.partner_policy_adoptions;
--   drop trigger if exists trg_partner_policy_lifecycle_audit_append_only on public.partner_policy_lifecycle_audit;
--   drop table if exists public.partner_policy_adoptions;
--   drop table if exists public.partner_policy_lifecycle_audit;
--   alter table public.partner_policies drop column if exists deprecate_effective_at;

begin;

-- ── PREFLIGHT ───────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.partner_policies') is null then
    raise exception '137: partner_policies missing — apply 055 first';
  end if;

  if not exists (
    select 1
      from pg_indexes
     where schemaname = 'public'
       and tablename = 'partner_policies'
       and indexname = 'partner_policies_one_active_per_id'
  ) then
    raise exception '137: partner_policies_one_active_per_id missing — apply 055 first';
  end if;

  if to_regclass('public.partner_launchpad_applications') is null then
    raise exception '137: partner_launchpad_applications missing — apply 084 first';
  end if;

  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'partner_policies'
       and column_name = 'deprecate_effective_at'
  ) and exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'partner_policy_lifecycle_audit'
  ) and exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'partner_policy_adoptions'
  ) then
    raise notice '137: Policy Change Control schema already present — idempotent no-op';
  end if;
end $$;

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

-- ── Immutability trigger: published identity/rules frozen; scheduled deprecation ──
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

-- ── POST-APPLY VERIFICATION (operator SQL Editor) ───────────────
-- select column_name from information_schema.columns
--  where table_schema = 'public' and table_name = 'partner_policies' and column_name = 'deprecate_effective_at';
-- select to_regclass('public.partner_policy_lifecycle_audit'), to_regclass('public.partner_policy_adoptions');

-- ── Atomic policy version adoption (single transaction) ─────────
begin;

create or replace function public.partner_policy_adopt_version_atomic(
  p_application_id uuid,
  p_partner_id text,
  p_policy_id text,
  p_from_version int,
  p_to_version int,
  p_actor_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_app public.partner_launchpad_applications%rowtype;
  v_target public.partner_policies%rowtype;
  v_now timestamptz := pg_catalog.now();
  v_actor_id text;
  v_adoption_complete boolean;
begin
  if p_application_id is null or p_partner_id is null or p_policy_id is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;
  if p_from_version is null or p_to_version is null or p_from_version < 1 or p_to_version < 1 then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;
  if p_from_version = p_to_version then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

  select *
    into v_app
    from public.partner_launchpad_applications
   where id = p_application_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_app.partner_id <> p_partner_id or v_app.policy_id <> p_policy_id then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  v_actor_id := v_app.partner_id;
  if p_actor_id is not null and p_actor_id <> v_app.partner_id then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

  select exists (
    select 1
      from public.partner_policy_adoptions
     where application_id = p_application_id
       and partner_id = v_app.partner_id
       and policy_id = v_app.policy_id
       and to_version = p_to_version
  ) and exists (
    select 1
      from public.partner_policy_lifecycle_audit
     where application_id = p_application_id
       and partner_id = v_app.partner_id
       and policy_id = v_app.policy_id
       and event_type = 'adopted'
       and to_version = p_to_version
  )
    into v_adoption_complete;

  if v_app.policy_version = p_to_version then
    if v_adoption_complete then
      return jsonb_build_object(
        'ok', true,
        'code', 'idempotent_replay',
        'application', to_jsonb(v_app),
        'from_version', v_app.policy_version,
        'to_version', p_to_version,
        'idempotent_replay', true
      );
    end if;
    return jsonb_build_object('ok', false, 'code', 'adoption_audit_incomplete');
  end if;

  if v_app.policy_version <> p_from_version then
    return jsonb_build_object('ok', false, 'code', 'policy_version_mismatched');
  end if;

  select *
    into v_target
    from public.partner_policies
   where id = v_app.policy_id
     and version = p_to_version
     and partner_id = v_app.partner_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'policy_version_unknown');
  end if;

  if v_target.status = 'draft' then
    return jsonb_build_object('ok', false, 'code', 'policy_version_draft');
  end if;

  if v_target.status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'policy_version_deprecated');
  end if;

  if v_target.effective_at is not null and v_target.effective_at > v_now then
    return jsonb_build_object('ok', false, 'code', 'policy_version_not_yet_effective');
  end if;

  update public.partner_launchpad_applications
     set policy_version = p_to_version,
         updated_at = v_now
   where id = p_application_id
     and partner_id = v_app.partner_id
     and policy_id = v_app.policy_id
     and policy_version = p_from_version;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'policy_version_mismatched');
  end if;

  if to_regclass('public.partner_launchpad_application_policies') is not null then
    update public.partner_launchpad_application_policies
       set policy_version = p_to_version,
           updated_at = v_now
     where application_id = p_application_id
       and partner_id = v_app.partner_id
       and policy_id = v_app.policy_id
       and binding_role = 'primary';
  end if;

  insert into public.partner_policy_adoptions (
    application_id,
    partner_id,
    policy_id,
    from_version,
    to_version,
    actor_id
  ) values (
    p_application_id,
    v_app.partner_id,
    v_app.policy_id,
    p_from_version,
    p_to_version,
    v_actor_id
  );

  insert into public.partner_policy_lifecycle_audit (
    policy_id,
    version,
    partner_id,
    event_type,
    actor_type,
    actor_id,
    application_id,
    from_version,
    to_version
  ) values (
    v_app.policy_id,
    p_to_version,
    v_app.partner_id,
    'adopted',
    'partner',
    v_actor_id,
    p_application_id,
    p_from_version,
    p_to_version
  );

  select *
    into v_app
    from public.partner_launchpad_applications
   where id = p_application_id;

  return jsonb_build_object(
    'ok', true,
    'code', 'adopted',
    'application', to_jsonb(v_app),
    'from_version', p_from_version,
    'to_version', p_to_version,
    'idempotent_replay', false
  );
exception
  when unique_violation then
    select *
      into v_app
      from public.partner_launchpad_applications
     where id = p_application_id;

    if not found or v_app.policy_version <> p_to_version then
      return jsonb_build_object('ok', false, 'code', 'adoption_write_failed');
    end if;

    select exists (
      select 1
        from public.partner_policy_adoptions
       where application_id = p_application_id
         and partner_id = v_app.partner_id
         and policy_id = v_app.policy_id
         and to_version = p_to_version
    ) and exists (
      select 1
        from public.partner_policy_lifecycle_audit
       where application_id = p_application_id
         and partner_id = v_app.partner_id
         and policy_id = v_app.policy_id
         and event_type = 'adopted'
         and to_version = p_to_version
    )
      into v_adoption_complete;

    if v_adoption_complete then
      return jsonb_build_object(
        'ok', true,
        'code', 'idempotent_replay',
        'application', to_jsonb(v_app),
        'from_version', p_from_version,
        'to_version', p_to_version,
        'idempotent_replay', true
      );
    end if;

    return jsonb_build_object('ok', false, 'code', 'adoption_audit_incomplete');
  when others then
    return jsonb_build_object('ok', false, 'code', 'adoption_write_failed');
end;
$$;

revoke all on function public.partner_policy_adopt_version_atomic(uuid, text, text, int, int, text) from public;
revoke all on function public.partner_policy_adopt_version_atomic(uuid, text, text, int, int, text) from anon, authenticated;
grant execute on function public.partner_policy_adopt_version_atomic(uuid, text, text, int, int, text) to service_role;

commit;
