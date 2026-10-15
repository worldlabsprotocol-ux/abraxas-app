// FILE: lib/persistence/passportHybridPostgres.test.ts

import { describe, expect, it } from "vitest";
import {
  passportHybridOperatorConfirmationSteps,
  validatePassportHybridPostgresBinding,
} from "./passportHybridPostgres";
import { isPassportDirectPostgresEnabled } from "./env";
import { getAbraxasPgPool, resetAbraxasPgPoolForTests } from "./pgPool";

describe("Passport hybrid PostgreSQL binding", () => {
  const alignedEnv = {
    ABRAXAS_PERSISTENCE_BACKEND: "supabase_postgrest",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    ABRAXAS_PASSPORT_TRANSACTION_PG: "1",
    ABRAXAS_PASSPORT_DATABASE_URL: "postgresql://postgres:pw@db.example.supabase.co:5432/postgres",
  };

  it("rejects hybrid mode without explicit passport database url", () => {
    const result = validatePassportHybridPostgresBinding({
      ABRAXAS_PASSPORT_TRANSACTION_PG: "1",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      MIGRATION_136_PG_URL: "postgresql://postgres:pw@db.example.supabase.co:5432/postgres",
      DATABASE_URL: "postgresql://postgres:pw@db.example.supabase.co:5432/postgres",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("hybrid_missing_explicit_database_url");
    expect(isPassportDirectPostgresEnabled({
      ABRAXAS_PASSPORT_TRANSACTION_PG: "1",
      MIGRATION_136_PG_URL: "postgresql://x",
    })).toBe(false);
  });

  it("requires postgrest and direct Supabase project refs to match", () => {
    const mismatch = validatePassportHybridPostgresBinding({
      ...alignedEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://other.supabase.co",
    });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) {
      expect(mismatch.code).toBe("hybrid_postgrest_direct_project_ref_mismatch");
    }
    expect(validatePassportHybridPostgresBinding(alignedEnv).ok).toBe(true);
  });

  it("does not open a pool when hybrid mode is disabled", () => {
    resetAbraxasPgPoolForTests();
    const env = {
      ...alignedEnv,
      ABRAXAS_PASSPORT_TRANSACTION_PG: "0",
    };
    expect(getAbraxasPgPool(env)).toBeNull();
  });

  it("documents operator confirmation steps", () => {
    expect(passportHybridOperatorConfirmationSteps().length).toBeGreaterThan(2);
  });
});
