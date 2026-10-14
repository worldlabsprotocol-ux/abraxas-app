import { describe, expect, it } from "vitest";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { validateInstitutionalSovereignEnv } from "./institutionalActivationEnv";

const KEY_32 = Buffer.alloc(32, 9).toString("base64");
const SIGNING = JSON.stringify(generateTestSigningKeyPair().privateKeyJwk);

describe("validateInstitutionalSovereignEnv", () => {
  it("passes institutional readiness env", () => {
    const report = validateInstitutionalSovereignEnv({
      ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
      ABRAXAS_DATABASE_URL: "postgresql://app:secret@db.example.com:5432/abraxas",
      ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional",
      ABRAXAS_SOVEREIGN_DATABASE_ID: "abraxas_sovereign_institutional_prod",
      ABRAXAS_EVIDENCE_STORAGE_ROOT: "/var/abraxas/evidence",
      ABRAXAS_EVIDENCE_ENCRYPTION_KEY: KEY_32,
      ABRAXAS_BACKUP_ENCRYPTION_KEY: KEY_32,
      ABRAXAS_SIGNING_KEY: SIGNING,
      ABRAXAS_SOVEREIGN_RESTORE_PG_URL: "postgresql://restore/abraxas",
      ABRAXAS_BACKUP_SCOPE: "sovereign",
      ABRAXAS_BACKUP_OUTPUT_DIR: "/var/abraxas/backups",
      ABRAXAS_PG_SSL: "require",
      ABRAXAS_PG_SSL_REJECT_UNAUTHORIZED: "1",
    });
    expect(report.ok).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it("fails when postgres_direct keys are missing", () => {
    const report = validateInstitutionalSovereignEnv({});
    expect(report.ok).toBe(false);
    expect(report.errors.length).toBeGreaterThan(0);
  });
});
