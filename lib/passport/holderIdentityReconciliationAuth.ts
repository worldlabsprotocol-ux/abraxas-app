// FILE: lib/passport/holderIdentityReconciliationAuth.ts

import { createHash } from "crypto";
import {
  LEGACY_KIND_SUI_ADDRESS,
  type ReconciliationPlanAction,
  type ReconciliationPlanRow,
} from "./holderIdentityReconciliation";
import { PRODUCTION_SUPABASE_PROJECT_REF } from "./productionMigrationRelease";
import type { ReconciliationDatabaseBinding } from "./reconciliationDatabaseBinding";

export const RECONCILIATION_EXECUTE_ENABLED_ENV = "ABRAXAS_RECONCILIATION_EXECUTION_ENABLED";
export const OPERATOR_RECONCILIATION_AUTH_ID_ENV = "ABRAXAS_OPERATOR_RECONCILIATION_AUTH_ID";
export const RECONCILIATION_BATCH_DIGEST_ENV = "ABRAXAS_RECONCILIATION_BATCH_DIGEST";
export const VERIFIED_DATABASE_PROJECT_REF_ENV = "ABRAXAS_VERIFIED_SUPABASE_PROJECT_REF";

const EXECUTABLE_ACTIONS = new Set<ReconciliationPlanAction>([
  "skip_already_linked",
  "link_existing_canonical_subject",
  "create_canonical_subject_and_link",
]);

export type ReconciliationExecutionCredentials = {
  batchDigest: string;
  operatorAuthorizationId: string;
  expiresAtMs: number;
  executionNonce?: string;
};

export type ReconciliationAuthorizationResult =
  | { ok: true; mode: "dry_run" | "execute"; boundDatabaseProjectRef: string }
  | { ok: false; code: string; detail: string };

function normalizeLegacyKey(kind: string, key: string): string {
  return kind === LEGACY_KIND_SUI_ADDRESS ? key.trim().toLowerCase() : key.trim();
}

/** Digest of the full submitted batch (no silent row dropping). */
export function computeReconciliationBatchDigest(rows: ReconciliationPlanRow[]): string {
  const payload = rows
    .map((row) => ({
      kind: row.anchor.kind,
      key: normalizeLegacyKey(row.anchor.kind, row.anchor.key),
      action: row.action,
      target: row.targetSubjectId?.trim() ?? "",
    }))
    .sort((a, b) => `${a.kind}:${a.key}`.localeCompare(`${b.kind}:${b.key}`));
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function validateReconciliationExecutionBatch(rows: ReconciliationPlanRow[]):
  | { ok: true }
  | { ok: false; code: "empty_batch" | "unsupported_batch_row"; detail: string; rowIndex: number } {
  if (rows.length === 0) {
    return { ok: false, code: "empty_batch", detail: "Batch is empty.", rowIndex: -1 };
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    if (!EXECUTABLE_ACTIONS.has(row.action)) {
      return {
        ok: false,
        code: "unsupported_batch_row",
        detail: `Row action ${row.action} is not executable.`,
        rowIndex: i,
      };
    }
  }
  return { ok: true };
}

export function verifyReconciliationExecutionAuthorization(input: {
  mode: "dry_run" | "execute";
  rows: ReconciliationPlanRow[];
  credentials?: ReconciliationExecutionCredentials;
  env?: Record<string, string | undefined>;
  databaseBinding: ReconciliationDatabaseBinding;
}): ReconciliationAuthorizationResult {
  const env = input.env ?? process.env;

  const batchIntegrity = validateReconciliationExecutionBatch(input.rows);
  if (!batchIntegrity.ok) {
    return { ok: false, code: batchIntegrity.code, detail: batchIntegrity.detail };
  }

  if (!input.databaseBinding.ok) {
    return { ok: false, code: input.databaseBinding.code, detail: input.databaseBinding.detail };
  }

  const derivedRef = input.databaseBinding.derivedProjectRef;

  if (input.mode === "dry_run") {
    return { ok: true, mode: "dry_run", boundDatabaseProjectRef: derivedRef };
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

  const expectedDigest = computeReconciliationBatchDigest(input.rows);
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

  if (derivedRef === PRODUCTION_SUPABASE_PROJECT_REF) {
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

  return { ok: true, mode: "execute", boundDatabaseProjectRef: derivedRef };
}
