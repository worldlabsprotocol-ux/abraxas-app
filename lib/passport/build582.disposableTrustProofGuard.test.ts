// FILE: lib/passport/build582.disposableTrustProofGuard.test.ts

import { describe, expect, it } from "vitest";
import { SOVEREIGN_DISPOSABLE_REF } from "@/lib/databaseRecovery/manifestGuard";
import {
  DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV,
  DISPOSABLE_PG_TEST_DATABASE_ID_ENV,
  DISPOSABLE_PG_TEST_URL_ENV,
} from "@/lib/persistence/disposablePgMigrationTestGuard";
import { PRODUCTION_SUPABASE_PROJECT_REF } from "@/lib/passport/productionMigrationRelease";
import {
  evaluateBuild582DisposableTrustProofBootstrap,
} from "@/lib/passport/build582/disposableTrustProofDatabase";

describe("Build #582 disposable trust proof guard", () => {
  it("rejects missing guard configuration", () => {
    expect(evaluateBuild582DisposableTrustProofBootstrap({}).ok).toBe(false);
  });

  it("rejects missing explicit migration authorization", () => {
    const result = evaluateBuild582DisposableTrustProofBootstrap({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      [DISPOSABLE_PG_TEST_DATABASE_ID_ENV]: SOVEREIGN_DISPOSABLE_REF,
      [DISPOSABLE_PG_TEST_URL_ENV]: "postgresql://postgres:pw@127.0.0.1:5432/abraxas_sovereign_disposable",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/ABRAXAS_DISPOSABLE_PG_MIGRATION_AUTHORIZED/);
  });

  it("rejects inferred disposable URL from sovereign pg env without explicit test URL", () => {
    const result = evaluateBuild582DisposableTrustProofBootstrap({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      [DISPOSABLE_PG_TEST_DATABASE_ID_ENV]: SOVEREIGN_DISPOSABLE_REF,
      [DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV]: "true",
      ABRAXAS_SOVEREIGN_PG_URL: "postgresql://postgres:pw@127.0.0.1:5432/abraxas_sovereign_disposable",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects accidental ABRAXAS_DATABASE_URL fallback without explicit disposable test URL", () => {
    const result = evaluateBuild582DisposableTrustProofBootstrap({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      [DISPOSABLE_PG_TEST_DATABASE_ID_ENV]: SOVEREIGN_DISPOSABLE_REF,
      [DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV]: "true",
      ABRAXAS_DATABASE_URL: "postgresql://postgres:pw@127.0.0.1:5432/postgres",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/ABRAXAS_DISPOSABLE_PG_TEST_URL/);
  });

  it("rejects Production Supabase project ref in disposable test URL", () => {
    const result = evaluateBuild582DisposableTrustProofBootstrap({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      [DISPOSABLE_PG_TEST_DATABASE_ID_ENV]: SOVEREIGN_DISPOSABLE_REF,
      [DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV]: "true",
      [DISPOSABLE_PG_TEST_URL_ENV]:
        `postgresql://postgres:pw@db.${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects wrong disposable database identity", () => {
    const result = evaluateBuild582DisposableTrustProofBootstrap({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      [DISPOSABLE_PG_TEST_DATABASE_ID_ENV]: "wrong_identity",
      [DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV]: "true",
      [DISPOSABLE_PG_TEST_URL_ENV]: "postgresql://postgres:pw@127.0.0.1:5432/abraxas_sovereign_disposable",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts fully authorized disposable bootstrap URL", () => {
    const result = evaluateBuild582DisposableTrustProofBootstrap({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      [DISPOSABLE_PG_TEST_DATABASE_ID_ENV]: SOVEREIGN_DISPOSABLE_REF,
      [DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV]: "true",
      [DISPOSABLE_PG_TEST_URL_ENV]: "postgresql://postgres:pw@127.0.0.1:5432/abraxas_sovereign_disposable",
    });
    expect(result.ok).toBe(true);
  });
});
