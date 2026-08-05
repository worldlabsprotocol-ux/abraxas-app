-- 055_policy_immutable_versions.sql
-- P1-1: Immutable published policy versions.
--
-- Lifecycle:
--   draft       — editable; may be deleted
--   active      — immutable identity, version, and rules_json; one active row per policy id
--   deprecated  — immutable historical snapshot; retained for reproducibility
--
-- Changing rules requires INSERT of a new version row, then publish (draft → active)
-- while deprecating the prior active version (use 056_publish_partner_policy_draft_rpc.sql).
--
-- ── PREFLIGHT (run manually before applying — migration also enforces FK guard) ──
-- select id, version, status from public.partner_policies order by id, version;
--
-- -- List every inbound FK referencing partner_policies (STOP if any unexpected name):
-- select con.conname as constraint_name,
--        conrelid::regclass as referencing_table
--   from pg_constraint con
--  where con.contype = 'f'
--    and con.confrelid = 'public.partner_policies'::regclass
--  order by 1;
--
-- Permitted inbound FK names (must match lib/policy/partnerPoliciesFkAllowlist.ts):
--   verification_requests_policy_id_fkey
--   partner_issuer_trust_rules_policy_id_fkey
--
-- STOP CONDITION: if the query above returns any constraint_name not in the permitted list,
-- do not apply this migration — review the new FK and update the allowlist + migration guard.
--
-- ── ROLLBACK (manual; do not run in CI) ─────────────────────────
-- drop trigger if exists trg_partner_policies_immutability on public.partner_policies;
-- drop function if exists public.enforce_partner_policy_immutability();
-- drop index if exists public.partner_policies_one_active_per_id;
-- alter table public.partner_policies drop constraint if exists partner_policies_pkey;
-- alter table public.partner_policies add primary key (id);
-- (Re-add dropped FKs only if your environment had them and you need strict referential integrity.)

begin;

do $$
declare
  fk record;
  allowed text[] := array[
    'verification_requests_policy_id_fkey',
    'partner_issuer_trust_rules_policy_id_fkey'
  ];
begin
  for fk in
    select con.conname as constraint_name
      from pg_constraint con
     where con.contype = 'f'
       and con.confrelid = 'public.partner_policies'::regclass
  loop
    if not (fk.constraint_name = any(allowed)) then
      raise exception
        '055_policy_immutable_versions: unexpected FK % referencing partner_policies — stop and review before migrating',
        fk.constraint_name;
    end if;
  end loop;
end $$;

-- Drop reviewed FK constraints that reference partner_policies(id) alone.
-- policy_id columns reference the policy family id, not a specific version row.
alter table if exists public.verification_requests
  drop constraint if exists verification_requests_policy_id_fkey;

alter table if exists public.partner_issuer_trust_rules
  drop constraint if exists partner_issuer_trust_rules_policy_id_fkey;

-- Move primary key from id → (id, version) so multiple versions share a policy id.
alter table public.partner_policies
  drop constraint if exists partner_policies_pkey;

alter table public.partner_policies
  add constraint partner_policies_pkey primary key (id, version);

-- At most one active version per policy id.
create unique index if not exists partner_policies_one_active_per_id
  on public.partner_policies (id)
  where status = 'active';

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
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.version is null or new.version < 1 then
      raise exception 'partner_policies: version must be a positive integer';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- Draft rows remain fully editable (including delete via separate op).
    if old.status = 'draft' then
      return new;
    end if;

    -- Published rows: identity + rules are immutable.
    if old.status in ('active', 'deprecated') then
      foreach field_name in array immutable_fields loop
        if to_jsonb(old) -> field_name is distinct from to_jsonb(new) -> field_name then
          raise exception 'partner_policies: cannot mutate % on % policy version %.%',
            field_name, old.status, old.id, old.version;
        end if;
      end loop;
    end if;

    -- Allowed status transitions for published rows.
    if old.status = 'active' and new.status not in ('active', 'deprecated') then
      raise exception 'partner_policies: active version may only transition to deprecated';
    end if;
    if old.status = 'deprecated' and new.status <> 'deprecated' then
      raise exception 'partner_policies: deprecated versions cannot be reactivated';
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

-- Self-contained immutability probe: attempt to mutate active rules_json and expect trigger rejection.
-- Uses a nested BEGIN … EXCEPTION block (subtransaction) so no probe mutation persists.
do $$
declare
  active_row record;
begin
  select id, version
    into active_row
    from public.partner_policies
   where status = 'active'
   order by id, version
   limit 1;

  if not found then
    raise notice '055_policy_immutable_versions: skipping immutability probe — no active policy rows';
    return;
  end if;

  begin
    update public.partner_policies
       set rules_json = rules_json || jsonb_build_object('__p1_1_immutability_probe', true)
     where id = active_row.id
       and version = active_row.version
       and status = 'active';
  exception
    when others then
      if sqlerrm not like '%cannot mutate rules_json%' then
        raise;
      end if;
      return;
  end;

  raise exception
    '055_policy_immutable_versions: immutability probe failed — active rules_json mutation succeeded for %.%',
    active_row.id, active_row.version;
end $$;

commit;

-- ── POST-MIGRATION VERIFICATION (manual operator re-check) ──────
-- select id, version, status from public.partner_policies order by id, version;
-- \d public.partner_policies
--
-- -- Self-contained immutability probe (expect NOTICE skip or successful trigger rejection):
-- do $$
-- declare
--   active_row record;
-- begin
--   select id, version into active_row
--     from public.partner_policies where status = 'active' order by id, version limit 1;
--   if not found then
--     raise notice 'no active policy rows — probe skipped';
--     return;
--   end if;
--   begin
--     update public.partner_policies
--        set rules_json = rules_json || jsonb_build_object('__manual_probe', true)
--      where id = active_row.id and version = active_row.version and status = 'active';
--   exception when others then
--     if sqlerrm not like '%cannot mutate rules_json%' then raise; end if;
--     raise notice 'immutability trigger rejected mutation as expected';
--     return;
--   end;
--   raise exception 'immutability probe failed — mutation succeeded';
-- end $$;
