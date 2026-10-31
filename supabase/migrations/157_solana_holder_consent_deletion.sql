-- 157: Solana holder request pinning and atomic access revocation.
-- Requires 018, 034, 060/061, 084, 093, 105, 116, 136/137, 140/141 and 156.
-- Apply manually after checking those prerequisites. Never rewrite 061 or 156.
begin;

alter table public.verification_requests
  add column if not exists policy_version integer;
alter table public.verification_requests
  add column if not exists launchpad_application_id uuid
  references public.partner_launchpad_applications(id) on delete restrict;
alter table public.passport_holder_wallet_accounts
  add column if not exists revoked_at timestamptz;
create index if not exists passport_holder_wallet_accounts_active_idx
  on public.passport_holder_wallet_accounts(caip10) where revoked_at is null;

create or replace function public.approve_privacy_deletion_holder_atomic(
  p_request_id uuid,
  p_admin_actor_category text,
  p_idempotency_key text default null
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_request public.privacy_requests%rowtype;
  v_subject public.passport_holder_subjects%rowtype;
  v_now timestamptz := now();
  v_metadata jsonb;
begin
  if p_admin_actor_category is null or length(trim(p_admin_actor_category)) = 0 then
    raise exception 'admin_actor_required';
  end if;

  select * into v_request from public.privacy_requests
  where id = p_request_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'request_not_found'); end if;
  if v_request.request_type <> 'account_deletion'
    or v_request.subject_sui !~ '^abx_hs_[0-9a-f]{32}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_holder_deletion_request');
  end if;

  select * into v_subject from public.passport_holder_subjects
  where subject_id = v_request.subject_sui for update;
  if not found then raise exception 'holder_subject_missing'; end if;

  if v_request.status = 'access_revoked_pending_purge' then
    if v_subject.status <> 'suspended'
      or exists (select 1 from public.passport_holder_wallet_accounts
                 where subject_id = v_subject.subject_id and revoked_at is null)
      or exists (select 1 from public.passport_reusable_credentials
                 where holder_subject_id = v_subject.subject_id)
      or exists (select 1 from public.credential_claims
                 where subject_id = v_subject.subject_id and status = 'active')
      or exists (select 1 from public.verification_decisions
                 where subject_id = v_subject.subject_id and status = 'active')
      or exists (select 1 from public.consent_receipts
                 where subject_id = v_subject.subject_id and revoked_at is null) then
      raise exception 'holder_revocation_incomplete';
    end if;
    return jsonb_build_object('ok', true, 'request_id', p_request_id,
      'status', v_request.status, 'access_revoked', true, 'already_processed', true);
  end if;
  if v_request.status <> 'under_review' then
    return jsonb_build_object('ok', false, 'error', 'review_required');
  end if;

  -- A failed statement aborts this entire function call and rolls back all writes.
  update public.passport_holder_subjects set status = 'suspended'
    where subject_id = v_subject.subject_id;
  update public.passport_holder_wallet_accounts set revoked_at = v_now
    where subject_id = v_subject.subject_id and revoked_at is null;
  update public.wallet_bindings set revoked_at = v_now
    where subject_id = v_subject.subject_id and revoked_at is null;

  with revoked as (
    update public.credential_claims
       set status = 'revoked', status_updated_at = v_now,
           status_reason_code = 'privacy_deletion_approved',
           status_changed_by = p_admin_actor_category,
           revocation_reference = 'privacy_deletion_approved', updated_at = v_now
     where subject_id = v_subject.subject_id and status = 'active'
     returning id
  )
  insert into public.credential_status_events
    (claim_id, from_status, to_status, reason_code, changed_by, idempotency_key, affected_receipt_ids)
  select id, 'active', 'revoked', 'privacy_deletion_approved', p_admin_actor_category,
    'holder-delete:' || p_request_id::text || ':claim:' || id::text,
    coalesce((select array_agg(receipt_id::text) from public.receipt_claim_dependencies
              where claim_id = revoked.id), '{}'::text[])
  from revoked on conflict (idempotency_key) do nothing;

  update public.abraxas_credentials set revoked_at = v_now
    where jti in (select linked_credential_jti from public.passport_reusable_credentials
                  where holder_subject_id = v_subject.subject_id) and revoked_at is null;
  update public.identity_verifications set status = 'revoked', updated_at = v_now
    where holder_subject_id = v_subject.subject_id and status <> 'revoked';

  update public.reusable_eligibility_facts set status = 'revoked', revoked_at = v_now
    where source_receipt_id in (
      select dr.id from public.decision_receipts dr
      join public.verification_decisions vd on vd.id = dr.verification_decision_id
      where vd.subject_id = v_subject.subject_id
    ) and status = 'active';
  update public.decision_receipts set status = 'revoked', revoked_at = v_now
    where verification_decision_id in (
      select id from public.verification_decisions where subject_id = v_subject.subject_id
    ) and status = 'active';
  update public.verification_decisions set status = 'revoked'
    where subject_id = v_subject.subject_id and status = 'active';
  update public.consent_receipts set revoked_at = v_now
    where subject_id = v_subject.subject_id and revoked_at is null;

  update public.eligibility_presentations set status = 'revoked', revoked_at = v_now
    where request_ref in (
      select epr.request_ref from public.eligibility_presentation_requests epr
      join public.decision_receipts dr on dr.id = epr.source_receipt_id
      join public.verification_decisions vd on vd.id = dr.verification_decision_id
      where vd.subject_id = v_subject.subject_id
    ) and status = 'issued';
  update public.eligibility_presentation_requests set status = 'revoked', revoked_at = v_now
    where source_receipt_id in (
      select dr.id from public.decision_receipts dr
      join public.verification_decisions vd on vd.id = dr.verification_decision_id
      where vd.subject_id = v_subject.subject_id
    ) and status in ('created', 'completed', 'issued');
  update public.passport_institutional_presentation_consents
    set expires_at = v_now
    where holder_subject_id = v_subject.subject_id and expires_at > v_now;

  delete from public.passport_possession_challenges
    where credential_id in (select credential_id from public.passport_reusable_credentials
                            where holder_subject_id = v_subject.subject_id);
  delete from public.passport_reusable_credentials
    where holder_subject_id = v_subject.subject_id;
  delete from public.passport_holder_possession_keys
    where holder_subject_id = v_subject.subject_id;

  update public.privacy_requests
    set status = 'access_revoked_pending_purge',
        reason_code = 'deletion_purge_pending', updated_at = v_now
    where id = p_request_id;
  v_metadata := jsonb_build_object('request_type', 'account_deletion',
    'from_status', v_request.status, 'to_status', 'access_revoked_pending_purge',
    'changed_by_category', 'admin', 'admin_actor_category', p_admin_actor_category,
    'access_revoked', true, 'purge_pending', true);
  insert into public.privacy_request_events
    (request_id, from_status, to_status, reason_code, changed_by_category,
     admin_actor_category, idempotency_key, metadata)
  values (p_request_id, v_request.status, 'access_revoked_pending_purge',
    'deletion_purge_pending', 'admin', p_admin_actor_category, p_idempotency_key, v_metadata);
  insert into public.audit_events
    (actor_type, actor_id, action, object_type, object_id, metadata, event_hash)
  values ('admin', p_admin_actor_category, 'privacy.deletion.access_revoked',
    'privacy_request', p_request_id::text, v_metadata,
    encode(digest(v_metadata::text, 'sha256'), 'hex'));

  return jsonb_build_object('ok', true, 'request_id', p_request_id,
    'status', 'access_revoked_pending_purge', 'access_revoked', true,
    'already_processed', false);
end;
$$;

revoke all on function public.approve_privacy_deletion_holder_atomic(uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.approve_privacy_deletion_holder_atomic(uuid,text,text)
  to service_role;
commit;
