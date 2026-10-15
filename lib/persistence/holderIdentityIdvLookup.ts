// FILE: lib/persistence/holderIdentityIdvLookup.ts
// Build #579: schema-aware identity_verifications row counts (legacy sui_address vs migrated holder_subject_id).

import "server-only";

import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import { normalizeHolderSubjectKey } from "@/lib/idv/holderIdentityRef";
import { queryAbraxasPg } from "./pgPool";

export type IdentityIdvLookupResult =
  | { ok: true; count: number; holderSubjectIdColumnPresent: boolean }
  | { ok: false; code: "identity_lookup_unavailable"; detail: string };

/** Pure SQL builder — never references holder_subject_id when the column is absent. */
export function buildIdentityVerificationCountSql(includeHolderSubjectIdColumn: boolean): string {
  const walletMatch = "lower(wallet_address) = lower($1)";
  const suiMatch = "lower(sui_address) = lower($1)";
  if (includeHolderSubjectIdColumn) {
    return `select count(*)::int as c from public.identity_verifications
       where ${walletMatch} or ${suiMatch} or holder_subject_id = $1`;
  }
  return `select count(*)::int as c from public.identity_verifications
     where ${walletMatch} or ${suiMatch}`;
}

export async function identityVerificationsHolderSubjectIdColumnPresent(): Promise<boolean> {
  const { rows } = await queryAbraxasPg<{ exists: boolean }>(
    `select exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'identity_verifications'
         and column_name = 'holder_subject_id'
     ) as exists`,
  );
  return Boolean(rows[0]?.exists);
}

function resolveLookupKey(sessionSubjectId: string, suiAddress: string | null | undefined): string {
  if (isChainNeutralHolderSubjectId(sessionSubjectId)) {
    return sessionSubjectId;
  }
  const raw = suiAddress?.trim() || sessionSubjectId;
  return normalizeHolderSubjectKey(raw);
}

export async function countIdentityVerificationsForSessionKeys(input: {
  sessionSubjectId: string;
  suiAddress?: string | null;
  holderSubjectIdColumnPresent?: boolean;
}): Promise<IdentityIdvLookupResult> {
  let holderColumn = input.holderSubjectIdColumnPresent;
  try {
    if (holderColumn === undefined) {
      holderColumn = await identityVerificationsHolderSubjectIdColumnPresent();
    }
  } catch (error) {
    return {
      ok: false,
      code: "identity_lookup_unavailable",
      detail: error instanceof Error ? error.message : "schema_probe_failed",
    };
  }

  const lookupKey = resolveLookupKey(input.sessionSubjectId, input.suiAddress);
  const sql = buildIdentityVerificationCountSql(holderColumn);

  try {
    const { rows } = await queryAbraxasPg<{ c: number }>(sql, [lookupKey]);
    const count = rows[0]?.c ?? 0;
    if (isChainNeutralHolderSubjectId(lookupKey) && !holderColumn && count === 0 && input.suiAddress) {
      const legacyKey = normalizeHolderSubjectKey(input.suiAddress);
      if (legacyKey !== lookupKey) {
        const legacyRes = await queryAbraxasPg<{ c: number }>(sql, [legacyKey]);
        return {
          ok: true,
          count: legacyRes.rows[0]?.c ?? 0,
          holderSubjectIdColumnPresent: holderColumn,
        };
      }
    }
    return { ok: true, count, holderSubjectIdColumnPresent: holderColumn };
  } catch (error) {
    return {
      ok: false,
      code: "identity_lookup_unavailable",
      detail: error instanceof Error ? error.message : "identity_verifications_query_failed",
    };
  }
}
