import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { SOVEREIGN_DISPOSABLE_REF } from "@/lib/databaseRecovery/manifestGuard";
import { SOVEREIGN_STAGING_DATABASE_ID } from "./sovereignStagingConstants";
import {
  assertSovereignMigrationAuthorized,
  validateDisposableCertificationEnv,
  validateEd25519PrivateJwk,
  validateInstitutionalReadinessEnv,
  validateStagingPersistentEnv,
  validateSovereignComposeHardening,
  validateSovereignDatabaseIdentity,
} from "./sovereignActivationPolicy";

const KEY_32 = Buffer.alloc(32, 3).toString("base64");
const VALID_JWK = JSON.stringify(generateTestSigningKeyPair().privateKeyJwk);

function disposableBase(): Record<string, string> {
  return {
    ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
    ABRAXAS_DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/sovereign_cert",
    ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
    ABRAXAS_SOVEREIGN_DATABASE_ID: SOVEREIGN_DISPOSABLE_REF,
    ABRAXAS_SOVEREIGN_MIGRATION_AUTHORIZED: "true",
  };
}

function stagingBase(): Record<string, string> {
  return {
    ...institutionalBase(),
    ABRAXAS_SOVEREIGN_ENV_CLASS: "staging",
    ABRAXAS_SOVEREIGN_DATABASE_ID: SOVEREIGN_STAGING_DATABASE_ID,
    ABRAXAS_DATABASE_URL: "postgresql://abraxas:secret@127.0.0.1:5432/abraxas_sovereign_staging",
    ABRAXAS_SOVEREIGN_RESTORE_PG_URL: "postgresql://abraxas:secret@127.0.0.1:5433/abraxas_sovereign_staging_restore",
  };
}

function institutionalBase(): Record<string, string> {
  return {
    ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
    ABRAXAS_DATABASE_URL: "postgresql://app:secret@db.example.com:5432/abraxas_prod",
    ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional",
    ABRAXAS_SOVEREIGN_DATABASE_ID: "abraxas_sovereign_institutional_prod",
    ABRAXAS_EVIDENCE_STORAGE_ROOT: "/var/abraxas/evidence",
    ABRAXAS_EVIDENCE_ENCRYPTION_KEY: KEY_32,
    ABRAXAS_BACKUP_ENCRYPTION_KEY: KEY_32,
    ABRAXAS_SIGNING_KEY: VALID_JWK,
    ABRAXAS_SOVEREIGN_RESTORE_PG_URL: "postgresql://restore.example/abraxas",
    ABRAXAS_BACKUP_SCOPE: "sovereign",
    ABRAXAS_BACKUP_OUTPUT_DIR: "/var/abraxas/backups",
    ABRAXAS_PG_SSL: "require",
    ABRAXAS_PG_SSL_REJECT_UNAUTHORIZED: "1",
    ABRAXAS_SOVEREIGN_OPERATOR_AUTHORIZATION: "operator-ack-test",
    ABRAXAS_SOVEREIGN_OPERATOR_AUTHORIZATION_EXPECTED: "operator-ack-test",
  };
}

