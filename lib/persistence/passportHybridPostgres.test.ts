// FILE: lib/persistence/passportHybridPostgres.test.ts

import { describe, expect, it } from "vitest";
import { SOVEREIGN_DISPOSABLE_REF } from "@/lib/databaseRecovery/manifestGuard";
import {
  DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV,
  DISPOSABLE_PG_TEST_DATABASE_ID_ENV,
  DISPOSABLE_PG_TEST_URL_ENV,
} from "./disposablePgTestEnv";
import {
  DISPOSABLE_PG_HYBRID_LOCAL_AUTHORIZED_ENV,
  passportHybridOperatorConfirmationSteps,
  resolvedRefRequiresProductionHybridAuthorization,
  validatePassportHybridPostgresBinding,
} from "./passportHybridPostgres";
import { isPassportDirectPostgresEnabled } from "./env";
import { getAbraxasPgPool, resetAbraxasPgPoolForTests } from "./pgPool";
import { KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS } from "@/lib/supabase/projectRefs";

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

  it("rejects unrecognized direct host even when operator attestation matches PostgREST", () => {
    const result = validatePassportHybridPostgresBinding({
      ...alignedEnv,
      ABRAXAS_PASSPORT_DATABASE_URL: "postgresql://postgres:pw@postgres.internal.example:5432/postgres",
      ABRAXAS_PASSPORT_SUPABASE_PROJECT_REF: "example",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("hybrid_direct_project_ref_unresolved");
  });

  it("requires postgrest and direct Supabase project refs to match independently", () => {
    const mismatch = validatePassportHybridPostgresBinding({
      ...alignedEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://other.supabase.co",
    });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) {
      expect(mismatch.code).toBe("hybrid_postgrest_direct_project_ref_mismatch");
    }
    const ok = validatePassportHybridPostgresBinding(alignedEnv);
    expect(ok.ok).toBe(true);
    if (ok.ok && ok.binding_mode === "supabase_dual_identity") {
      expect(ok.postgrest_project_ref).toBe("example");
      expect(ok.direct_project_ref).toBe("example");
    }
  });

  it("accepts session pooler direct URLs when refs align", () => {
    const result = validatePassportHybridPostgresBinding({
      ABRAXAS_PERSISTENCE_BACKEND: "supabase_postgrest",
      NEXT_PUBLIC_SUPABASE_URL: "https://poolref.supabase.co",
      ABRAXAS_PASSPORT_TRANSACTION_PG: "1",
      ABRAXAS_PASSPORT_DATABASE_URL:
        "postgresql://postgres.poolref:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.binding_mode === "supabase_dual_identity") {
      expect(result.direct_project_ref).toBe("poolref");
      expect(result.postgrest_project_ref).toBe("poolref");
    }
  });

  it("rejects operator attestation that does not match resolved direct ref", () => {
    const result = validatePassportHybridPostgresBinding({
      ...alignedEnv,
      ABRAXAS_PASSPORT_SUPABASE_PROJECT_REF: "wrong-ref",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("hybrid_explicit_project_ref_mismatch");
  });

  it("allows disposable local hybrid only with strict guards", () => {
    const localUrl = "postgresql://postgres:pw@127.0.0.1:5432/abraxas_sovereign_disposable";
    const guardedEnv = {
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      ABRAXAS_PASSPORT_TRANSACTION_PG: "1",
      ABRAXAS_PASSPORT_DATABASE_URL: localUrl,
      [DISPOSABLE_PG_TEST_DATABASE_ID_ENV]: SOVEREIGN_DISPOSABLE_REF,
      [DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV]: "true",
      [DISPOSABLE_PG_TEST_URL_ENV]: localUrl,
      [DISPOSABLE_PG_HYBRID_LOCAL_AUTHORIZED_ENV]: "true",
    };
    expect(guardedEnv[DISPOSABLE_PG_TEST_DATABASE_ID_ENV]).toBe(SOVEREIGN_DISPOSABLE_REF);
    const withoutLocalFlag = validatePassportHybridPostgresBinding({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      ABRAXAS_PASSPORT_TRANSACTION_PG: "1",
      ABRAXAS_PASSPORT_DATABASE_URL: localUrl,
      [DISPOSABLE_PG_TEST_DATABASE_ID_ENV]: SOVEREIGN_DISPOSABLE_REF,
      [DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV]: "true",
      [DISPOSABLE_PG_TEST_URL_ENV]: localUrl,
    });
    expect(withoutLocalFlag.ok).toBe(false);

    const ok = validatePassportHybridPostgresBinding(guardedEnv);
    expect(ok.ok, !ok.ok ? ok.code : "").toBe(true);
    expect(ok.binding_mode).toBe("disposable_local_test");
  });

  it("rejects disposable local binding on VERCEL_ENV production even when sovereign class is disposable", () => {
    const localUrl = "postgresql://postgres:pw@127.0.0.1:5432/abraxas_sovereign_disposable";
    const result = validatePassportHybridPostgresBinding({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      VERCEL_ENV: "production",
      ABRAXAS_PASSPORT_TRANSACTION_PG: "1",
      ABRAXAS_PASSPORT_DATABASE_URL: localUrl,
      [DISPOSABLE_PG_TEST_DATABASE_ID_ENV]: SOVEREIGN_DISPOSABLE_REF,
      [DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV]: "true",
      [DISPOSABLE_PG_TEST_URL_ENV]: localUrl,
      [DISPOSABLE_PG_HYBRID_LOCAL_AUTHORIZED_ENV]: "true",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("hybrid_postgrest_project_ref_unresolved");
    }
  });

  it("rejects disposable local binding when ABRAXAS_RUNTIME_ENV is production", () => {
    const localUrl = "postgresql://postgres:pw@127.0.0.1:5432/abraxas_sovereign_disposable";
    const result = validatePassportHybridPostgresBinding({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      ABRAXAS_RUNTIME_ENV: "production",
      ABRAXAS_PASSPORT_DATABASE_URL: localUrl,
      [DISPOSABLE_PG_TEST_DATABASE_ID_ENV]: SOVEREIGN_DISPOSABLE_REF,
      [DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV]: "true",
      [DISPOSABLE_PG_TEST_URL_ENV]: localUrl,
      [DISPOSABLE_PG_HYBRID_LOCAL_AUTHORIZED_ENV]: "true",
    });
    expect(result.ok).toBe(false);
  });

  it("does not allow disposable local exception under production class", () => {
    const localUrl = "postgresql://postgres:pw@127.0.0.1:5432/abraxas_sovereign_disposable";
    const result = validatePassportHybridPostgresBinding({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional",
      VERCEL_ENV: "production",
      ABRAXAS_PASSPORT_TRANSACTION_PG: "1",
      ABRAXAS_PASSPORT_DATABASE_URL: localUrl,
      [DISPOSABLE_PG_TEST_DATABASE_ID_ENV]: SOVEREIGN_DISPOSABLE_REF,
      [DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV]: "true",
      [DISPOSABLE_PG_TEST_URL_ENV]: localUrl,
      [DISPOSABLE_PG_HYBRID_LOCAL_AUTHORIZED_ENV]: "true",
    });
    expect(result.ok).toBe(false);
  });

  it("requires production authorization for configured production ref targets", () => {
    const prodRef = KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS[0];
    const denied = validatePassportHybridPostgresBinding({
      ...alignedEnv,
      NEXT_PUBLIC_SUPABASE_URL: `https://${prodRef}.supabase.co`,
      ABRAXAS_PASSPORT_DATABASE_URL: `postgresql://postgres:pw@db.${prodRef}.supabase.co:5432/postgres`,
      PRODUCTION_SUPABASE_PROJECT_REF: prodRef,
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("hybrid_production_database_denied");

    const allowed = validatePassportHybridPostgresBinding({
      ...alignedEnv,
      NEXT_PUBLIC_SUPABASE_URL: `https://${prodRef}.supabase.co`,
      ABRAXAS_PASSPORT_DATABASE_URL: `postgresql://postgres:pw@db.${prodRef}.supabase.co:5432/postgres`,
      PRODUCTION_SUPABASE_PROJECT_REF: prodRef,
      ABRAXAS_PASSPORT_HYBRID_PRODUCTION_AUTHORIZED: "true",
    });
    expect(allowed.ok).toBe(true);
    expect(resolvedRefRequiresProductionHybridAuthorization(prodRef, {
      PRODUCTION_SUPABASE_PROJECT_REF: prodRef,
    })).toBe(true);
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
