import { describe, expect, it } from "vitest";
import {
  getSovereignStagingPgPool,
  resetSovereignStagingPgPoolForTests,
  resolveSovereignStagingDatabaseUrl,
} from "./sovereignStagingPg";

describe("sovereign trust execution PostgreSQL binding", () => {
  it("accepts an explicit institutional binding", () => {
    expect(resolveSovereignStagingDatabaseUrl({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional",
      ABRAXAS_DATABASE_URL: "postgresql://abraxas:secret@postgres.internal:5432/abraxas",
    })).toContain("postgres.internal");
  });

  it("fails closed without an approved environment class or binding", () => {
    expect(resolveSovereignStagingDatabaseUrl({ NODE_ENV: "production", ABRAXAS_DATABASE_URL: "postgresql://ignored" })).toBeNull();
    expect(resolveSovereignStagingDatabaseUrl({ ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional" })).toBeNull();
  });

  it("never treats staging or disposable bindings as institutional authority", () => {
    expect(resolveSovereignStagingDatabaseUrl({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional",
      ABRAXAS_SOVEREIGN_STAGING_PG_URL: "postgresql://staging-only",
      ABRAXAS_SOVEREIGN_PG_URL: "postgresql://sovereign-test-only",
      ABRAXAS_DISPOSABLE_PG_TEST_URL: "postgresql://disposable-only",
    })).toBeNull();
  });

  it("keeps disposable execution on its explicit test-only binding", () => {
    expect(resolveSovereignStagingDatabaseUrl({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      ABRAXAS_DATABASE_URL: "postgresql://must-not-be-selected",
      ABRAXAS_DISPOSABLE_PG_TEST_URL: "postgresql://disposable-only",
    })).toBe("postgresql://disposable-only");
  });

  it("does not reuse a pool after the approved binding changes", () => {
    const first = getSovereignStagingPgPool({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional",
      ABRAXAS_DATABASE_URL: "postgresql://127.0.0.1:5432/abraxas_one",
    });
    const second = getSovereignStagingPgPool({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional",
      ABRAXAS_DATABASE_URL: "postgresql://127.0.0.1:5432/abraxas_two",
    });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
    resetSovereignStagingPgPoolForTests();
  });
});