describe("sovereign activation hardening", () => {
  it("rejects invalid Ed25519 JWK (kty-only stub)", () => {
    expect(validateEd25519PrivateJwk(JSON.stringify({ kty: "OKP" }))).toBe(false);
    expect(validateEd25519PrivateJwk(VALID_JWK)).toBe(true);
  });

  it("refuses migration without operator authorization gates", () => {
    expect(assertSovereignMigrationAuthorized({})).not.toHaveLength(0);
    expect(
      assertSovereignMigrationAuthorized({
        ...disposableBase(),
        ABRAXAS_SOVEREIGN_MIGRATION_AUTHORIZED: "false",
      }).some((e) => e.code === "migration_not_authorized"),
    ).toBe(true);
  });

  it("blocks wrong database target (shared demo ref in URL)", () => {
    const err = validateSovereignDatabaseIdentity({
      ...disposableBase(),
      ABRAXAS_DATABASE_URL: "postgresql://u:p@db.ocntwbxarpjeixdnzide.supabase.co/postgres",
    });
    expect(err?.code).toBe("shared_demo_database_denied");
  });

  it("allows valid disposable certification env", () => {
    const report = validateDisposableCertificationEnv(disposableBase());
    expect(report.ok).toBe(true);
    expect(report.tier).toBe("DISPOSABLE_CERTIFIED");
  });

  it("blocks institutional activation when backup or TLS controls missing", () => {
    const missingBackup = validateInstitutionalReadinessEnv({
      ...institutionalBase(),
      ABRAXAS_BACKUP_ENCRYPTION_KEY: "",
    });
    expect(missingBackup.ok).toBe(false);
    expect(missingBackup.tier).toBe("BLOCKED");

    const tlsOff = validateInstitutionalReadinessEnv({
      ...institutionalBase(),
      ABRAXAS_PG_SSL_REJECT_UNAUTHORIZED: "0",
    });
    expect(tlsOff.errors.some((e) => e.code === "tls_verify_disabled")).toBe(true);
  });

  it("passes institutional env when all critical controls present", () => {
    const report = validateInstitutionalReadinessEnv(institutionalBase());
    expect(report.ok).toBe(true);
    expect(report.tier).toBe("INSTITUTIONAL_READY");
  });

  it("requires founder authorization for staging schema migrations", () => {
    const errs = assertSovereignMigrationAuthorized({
      ...stagingBase(),
      ABRAXAS_SOVEREIGN_MIGRATION_AUTHORIZED: "true",
      ABRAXAS_SOVEREIGN_STAGING_SCHEMA_CHANGE_AUTHORIZED: "false",
    });
    expect(errs.some((e) => e.code === "staging_schema_change_not_authorized")).toBe(true);
  });

  it("passes persistent staging env when restore target differs from primary", () => {
    const report = validateStagingPersistentEnv(stagingBase());
    expect(report.ok).toBe(true);
    expect(report.tier).toBe("STAGING_PERSISTENT_READY");
  });

  it("blocks staging when restore URL equals primary database URL", () => {
    const report = validateStagingPersistentEnv({
      ...stagingBase(),
      ABRAXAS_SOVEREIGN_RESTORE_PG_URL: stagingBase().ABRAXAS_DATABASE_URL!,
    });
    expect(report.errors.some((e) => e.code === "restore_target_must_differ")).toBe(true);
  });

  it("blocks staging when restore URL is a host alias of the primary endpoint", () => {
    const report = validateStagingPersistentEnv({
      ...stagingBase(),
      ABRAXAS_SOVEREIGN_RESTORE_PG_URL:
        "postgresql://other:pass@localhost:5432/abraxas_sovereign_staging",
    });
    expect(report.errors.some((e) => e.code === "restore_target_must_differ")).toBe(true);
  });

  it("docker compose binds loopback and requires explicit postgres password", () => {
    const compose = readFileSync(resolve(process.cwd(), "docker-compose.sovereign.yml"), "utf8");
    const issues = validateSovereignComposeHardening(compose);
    expect(issues).toHaveLength(0);
    expect(compose).toContain("127.0.0.1:");
    expect(compose).toContain("SOVEREIGN_POSTGRES_PASSWORD:?");
  });

  it("staging compose binds loopback and requires explicit postgres passwords", () => {
    const compose = readFileSync(
      resolve(process.cwd(), "docker-compose.sovereign.staging.yml"),
      "utf8",
    );
    const issues = validateSovereignComposeHardening(compose);
    expect(issues).toHaveLength(0);
    expect(compose).toContain("127.0.0.1:");
    expect(compose).toContain("SOVEREIGN_STAGING_POSTGRES_PASSWORD:?");
  });
});
