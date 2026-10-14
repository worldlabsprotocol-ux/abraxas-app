// FILE: lib/databaseRecovery/fingerprints.ts
// Canonical inventory fingerprints for backup verification (no row content in manifest).

import { createHash } from "node:crypto";

export const RECOVERY_INVENTORY_SQL = `
select label, n::text from (
  select 'identity_verifications' as label, count(*)::bigint as n from public.identity_verifications
  union all select 'identity_verification_events', count(*) from public.identity_verification_events
  union all select 'abraxas_credentials', count(*) from public.abraxas_credentials
  union all select 'credential_claims', count(*) from public.credential_claims
  union all select 'passport_holder_subjects', count(*) from public.passport_holder_subjects
  union all select 'passport_holder_wallet_accounts', count(*) from public.passport_holder_wallet_accounts
  union all select 'passport_holder_legacy_links', count(*) from public.passport_holder_legacy_links
  union all select 'sui_zklogin_identities', count(*) from public.sui_zklogin_identities
  union all select 'decision_receipts', count(*) from public.decision_receipts
  union all select 'audit_events', count(*) from public.audit_events
) t order by label;
`;

export const RECOVERY_INTEGRITY_SQL = `
select md5(coalesce(max(wallet_address),'') || coalesce(max(sui_address),'') || coalesce(max(holder_subject_id),'') || coalesce(max(identity_verification_status),'') || coalesce(max(credential_jti),'')) as idv_aggregate
from public.identity_verifications;
select md5(string_agg(subject_id || coalesce(status,''), ',' order by subject_id)) as subjects_aggregate
from public.passport_holder_subjects;
select md5(string_agg(caip10 || auth_method || subject_id, ',' order by caip10)) as wallets_aggregate
from public.passport_holder_wallet_accounts;
`;

export type RecoveryInventoryRow = { label: string; n: string };

export type RecoveryIntegrityFingerprints = {
  idv_aggregate: string;
  subjects_aggregate: string;
  wallets_aggregate: string;
};

export function hashInventory(rows: RecoveryInventoryRow[]): string {
  const canonical = rows
    .map((r) => `${r.label}=${r.n}`)
    .sort()
    .join("|");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function hashIntegrity(fp: RecoveryIntegrityFingerprints): string {
  const canonical = `${fp.idv_aggregate}|${fp.subjects_aggregate}|${fp.wallets_aggregate}`;
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
