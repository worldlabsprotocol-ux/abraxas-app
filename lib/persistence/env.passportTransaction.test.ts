// FILE: lib/persistence/env.passportTransaction.test.ts

import { afterEach, describe, expect, it } from "vitest";
import {
  isPassportDirectPostgresEnabled,
  passportTransactionPgExplicitlyEnabled,
  persistenceUsesDirectPostgres,
  resolvePassportDirectPostgresUrl,
} from "./env";
import { resetAbraxasPgPoolForTests } from "./pgPool";

describe("Passport hybrid transaction PostgreSQL", () => {
  const base = process.env;

  afterEach(() => {
    process.env = { ...base };
    resetAbraxasPgPoolForTests();
  });

  it("keeps default transport on supabase_postgrest without passport flag", () => {
    expect(persistenceUsesDirectPostgres({})).toBe(false);
    expect(isPassportDirectPostgresEnabled({})).toBe(false);
  });

  it("enables passport pg pool without global backend switch when refs align", () => {
    const env = {
      ABRAXAS_PERSISTENCE_BACKEND: "supabase_postgrest",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      ABRAXAS_PASSPORT_TRANSACTION_PG: "1",
      ABRAXAS_PASSPORT_DATABASE_URL: "postgresql://user:pass@db.example.supabase.co:5432/postgres",
    };
    expect(persistenceUsesDirectPostgres(env)).toBe(false);
    expect(passportTransactionPgExplicitlyEnabled(env)).toBe(true);
    expect(isPassportDirectPostgresEnabled(env)).toBe(true);
    expect(resolvePassportDirectPostgresUrl(env)).toContain("supabase.co");
  });

  it("does not infer hybrid database url from generic DATABASE_URL", () => {
    const env = {
      ABRAXAS_PASSPORT_TRANSACTION_PG: "1",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      DATABASE_URL: "postgresql://user:pass@db.example.supabase.co:5432/postgres",
    };
    expect(resolvePassportDirectPostgresUrl(env)).toBeNull();
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
