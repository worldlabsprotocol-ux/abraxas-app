-- 134_wallet_control_claim_provenance_backfill.sql
-- Backfill evidence_reference for legacy wallet_binding_confirmed claims when lineage is unambiguous.
-- Idempotent: only updates rows with null evidence_reference and a single co-issued binding match.

begin;

update public.credential_claims c
set
  evidence_reference = 'wb:' || b.id::text,
  updated_at = pg_catalog.now()
from public.wallet_bindings b
where c.claim_type = 'wallet_binding_confirmed'
  and c.evidence_reference is null
  and c.subject_id = b.subject_id
  and abs(extract(epoch from (c.issued_at - b.verified_at))) < 2
  and (
    c.claim_value->>'binding_method' is null
    or c.claim_value->>'binding_method' = b.binding_method
  )
  and not exists (
    select 1
    from public.wallet_bindings b2
    where b2.subject_id = c.subject_id
      and b2.id <> b.id
      and abs(extract(epoch from (c.issued_at - b2.verified_at))) < 2
      and (
        c.claim_value->>'binding_method' is null
        or c.claim_value->>'binding_method' = b2.binding_method
      )
  );

commit;
