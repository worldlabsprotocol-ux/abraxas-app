-- 135_wallet_control_post_revocation_contamination.sql
-- Remediate repair-minted wallet-control claims after holder-intent revocation.
-- Idempotent: only affects active claims/binding rows matching provenance semantics.

begin;

-- Holder-intent revocations (durable audit lineage — not mutable wallet_bindings.revoked_at).
create temp table if not exists _wc_holder_revocations on commit drop as
select
  ae.object_id as binding_id,
  max(ae.created_at) as holder_revoked_at
from public.audit_events ae
where ae.action = 'wallet.revoked'
  and ae.object_type = 'wallet_binding'
  and coalesce(ae.metadata->>'reason', '') = 'holder_unlinked'
group by ae.object_id;

-- Contaminated: issued after holder revoke without explicit wallet proof artifacts.
create temp table if not exists _wc_contaminated_claims on commit drop as
select c.id as claim_id
from public.credential_claims c
join _wc_holder_revocations hr on (
  c.evidence_reference = 'wb:' || hr.binding_id
  or coalesce(c.claim_value->>'wallet_binding_id', '') = hr.binding_id::text
)
where c.claim_type = 'wallet_binding_confirmed'
  and c.status = 'active'
  and c.issued_at > hr.holder_revoked_at
  and coalesce(c.claim_value->>'binding_method', c.claim_value->>'control_method', '') = 'zklogin'
  and nullif(btrim(c.claim_value->>'challenge_id'), '') is null
  and nullif(btrim(c.claim_value->>'proof_signature'), '') is null;

update public.credential_claims c
set
  status = 'expired',
  revocation_reference = 'wallet_control_provenance_insufficient',
  updated_at = pg_catalog.now()
from _wc_contaminated_claims cc
where c.id = cc.claim_id
  and c.status = 'active';

-- Also expire active claims issued before/at holder revoke (predates revocation).
update public.credential_claims c
set
  status = 'expired',
  revocation_reference = coalesce(c.revocation_reference, 'wallet_control_proof_predates_revocation'),
  updated_at = pg_catalog.now()
from _wc_holder_revocations hr
where c.claim_type = 'wallet_binding_confirmed'
  and c.status = 'active'
  and (
    c.evidence_reference = 'wb:' || hr.binding_id
    or coalesce(c.claim_value->>'wallet_binding_id', '') = hr.binding_id::text
  )
  and c.issued_at <= hr.holder_revoked_at;

-- Restore fail-closed binding state when zklogin repair reactivated after holder revoke
-- and no qualifying explicit post-revocation claim remains active.
update public.wallet_bindings b
set
  binding_status = 'revoked',
  revoked_at = hr.holder_revoked_at,
  updated_at = pg_catalog.now()
from _wc_holder_revocations hr
where b.id::text = hr.binding_id
  and b.revoked_at is null
  and b.binding_status = 'active'
  and b.binding_method = 'zklogin'
  and b.verified_at > hr.holder_revoked_at
  and not exists (
    select 1
    from public.credential_claims c
    where c.claim_type = 'wallet_binding_confirmed'
      and c.status = 'active'
      and c.evidence_reference = 'wb:' || b.id::text
      and c.issued_at > hr.holder_revoked_at
      and (
        nullif(btrim(c.claim_value->>'challenge_id'), '') is not null
        or nullif(btrim(c.claim_value->>'proof_signature'), '') is not null
        or coalesce(c.claim_value->>'control_method', c.claim_value->>'binding_method', '') in (
          'siwe', 'siwe_evm', 'signed_challenge', 'wallet_standard'
        )
      )
  );

commit;
