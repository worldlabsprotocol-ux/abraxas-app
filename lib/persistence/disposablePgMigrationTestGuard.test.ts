// FILE: lib/persistence/disposablePgMigrationTestGuard.test.ts

import { describe, expect, it } from "vitest";
import { SOVEREIGN_DISPOSABLE_REF } from "@/lib/databaseRecovery/manifestGuard";
import {
  DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV,
  DISPOSABLE_PG_TEST_DATABASE_ID_ENV,
  DISPOSABLE_PG_TEST_URL_ENV,
  evaluateDisposablePgMigrationTestGuard,
} from "./disposablePgMigrationTestGuard";

describe("disposable PG migration test guard", () => {
  it("rejects unidentified targets", () => {
    expect(evaluateDisposablePgMigrationTestGuard({}).ok).toBe(false);
    expect(
      evaluateDisposablePgMigrationTestGuard({
        ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
        [DISPOSABLE_PG_TEST_DATABASE_ID_ENV]: SOVEREIGN_DISPOSABLE_REF,
        [DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV]: "true",
        ABRAXAS_DATABASE_URL: "postgresql://localhost/test",
      }).ok,
    ).toBe(false);
  });

  it("accepts fully authorized disposable configuration", () => {
    const result = evaluateDisposablePgMigrationTestGuard({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      [DISPOSABLE_PG_TEST_DATABASE_ID_ENV]: SOVEREIGN_DISPOSABLE_REF,
      [DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV]: "true",
      [DISPOSABLE_PG_TEST_URL_ENV]: "postgresql://postgres:pw@127.0.0.1:5432/abraxas_sovereign_disposable",
    });
    expect(result.ok).toBe(true);
  });
});
