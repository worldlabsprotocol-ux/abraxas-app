// FILE: lib/persistence/holderIdentityIdvLookup.ts
// Build #579: fully schema-aware identity_verifications counts (probe columns; SQL uses only what exists).

import "server-only";

import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import { normalizeHolderSubjectKey } from "@/lib/idv/holderIdentityRef";
import { queryAbraxasPg } from "./pgPool";

export type IdentityVerificationsColumnSchema = {
  walletAddress: boolean;
  suiAddress: boolean;
  holderSubjectId: boolean;
};

export type IdentityIdvLookupResult =
  | { ok: true; count: number; schema: IdentityVerificationsColumnSchema }
  | { ok: false; code: "identity_lookup_unavailable"; detail: string };

const IDV_COLUMN_PROBE_SQL = `select column_name from information_schema.columns
 where table_schema = 'public'
   and table_name = 'identity_verifications'
   and column_name in ('wallet_address', 'sui_address', 'holder_subject_id')`;

export function identityVerificationsColumnSchemaFromRows(
  rows: ReadonlyArray<{ column_name: string }>,
): IdentityVerificationsColumnSchema {
  const names = new Set(rows.map((row) => row.column_name));
  return {
    walletAddress: names.has("wallet_address"),
    suiAddress: names.has("sui_address"),
    holderSubjectId: names.has("holder_subject_id"),
  };
}

export async function probeIdentityVerificationsColumnSchema(): Promise<IdentityVerificationsColumnSchema> {
  const { rows } = await queryAbraxasPg<{ column_name: string }>(IDV_COLUMN_PROBE_SQL);
  return identityVerificationsColumnSchemaFromRows(rows);
}

export function hasSupportedIdentityVerificationColumn(schema: IdentityVerificationsColumnSchema): boolean {
  return schema.walletAddress || schema.suiAddress || schema.holderSubjectId;
}

/** Pure planner: parameterized count query bound to authenticated session keys only. */
export function planIdentityVerificationCountQuery(input: {
  schema: IdentityVerificationsColumnSchema;
  sessionSubjectId: string;
  sessionHolderSubjectId?: string | null;
  suiAddress?: string | null;
  legacyLinkSubjectId?: string | null;
}):
  | { ok: true; sql: string; params: string[] }
  | { ok: false; code: "no_identity_columns" | "unsupported_session_binding" } {
  if (!hasSupportedIdentityVerificationColumn(input.schema)) {
    return { ok: false, code: "no_identity_columns" };
  }

  const canonicalFromSession =
    input.sessionHolderSubjectId && isChainNeutralHolderSubjectId(input.sessionHolderSubjectId)
      ? input.sessionHolderSubjectId
      : isChainNeutralHolderSubjectId(input.sessionSubjectId)
        ? input.sessionSubjectId
        : null;

  if (canonicalFromSession) {
    const clauses: string[] = [];
    const params: string[] = [canonicalFromSession];
    let paramIndex = 1;

    if (input.schema.holderSubjectId) {
      clauses.push(`holder_subject_id = $${paramIndex}`);
    }
    if (input.schema.walletAddress) {
      clauses.push(`lower(wallet_address) = lower($${paramIndex})`);
    }
    if (clauses.length === 0) {
      return { ok: false, code: "no_identity_columns" };
    }

    const suiRaw = input.suiAddress?.trim();
    const legacyLink = input.legacyLinkSubjectId?.trim() ?? null;
    const suiLinkedToCanonical =
      Boolean(suiRaw)
      && legacyLink === canonicalFromSession
      && input.schema.suiAddress;

    if (suiLinkedToCanonical && suiRaw) {
      paramIndex += 1;
      const suiKey = normalizeHolderSubjectKey(suiRaw);
      params.push(suiKey);
      clauses.push(`lower(sui_address) = lower($${paramIndex})`);
    }

    const sql = `select count(*)::int as c from public.identity_verifications where ${clauses.join(" or ")}`;
    return { ok: true, sql, params };
  }

  const suiKey = normalizeHolderSubjectKey(input.suiAddress?.trim() || input.sessionSubjectId);
  const legacyClauses: string[] = [];
  const params: string[] = [suiKey];

  if (input.schema.suiAddress) {
    legacyClauses.push("lower(sui_address) = lower($1)");
  }
  if (input.schema.walletAddress) {
    legacyClauses.push("lower(wallet_address) = lower($1)");
  }
  if (legacyClauses.length === 0) {
    return { ok: false, code: "no_identity_columns" };
  }

  const sql = `select count(*)::int as c from public.identity_verifications where ${legacyClauses.join(" or ")}`;
  return { ok: true, sql, params };
}

export async function countIdentityVerificationsForSessionKeys(input: {
  sessionSubjectId: string;
  sessionHolderSubjectId?: string | null;
  suiAddress?: string | null;
  legacyLinkSubjectId?: string | null;
  columnSchema?: IdentityVerificationsColumnSchema;
}): Promise<IdentityIdvLookupResult> {
  let schema = input.columnSchema;
  try {
    if (!schema) {
      schema = await probeIdentityVerificationsColumnSchema();
    }
  } catch (error) {
    return {
      ok: false,
      code: "identity_lookup_unavailable",
      detail: error instanceof Error ? error.message : "schema_probe_failed",
    };
  }

  const plan = planIdentityVerificationCountQuery({
    schema,
    sessionSubjectId: input.sessionSubjectId,
    sessionHolderSubjectId: input.sessionHolderSubjectId,
    suiAddress: input.suiAddress,
    legacyLinkSubjectId: input.legacyLinkSubjectId,
  });

  if (!plan.ok) {
    return {
      ok: false,
      code: "identity_lookup_unavailable",
      detail: plan.code,
    };
  }

  try {
    const { rows } = await queryAbraxasPg<{ c: number }>(plan.sql, plan.params);
    return { ok: true, count: rows[0]?.c ?? 0, schema };
  } catch (error) {
    return {
      ok: false,
      code: "identity_lookup_unavailable",
      detail: error instanceof Error ? error.message : "identity_verifications_query_failed",
    };
  }
}
