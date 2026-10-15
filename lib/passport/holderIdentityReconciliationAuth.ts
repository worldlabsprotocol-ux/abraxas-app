// FILE: lib/passport/holderIdentityReconciliationAuth.ts
// Build #580: reconciliation batch digest and execution authorization (no caller-only booleans).

import { createHash } from "crypto";
import {
  LEGACY_KIND_SUI_ADDRESS,
  type ReconciliationPlanRow,
} from "./holderIdentityReconciliation";
import { PRODUCTION_SUPABASE_PROJECT_REF } from "./productionMigrationRelease";

export const RECONCILIATION_EXECUTE_ENABLED_ENV = "ABRAXAS_RECONCILIATION_EXECUTION_ENABLED";
export const OPERATOR_RECONCILIATION_AUTH_ID_ENV = "ABRAXAS_OPERATOR_RECONCILIATION_AUTH_ID";
export const RECONCILIATION_BATCH_DIGEST_ENV = "ABRAXAS_RECONCILIATION_BATCH_DIGEST";
export const VERIFIED_DATABASE_PROJECT_REF_ENV = "ABRAXAS_VERIFIED_SUPABASE_PROJECT_REF";

export type ReconciliationExecutionCredentials = {
  batchDigest: string;
  operatorAuthorizationId: string;
  expiresAtMs: number;
  /** Optional single-use nonce matching env at execution time. */
  executionNonce?: string;
};

export type ReconciliationAuthorizationResult =
  | { ok: true; mode: "dry_run" | "execute"; boundDatabaseProjectRef: string }
  | { ok: false; code: string; detail: string };

function normalizeLegacyKey(kind: string, key: string): string {
  return kind === LEGACY_KIND_SUI_ADDRESS ? key.trim().toLowerCase() : key.trim();
}

/** Immutable digest of operator-reviewed plan rows (anchors + actions + targets). */
export function computeReconciliationBatchDigest(rows: ReconciliationPlanRow[]): string {
  const payload = rows
    .map((row) => ({
      kind: row.anchor.kind,
      key: normalizeLegacyKey(row.anchor.kind, row.anchor.key),
      action: row.action,
      target: row.targetSubjectId?.trim() ?? "",
      evidence: row.anchor.evidence.trim(),
    }))
    .sort((a, b) => `${a.kind}:${a.key}`.localeCompare(`${b.kind}:${b.key}`));
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function isAuthoritativeReconciliationEvidence(evidence: string): boolean {
  const e = evidence.trim();
  if (e === "identity_verifications.sui_address") return true;
  if (e.startsWith("passport_holder_wallet_accounts:")) return true;
  if (e.startsWith("identity_verifications.wallet_address")) return true;
  return false;
}

export function filterRowsWithAuthoritativeEvidence(rows: ReconciliationPlanRow[]): ReconciliationPlanRow[] {
  return rows.filter((row) => isAuthoritativeReconciliationEvidence(row.anchor.evidence));
}

export function verifyReconciliationExecutionAuthorization(input: {
  mode: "dry_run" | "execute";
  rows: ReconciliationPlanRow[];
  credentials?: ReconciliationExecutionCredentials;
  env?: Record<string, string | undefined>;
  /** Established by runtime database binding probe — never supplied by unprivileged callers alone. */
  boundDatabaseProjectRef: string | null;
}): ReconciliationAuthorizationResult {
  const env = input.env ?? process.env;
  const verifiedRef =
    env[VERIFIED_DATABASE_PROJECT_REF_ENV]?.trim()
    || input.boundDatabaseProjectRef?.trim()
    || null;

  if (!verifiedRef) {
    return { ok: false, code: "database_binding_unverified", detail: "Database project ref was not independently verified." };
  }

  const authoritativeRows = filterRowsWithAuthoritativeEvidence(input.rows);
  if (authoritativeRows.length === 0) {
    return { ok: false, code: "no_authoritative_anchors", detail: "Batch contains no store-backed identity anchors." };
  }

  if (input.mode === "dry_run") {
    return { ok: true, mode: "dry_run", boundDatabaseProjectRef: verifiedRef };
  }

  if (env[RECONCILIATION_EXECUTE_ENABLED_ENV]?.trim().toLowerCase() !== "true") {
    return { ok: false, code: "execution_disabled", detail: "Reconciliation execute capability is not enabled." };
  }

  const creds = input.credentials;
  if (!creds) {
    return { ok: false, code: "missing_execution_credentials", detail: "Execute requires operator credentials and batch digest." };
  }

  if (creds.expiresAtMs <= Date.now()) {
    return { ok: false, code: "authorization_expired", detail: "Operator authorization expired." };
  }

  const expectedDigest = computeReconciliationBatchDigest(authoritativeRows);
  if (creds.batchDigest !== expectedDigest) {
    return { ok: false, code: "batch_digest_mismatch", detail: "Submitted rows do not match the reviewed batch digest." };
  }

  const envDigest = env[RECONCILIATION_BATCH_DIGEST_ENV]?.trim();
  if (!envDigest || envDigest !== expectedDigest) {
    return { ok: false, code: "batch_digest_not_registered", detail: "Reviewed batch digest is not registered for execution." };
  }

  const operatorId = env[OPERATOR_RECONCILIATION_AUTH_ID_ENV]?.trim();
  if (!operatorId || operatorId !== creds.operatorAuthorizationId) {
    return { ok: false, code: "operator_authorization_invalid", detail: "Operator authorization id does not match registered value." };
  }

  if (verifiedRef === PRODUCTION_SUPABASE_PROJECT_REF) {
    const founder =
      env.ABRAXAS_FOUNDER_PRODUCTION_MIGRATION_AUTHORIZED?.trim().toLowerCase() === "true";
    const ack = env.ABRAXAS_FOUNDER_PRODUCTION_MIGRATION_ACK_ID?.trim() ?? "";
    const token = env.ABRAXAS_PRODUCTION_MIGRATION_RELEASE_TOKEN?.trim() ?? "";
    if (!founder || ack.length < 8 || token !== "build580-passport-136-143") {
      return {
        ok: false,
        code: "founder_production_execution_not_authorized",
        detail: "Production reconciliation requires founder migration authorization.",
      };
    }
  }

  const nonceEnv = env.ABRAXAS_RECONCILIATION_EXECUTION_NONCE?.trim();
  if (nonceEnv) {
    if (!creds.executionNonce || creds.executionNonce !== nonceEnv) {
      return { ok: false, code: "execution_nonce_mismatch", detail: "Single-use execution nonce mismatch." };
    }
  }

  return { ok: true, mode: "execute", boundDatabaseProjectRef: verifiedRef };
}
