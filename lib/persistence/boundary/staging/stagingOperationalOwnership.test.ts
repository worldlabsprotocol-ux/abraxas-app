import { describe, expect, it } from "vitest";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import {
  buildStagingOperationalOwnershipChecklist,
  evaluateExternalStagingDeployment,
  stagingOwnershipReadyForOperationalProof,
} from "./stagingOperationalOwnership";
import { SOVEREIGN_STAGING_DATABASE_ID } from "@/lib/sovereignRuntime/sovereignStagingConstants";

const KEY_32 = Buffer.alloc(32, 9).toString("base64");
const JWK = JSON.stringify(generateTestSigningKeyPair().privateKeyJwk);

function stagingEnv(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    ABRAXAS_SOVEREIGN_ENV_CLASS: "staging",
    ABRAXAS_SOVEREIGN_DATABASE_ID: SOVEREIGN_STAGING_DATABASE_ID,
    ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
    ABRAXAS_DATABASE_URL: "postgresql://abraxas:secret@127.0.0.1:5432/abraxas_sovereign_staging",
    ABRAXAS_SOVEREIGN_RESTORE_PG_URL:
      "postgresql://abraxas:secret@127.0.0.1:5433/abraxas_sovereign_staging_restore",
    ABRAXAS_EVIDENCE_STORAGE_ROOT: "/var/abraxas/evidence",
    ABRAXAS_EVIDENCE_ENCRYPTION_KEY: KEY_32,
    ABRAXAS_BACKUP_ENCRYPTION_KEY: KEY_32,
    ABRAXAS_SIGNING_KEY: JWK,
    ABRAXAS_BACKUP_SCOPE: "sovereign",
    ABRAXAS_BACKUP_OUTPUT_DIR: "/var/abraxas/backups",
    ABRAXAS_SOVEREIGN_STAGING_RESTORE_DRILL_AUTHORIZED: "true",
    ABRAXAS_SOVEREIGN_STAGING_RESTORE_OPERATOR_AUTHORIZATION: "test-op",
    ABRAXAS_SOVEREIGN_STAGING_RESTORE_OPERATOR_AUTHORIZATION_EXPECTED: "test-op",
    ...overrides,
  };
}

describe("stagingOperationalOwnership", () => {
  it("reports external staging as pending without attestation", () => {
    expect(evaluateExternalStagingDeployment({}).state).toBe("pending");
  });

  it("passes ownership checklist for valid staging contract env", () => {
    const ready = stagingOwnershipReadyForOperationalProof(stagingEnv());
    expect(ready.ok).toBe(true);
  });

  it("fails when Supabase credentials present on sovereign path", () => {
    const checks = buildStagingOperationalOwnershipChecklist(
      stagingEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" }),
    );
    const supabase = checks.find((c) => c.id === "no_supabase_on_sovereign_path");
    expect(supabase?.satisfied).toBe(false);
  });
});
