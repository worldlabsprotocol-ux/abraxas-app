// FILE: lib/passport/holderIdentityReconciliationEvidence.ts
// Structured legacy anchor evidence resolved from authoritative stores (not caller strings).

import type { PoolClient } from "pg";
import {
  LEGACY_KIND_SUI_ADDRESS,
  LEGACY_KIND_VERIFIED_WALLET_CAIP10,
  type LegacyIdentityAnchor,
} from "./holderIdentityReconciliation";

const APPROVED_STATUSES = "('approved','verified','complete')";

export type ResolvedSuiAddressEvidence = {
  source: "identity_verifications.sui_address";
  suiAddress: string;
  approvedRowCount: number;
  pendingRowCount: number;
  authorizationState: "approved" | "pending" | "absent";
};

export type ResolvedVerifiedWalletEvidence = {
  source: "passport_holder_wallet_accounts.caip10";
  caip10: string;
  subjectId: string;
  verifiedAt: string;
};

export type ResolvedLegacyAnchorEvidence =
  | { ok: true; kind: typeof LEGACY_KIND_SUI_ADDRESS; sui: ResolvedSuiAddressEvidence }
  | { ok: true; kind: typeof LEGACY_KIND_VERIFIED_WALLET_CAIP10; wallet: ResolvedVerifiedWalletEvidence }
  | { ok: false; code: "unsupported_anchor_kind" | "anchor_not_found" | "wallet_not_verified" };

function normalizedSui(key: string): string {
  return key.trim().toLowerCase();
}

export async function resolveLegacyAnchorEvidenceFromStores(
  client: PoolClient,
  anchor: LegacyIdentityAnchor,
): Promise<ResolvedLegacyAnchorEvidence> {
  if (anchor.kind === LEGACY_KIND_SUI_ADDRESS) {
    const sui = normalizedSui(anchor.key);
    const res = await client.query<{ approved_c: number; pending_c: number }>(
      `select
         count(*) filter (
           where coalesce(identity_verification_status, status, '') in ${APPROVED_STATUSES}
         )::int as approved_c,
         count(*) filter (
           where coalesce(identity_verification_status, status, '') not in ${APPROVED_STATUSES}
         )::int as pending_c
       from public.identity_verifications
       where lower(sui_address) = lower($1)`,
      [sui],
    );
    const approvedRowCount = res.rows[0]?.approved_c ?? 0;
    const pendingRowCount = res.rows[0]?.pending_c ?? 0;
    if (approvedRowCount + pendingRowCount === 0) {
      return { ok: false, code: "anchor_not_found" };
    }
    const authorizationState =
      approvedRowCount > 0 ? "approved" : pendingRowCount > 0 ? "pending" : "absent";
    return {
      ok: true,
      kind: LEGACY_KIND_SUI_ADDRESS,
      sui: {
        source: "identity_verifications.sui_address",
        suiAddress: sui,
        approvedRowCount,
        pendingRowCount,
        authorizationState,
      },
    };
  }

  if (anchor.kind === LEGACY_KIND_VERIFIED_WALLET_CAIP10) {
    const caip10 = anchor.key.trim();
    const res = await client.query<{ subject_id: string; verified_at: string }>(
      `select subject_id, verified_at::text as verified_at
       from public.passport_holder_wallet_accounts
       where caip10 = $1
       limit 1`,
      [caip10],
    );
    const row = res.rows[0];
    if (!row?.subject_id) {
      return { ok: false, code: "anchor_not_found" };
    }
    return {
      ok: true,
      kind: LEGACY_KIND_VERIFIED_WALLET_CAIP10,
      wallet: {
        source: "passport_holder_wallet_accounts.caip10",
        caip10,
        subjectId: row.subject_id,
        verifiedAt: row.verified_at,
      },
    };
  }

  return { ok: false, code: "unsupported_anchor_kind" };
}
