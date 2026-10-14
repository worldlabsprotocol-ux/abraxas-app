import { describe, expect, it } from "vitest";
import { SOVEREIGN_DISPOSABLE_REF } from "@/lib/databaseRecovery/manifestGuard";
import { SOVEREIGN_STAGING_DATABASE_ID } from "./sovereignStagingConstants";
import {
  assertSyntheticCertificationMayRunMutations,
  validateSyntheticCertificationIsolation,
} from "./syntheticCertificationIsolation";

const DISPOSABLE_BASE: Record<string, string> = {
  ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
  ABRAXAS_SOVEREIGN_DATABASE_ID: SOVEREIGN_DISPOSABLE_REF,
  ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
  ABRAXAS_SOVEREIGN_MIGRATION_AUTHORIZED: "true",
  ABRAXAS_DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/sovereign_cert",
};

describe("Synthetic certification isolation — adversarial", () => {
  it("rejects staging env class for DB-mutating certification", () => {
    const report = validateSyntheticCertificationIsolation({
      ...DISPOSABLE_BASE,
      ABRAXAS_SOVEREIGN_ENV_CLASS: "staging",
      ABRAXAS_SOVEREIGN_DATABASE_ID: SOVEREIGN_STAGING_DATABASE_ID,
      ABRAXAS_DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:5432/${SOVEREIGN_STAGING_DATABASE_ID}`,
    });
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.code === "synthetic_requires_disposable_env")).toBe(true);
  });

  it("rejects staging database name on disposable URL", () => {
    const report = validateSyntheticCertificationIsolation({
      ...DISPOSABLE_BASE,
      ABRAXAS_DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:5432/${SOVEREIGN_STAGING_DATABASE_ID}`,
    });
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.code === "synthetic_forbidden_database_name")).toBe(true);
  });

  it("rejects institutional production database identity", () => {
    const report = validateSyntheticCertificationIsolation({
      ...DISPOSABLE_BASE,
      ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional",
      ABRAXAS_SOVEREIGN_DATABASE_ID: "abraxas_sovereign_institutional_prod",
      ABRAXAS_DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/abraxas_sovereign_institutional_prod",
    });
    expect(report.ok).toBe(false);
  });

  it("rejects aliased endpoint equal to staging primary URL", () => {
    const stagingUrl = `postgresql://postgres:postgres@localhost:5432/${SOVEREIGN_STAGING_DATABASE_ID}`;
    const report = validateSyntheticCertificationIsolation({
      ...DISPOSABLE_BASE,
      ABRAXAS_STAGING_PRIMARY_PG_URL: stagingUrl,
      ABRAXAS_SYNTHETIC_CERTIFICATION_PG_URL: "postgresql://postgres:postgres@127.0.0.1:5432/sovereign_cert",
    });
    expect(report.ok).toBe(true);
    const aliasReport = validateSyntheticCertificationIsolation({
      ...DISPOSABLE_BASE,
      ABRAXAS_STAGING_PRIMARY_PG_URL: stagingUrl,
      ABRAXAS_SYNTHETIC_CERTIFICATION_PG_URL: stagingUrl,
    });
    expect(aliasReport.ok).toBe(false);
    expect(aliasReport.errors.some((e) => e.code === "synthetic_aliases_staging_endpoint")).toBe(true);
  });

  it("requires explicit authorization before mutations", () => {
    const isolated = validateSyntheticCertificationIsolation(DISPOSABLE_BASE);
    expect(isolated.ok).toBe(true);
    const blocked = assertSyntheticCertificationMayRunMutations(DISPOSABLE_BASE);
    expect(blocked.ok).toBe(false);
    expect(blocked.errors[0]?.code).toBe("synthetic_certification_not_authorized");
  });

  it("allows isolated disposable when explicitly authorized", () => {
    const ok = assertSyntheticCertificationMayRunMutations({
      ...DISPOSABLE_BASE,
      ABRAXAS_SYNTHETIC_CERTIFICATION_AUTHORIZED: "true",
    });
    expect(ok.ok).toBe(true);
  });
});
