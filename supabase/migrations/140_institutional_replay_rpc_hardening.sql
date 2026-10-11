-- Hardening for institutional replay RPC (apply after 139 on DEMO; operator-gated).
-- Revoke direct table INSERT — only SECURITY DEFINER RPC may persist nonces.

revoke insert on table public.institutional_eligibility_consume_nonces from service_role;

create or replace function public.institutional_eligibility_consume_nonce(
  p_partner_id text,
  p_application_id text,
  p_receipt_id text,
  p_subject_scope_hash text,
  p_policy_id text,
  p_policy_version integer,
  p_action_scope_norm text,
  p_nonce_hash text,
  p_expires_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(coalesce(p_partner_id, '')) = 0 or length(p_partner_id) > 128 then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if length(coalesce(p_receipt_id, '')) = 0 or length(p_receipt_id) > 128 then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if length(coalesce(p_policy_id, '')) = 0 or length(p_policy_id) > 256 then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if length(coalesce(p_action_scope_norm, '')) > 256 then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if p_nonce_hash is null or p_nonce_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if p_subject_scope_hash is null or p_subject_scope_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if p_expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'expired');
  end if;

  begin
    insert into public.institutional_eligibility_consume_nonces (
      partner_id,
      application_id,
      receipt_id,
      subject_scope_hash,
      policy_id,
      policy_version,
      action_scope_norm,
      nonce_hash,
      expires_at
    )
    values (
      p_partner_id,
      coalesce(p_application_id, ''),
      p_receipt_id,
      p_subject_scope_hash,
      p_policy_id,
      p_policy_version,
      coalesce(p_action_scope_norm, ''),
      p_nonce_hash,
      p_expires_at
    );
    return jsonb_build_object('ok', true, 'code', 'consumed');
  exception
    when unique_violation then
      return jsonb_build_object('ok', false, 'code', 'replayed');
  end;
end;
$$;

revoke all on function public.institutional_eligibility_consume_nonce(
  text, text, text, text, text, integer, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.institutional_eligibility_consume_nonce(
  text, text, text, text, text, integer, text, text, timestamptz
) to service_role;
