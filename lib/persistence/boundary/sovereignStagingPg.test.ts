import { describe, expect, it } from "vitest";
import {
  buildSovereignStagingPoolConfig,
  explainSovereignStagingPoolRefusal,
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
      ABRAXAS_SOVEREIGN_DATABASE_ID: "abraxas_sandbox_trust",
      ABRAXAS_DATABASE_URL: "postgresql://127.0.0.1:5432/abraxas_one",
    });
    const second = getSovereignStagingPgPool({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional",
      ABRAXAS_SOVEREIGN_DATABASE_ID: "abraxas_sandbox_trust",
      ABRAXAS_DATABASE_URL: "postgresql://127.0.0.1:5432/abraxas_two",
    });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
    resetSovereignStagingPgPoolForTests();
  });

  it("refuses an institutional pool without identity or verified TLS", () => {
    const remote = "postgresql://abraxas@db.example:5432/abraxas_sandbox_trust";
    expect(explainSovereignStagingPoolRefusal(remote, {
      ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional",
      ABRAXAS_DATABASE_URL: remote,
    })?.code).toBe("missing_database_identity");
    expect(explainSovereignStagingPoolRefusal(remote, {
      ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional",
      ABRAXAS_SOVEREIGN_DATABASE_ID: "abraxas_sandbox_trust",
      ABRAXAS_DATABASE_URL: remote,
    })?.code).toBe("tls_required");
    expect(explainSovereignStagingPoolRefusal(remote, {
      ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional",
      ABRAXAS_SOVEREIGN_DATABASE_ID: "abraxas_sandbox_trust",
      ABRAXAS_DATABASE_URL: remote,
      ABRAXAS_PG_SSL: "require",
      ABRAXAS_PG_SSL_REJECT_UNAUTHORIZED: "0",
    })?.code).toBe("tls_verify_disabled");
    expect(getSovereignStagingPgPool({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional",
      ABRAXAS_SOVEREIGN_DATABASE_ID: "abraxas_sovereign_disposable",
      ABRAXAS_DATABASE_URL: remote,
      ABRAXAS_PG_SSL: "require",
    })).toBeNull();
    resetSovereignStagingPgPoolForTests();
  });

  it("verifies TLS for a non-local institutional connection and rejects known Supabase projects", () => {
    const remote = "postgresql://abraxas@db.example:5432/abraxas_sandbox_trust";
    const config = buildSovereignStagingPoolConfig(remote, { ABRAXAS_PG_SSL: "require" });
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
    expect(explainSovereignStagingPoolRefusal(
      "postgresql://abraxas@db.ocntwbxarpjeixdnzide.supabase.co:5432/postgres",
      {
        ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional",
        ABRAXAS_SOVEREIGN_DATABASE_ID: "abraxas_sandbox_trust",
        ABRAXAS_DATABASE_URL: "postgresql://abraxas@db.ocntwbxarpjeixdnzide.supabase.co:5432/postgres",
        ABRAXAS_PG_SSL: "require",
      },
    )?.code).toBe("shared_demo_database_denied");
    expect(explainSovereignStagingPoolRefusal(
      "postgresql://abraxas@db.bztwutzprwsdrtqdpymf.supabase.co:5432/postgres",
      {
        ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional",
        ABRAXAS_SOVEREIGN_DATABASE_ID: "abraxas_sandbox_trust",
        ABRAXAS_DATABASE_URL: "postgresql://abraxas@db.bztwutzprwsdrtqdpymf.supabase.co:5432/postgres",
        ABRAXAS_PG_SSL: "require",
      },
    )?.code).toBe("production_supabase_ref_forbidden");
  });
});
