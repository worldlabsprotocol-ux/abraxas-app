// FILE: lib/passport/productionHolderReconciliationInventory.ts

import type { PoolClient } from "pg";

export type HolderReconciliationInventory = {
  captured_at: string;
  approved_sui_idv_eligible: number;
  pending_review_idv: number;
  rejected_or_expired_idv: number;
  idv_with_canonical_subject: number;
  verified_wallet_bindings: number | null;
  legacy_links_present: number | null;
  canonical_subjects_present: number | null;
  sui_unlinked_not_approved: number;
  approved_unlinked_needs_reconciliation: number;
  zklogin_continuity_records: number | null;
  ambiguous_mapping_blocked: number;
};

const APPROVED = "('approved','verified','complete')";
const REJECTED = "('rejected','expired','failed','denied')";

async function tableExists(client: PoolClient, name: string): Promise<boolean> {
  const res = await client.query<{ ok: boolean }>(
    `select exists (
       select 1 from information_schema.tables
       where table_schema='public' and table_name = $1
     ) as ok`,
    [name],
  );
  return res.rows[0]?.ok === true;
}

async function scalarCount(client: PoolClient, sql: string, params: unknown[] = []): Promise<number> {
  const res = await client.query<{ c: number }>(sql, params);
  return res.rows[0]?.c ?? 0;
}

export async function queryHolderReconciliationInventory(
  client: PoolClient,
): Promise<HolderReconciliationInventory> {
  const hasWallet = await tableExists(client, "passport_holder_wallet_accounts");
  const hasLinks = await tableExists(client, "passport_holder_legacy_links");
  const hasSubjects = await tableExists(client, "passport_holder_subjects");
  const hasZk = await tableExists(client, "passport_zklogin_holder_bindings");

  const approved_sui_idv_eligible = await scalarCount(
    client,
    `select count(*)::int as c from public.identity_verifications
     where sui_address is not null and trim(sui_address) <> ''
       and coalesce(identity_verification_status, status, '') in ${APPROVED}`,
  );

  const pending_review_idv = await scalarCount(
    client,
    `select count(*)::int as c from public.identity_verifications
     where coalesce(identity_verification_status, status, '') not in ${APPROVED}
       and coalesce(identity_verification_status, status, '') not in ${REJECTED}`,
  );

  const rejected_or_expired_idv = await scalarCount(
    client,
    `select count(*)::int as c from public.identity_verifications
     where coalesce(identity_verification_status, status, '') in ${REJECTED}`,
  );

  const hasHolderSubjectCol = await client.query<{ ok: boolean }>(
    `select exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='identity_verifications' and column_name='holder_subject_id'
     ) as ok`,
  );
  const idv_with_canonical_subject = hasHolderSubjectCol.rows[0]?.ok
    ? await scalarCount(
        client,
        `select count(*)::int as c from public.identity_verifications
         where holder_subject_id is not null and trim(holder_subject_id) <> ''`,
      )
    : 0;

  const sui_unlinked_not_approved = hasLinks
    ? await scalarCount(
        client,
        `select count(*)::int as c from public.identity_verifications iv
         where iv.sui_address is not null
           and coalesce(iv.identity_verification_status, iv.status, '') not in ${APPROVED}
           and not exists (
             select 1 from public.passport_holder_legacy_links l
             where l.legacy_kind = 'sui_address'
               and lower(l.legacy_key) = lower(iv.sui_address)
           )`,
      )
    : approved_sui_idv_eligible;

  const approved_unlinked_needs_reconciliation = hasLinks
    ? await scalarCount(
        client,
        `select count(*)::int as c from public.identity_verifications iv
         where iv.sui_address is not null
           and coalesce(iv.identity_verification_status, iv.status, '') in ${APPROVED}
           and (iv.holder_subject_id is null or trim(iv.holder_subject_id) = '')
           and not exists (
             select 1 from public.passport_holder_legacy_links l
             where l.legacy_kind = 'sui_address'
               and lower(l.legacy_key) = lower(iv.sui_address)
           )`,
      )
    : hasHolderSubjectCol.rows[0]?.ok
      ? await scalarCount(
          client,
          `select count(*)::int as c from public.identity_verifications iv
           where iv.sui_address is not null
             and coalesce(iv.identity_verification_status, iv.status, '') in ${APPROVED}
             and (iv.holder_subject_id is null or trim(iv.holder_subject_id) = '')`,
        )
      : approved_sui_idv_eligible;

  return {
    captured_at: new Date().toISOString(),
    approved_sui_idv_eligible,
    pending_review_idv,
    rejected_or_expired_idv,
    idv_with_canonical_subject,
    verified_wallet_bindings: hasWallet
      ? await scalarCount(client, "select count(*)::int as c from public.passport_holder_wallet_accounts")
      : null,
    legacy_links_present: hasLinks
      ? await scalarCount(client, "select count(*)::int as c from public.passport_holder_legacy_links")
      : null,
    canonical_subjects_present: hasSubjects
      ? await scalarCount(client, "select count(*)::int as c from public.passport_holder_subjects")
      : null,
    sui_unlinked_not_approved,
    approved_unlinked_needs_reconciliation,
    zklogin_continuity_records: hasZk
      ? await scalarCount(client, "select count(*)::int as c from public.passport_zklogin_holder_bindings")
      : null,
    ambiguous_mapping_blocked: 0,
  };
}
