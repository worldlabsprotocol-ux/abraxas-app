-- 056_publish_partner_policy_draft_rpc.sql
-- P1-1: Atomic operator publish — deprecate prior active + activate draft in one transaction.
--
-- Prerequisite: 055_policy_immutable_versions.sql applied.
--
-- ── POST-MIGRATION VERIFICATION ─────────────────────────────────
-- select public.publish_partner_policy_draft('good-trouble-retail-v1', 2);
-- -- Expect error when draft missing or not draft status.

create or replace function public.publish_partner_policy_draft(
  p_policy_id text,
  p_target_version int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.partner_policies%rowtype;
  v_active public.partner_policies%rowtype;
  v_deprecated_version int := null;
begin
  if p_policy_id is null or btrim(p_policy_id) = '' then
    raise exception 'publish_partner_policy_draft: policy_id required';
  end if;

  if p_target_version is null or p_target_version < 1 then
    raise exception 'publish_partner_policy_draft: target_version must be a positive integer';
  end if;

  -- Lock the policy family to serialize concurrent publish attempts.
  perform 1
    from public.partner_policies
   where id = p_policy_id
     for update;

  select *
    into v_draft
    from public.partner_policies
   where id = p_policy_id
     and version = p_target_version;

  if not found then
    raise exception 'publish_partner_policy_draft: policy version not found: %.%',
      p_policy_id, p_target_version;
  end if;

  if v_draft.status <> 'draft' then
    raise exception 'publish_partner_policy_draft: only draft versions can be published (% v% is %)',
      p_policy_id, p_target_version, v_draft.status;
  end if;

  select *
    into v_active
    from public.partner_policies
   where id = p_policy_id
     and status = 'active'
     for update;

  if found and v_active.version <> p_target_version then
    update public.partner_policies
       set status = 'deprecated'
     where id = p_policy_id
       and version = v_active.version
       and status = 'active';

    if not found then
      raise exception 'publish_partner_policy_draft: failed to deprecate active version % for %',
        v_active.version, p_policy_id;
    end if;

    v_deprecated_version := v_active.version;
  end if;

  update public.partner_policies
     set status = 'active'
   where id = p_policy_id
     and version = p_target_version
     and status = 'draft'
  returning * into v_draft;

  if not found then
    raise exception 'publish_partner_policy_draft: failed to activate draft % v% (concurrent publish?)',
      p_policy_id, p_target_version;
  end if;

  -- Post-condition: exactly one active row for this policy family.
  if (
    select count(*)
      from public.partner_policies
     where id = p_policy_id
       and status = 'active'
  ) <> 1 then
    raise exception 'publish_partner_policy_draft: invariant violated — expected exactly one active version for %',
      p_policy_id;
  end if;

  return jsonb_build_object(
    'published', to_jsonb(v_draft),
    'deprecated_version', v_deprecated_version
  );
end;
$$;

revoke all on function public.publish_partner_policy_draft(text, int) from public;
grant execute on function public.publish_partner_policy_draft(text, int) to service_role;
