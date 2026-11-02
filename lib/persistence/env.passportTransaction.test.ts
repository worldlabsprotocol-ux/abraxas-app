// FILE: lib/persistence/env.passportTransaction.test.ts

import { afterEach, describe, expect, it } from "vitest";
import {
  isPassportDirectPostgresEnabled,
  passportTransactionPgExplicitlyEnabled,
  persistenceUsesDirectPostgres,
  resolvePassportDirectPostgresUrl,
  validatePassportSovereignPostgresBinding,
} from "./env";

describe("Passport sovereign PostgreSQL binding", () => {
  const base = process.env;

  afterEach(() => {
    process.env = { ...base };
  });

  it("fails closed when no Passport PostgreSQL connection is configured", () => {
    expect(persistenceUsesDirectPostgres({})).toBe(false);
    expect(isPassportDirectPostgresEnabled({})).toBe(false);
  });

  it("uses the Passport-owned connection independently of the global backend", () => {
    const env = {
      ABRAXAS_PERSISTENCE_BACKEND: "supabase_postgrest",
      ABRAXAS_PASSPORT_DATABASE_URL: "postgresql://passport.internal/abraxas",
    };
    expect(persistenceUsesDirectPostgres(env)).toBe(false);
    expect(passportTransactionPgExplicitlyEnabled(env)).toBe(false);
    expect(isPassportDirectPostgresEnabled(env)).toBe(true);
    expect(resolvePassportDirectPostgresUrl(env)).toBe("postgresql://passport.internal/abraxas");
  });

  it("does not infer the Passport connection from generic DATABASE_URL", () => {
    const env = {
      ABRAXAS_PASSPORT_TRANSACTION_PG: "1",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      DATABASE_URL: "postgresql://user:pass@db.example.supabase.co:5432/postgres",
    };
    expect(resolvePassportDirectPostgresUrl(env)).toBeNull();
    expect(isPassportDirectPostgresEnabled(env)).toBe(false);
  });

  it("rejects Supabase-hosted PostgreSQL for the sovereign Passport path", () => {
    const env = {
      ABRAXAS_PASSPORT_DATABASE_URL: "postgresql://user:pass@db.example.supabase.co:5432/postgres",
    };
    expect(validatePassportSovereignPostgresBinding(env)).toEqual({
      ok: false,
      code: "passport_supabase_host_rejected",
    });
    expect(isPassportDirectPostgresEnabled(env)).toBe(false);
  });

  it("prefers ABRAXAS_PASSPORT_DATABASE_URL over shared database url", () => {
    const env = {
      ABRAXAS_PASSPORT_TRANSACTION_PG: "enabled",
      ABRAXAS_DATABASE_URL: "postgresql://shared/local",
      ABRAXAS_PASSPORT_DATABASE_URL: "postgresql://passport-only/local",
    };
    expect(resolvePassportDirectPostgresUrl(env)).toBe("postgresql://passport-only/local");
  });

  it("global postgres_direct still enables passport pg", () => {
    const env = {
      ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
      ABRAXAS_DATABASE_URL: "postgresql://localhost/abx",
    };
    expect(isPassportDirectPostgresEnabled(env)).toBe(true);
  });
});
