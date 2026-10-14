// FILE: lib/sovereignRuntime/sovereignOperationalReadiness.ts
// Observed readiness (not env-only) for portable sovereign runtime — no secret emission.

import { createHash } from "node:crypto";
import { accessSync, constants, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRecoveryPgClient } from "@/lib/databaseRecovery/pgClient";
import {
  loadReceiptSigningKey,
  loadReceiptVerificationKey,
} from "@/lib/decisionReceipts/signing";
import {
  parseSovereignEnvClass,
  validateEd25519PrivateJwk,
  validateSovereignDatabaseIdentity,
} from "./sovereignActivationPolicy";
import { resolveIndependentPostgresUrl } from "@/lib/persistence/env";

export type SovereignOperationalReadiness = {
  build: 561;
  postgres_ready: boolean;
  evidence_read_write: boolean;
  backup_dir_writable: boolean;
  signing_configured: boolean;
  signing_key_id: string | null;
  signing_public_fingerprint_sha256: string | null;
  issuer_database_identity: string | null;
  sovereign_env_class: string | null;
  database_identity_valid: boolean;
  operational: boolean;
  detail: {
    postgres_error?: string;
    evidence_root?: "ok" | "missing" | "unreadable";
    backup_root?: "ok" | "missing" | "unreadable";
  };
};

function dirReadWriteOk(root: string | undefined): "ok" | "missing" | "unreadable" {
  if (!root?.trim()) return "missing";
  try {
    accessSync(root.trim(), constants.R_OK | constants.W_OK);
    return "ok";
  } catch {
    return "unreadable";
  }
}

function probeEvidenceReadWrite(root: string): boolean {
  try {
    mkdirSync(root, { recursive: true, mode: 0o700 });
    const probe = join(root, `.sovereign_rw_probe_${process.pid}`);
    writeFileSync(probe, "ok", { mode: 0o600 });
    rmSync(probe, { force: true });
    return true;
  } catch {
    return false;
  }
}

export function signingPublicFingerprintSha256(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const pub = loadReceiptVerificationKey();
  if (!pub?.x || typeof pub.x !== "string") return null;
  return createHash("sha256").update(pub.x, "utf8").digest("hex");
}

/** Live probes — PostgreSQL, filesystem R/W, signing material shape (no secret values). */
export async function observeSovereignOperationalReadiness(
  env: Record<string, string | undefined> = process.env,
): Promise<SovereignOperationalReadiness> {
  const detail: SovereignOperationalReadiness["detail"] = {};
  const databaseUrl = resolveIndependentPostgresUrl(env);
  const evidenceRoot = env.ABRAXAS_EVIDENCE_STORAGE_ROOT?.trim();
  const backupRoot = env.ABRAXAS_BACKUP_OUTPUT_DIR?.trim();
  const identityErr = validateSovereignDatabaseIdentity(env);
  const signingConfigured = validateEd25519PrivateJwk(env.ABRAXAS_SIGNING_KEY);

  let postgres_ready = false;
  if (databaseUrl) {
    try {
      const client = await createRecoveryPgClient({ databaseUrl, env });
      try {
        await client.query("select 1 as ok");
        postgres_ready = true;
      } finally {
        await client.end();
      }
    } catch (error) {
      detail.postgres_error = error instanceof Error ? error.message : String(error);
    }
  }

  const evidenceStatus = dirReadWriteOk(evidenceRoot);
  detail.evidence_root = evidenceStatus;
  const evidence_read_write =
    evidenceStatus === "ok" && evidenceRoot ? probeEvidenceReadWrite(evidenceRoot) : false;

  const backupStatus = dirReadWriteOk(backupRoot);
  detail.backup_root = backupStatus;
  const backup_dir_writable =
    backupStatus === "ok" && backupRoot ? probeEvidenceReadWrite(backupRoot) : false;

  const signingPair = signingConfigured ? loadReceiptSigningKey() : null;

  const operational =
    postgres_ready
    && evidence_read_write
    && signingConfigured
    && !identityErr
    && env.ABRAXAS_PERSISTENCE_BACKEND?.trim().toLowerCase() === "postgres_direct";

  return {
    build: 561,
    postgres_ready,
    evidence_read_write,
    backup_dir_writable,
    signing_configured: signingConfigured,
    signing_key_id: signingPair?.signingKeyId ?? null,
    signing_public_fingerprint_sha256: signingPublicFingerprintSha256(env),
    issuer_database_identity: env.ABRAXAS_SOVEREIGN_DATABASE_ID?.trim() ?? null,
    sovereign_env_class: parseSovereignEnvClass(env),
    database_identity_valid: !identityErr,
    operational,
    detail,
  };
}
