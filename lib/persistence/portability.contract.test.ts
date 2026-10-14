// FILE: lib/persistence/portability.contract.test.ts

import { describe, expect, it } from "vitest";
import { resolveIndependentPostgresUrl, resolvePersistenceConfig } from "./env";
import { requirePersistenceAdmin, resetPersistenceClientForTests } from "./admin";

describe("Abraxas persistence portability contract", () => {
  it("accepts Abraxas-named env aliases without Supabase-branded keys", () => {
    const cfg = resolvePersistenceConfig({
      ABRAXAS_POSTGREST_URL: "https://db.example.com",
      ABRAXAS_DB_SERVICE_ROLE_KEY: "service-role-key",
    });
    expect(cfg.ok).toBe(true);
    if (cfg.ok) {
      expect(cfg.postgrestUrl).toBe("https://db.example.com");
      expect(cfg.backend).toBe("supabase_postgrest");
    }
  });

  it("falls back to legacy Supabase env names for compatibility", () => {
    const cfg = resolvePersistenceConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://legacy.example.com",
      SUPABASE_SERVICE_ROLE_KEY: "legacy-key",
    });
    expect(cfg.ok).toBe(true);
  });

  it("accepts postgres_direct backend with ABRAXAS_DATABASE_URL", () => {
    const cfg = resolvePersistenceConfig({
      ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
      ABRAXAS_DATABASE_URL: "postgresql://localhost:5432/abraxas_test",
    });
    expect(cfg.ok).toBe(true);
    if (cfg.ok) {
      expect(cfg.backend).toBe("postgres_direct");
      expect(cfg.databaseUrl).toContain("postgresql://");
    }
  });

  it("resolves independent Postgres URL for migration parity tests", () => {
    const url = resolveIndependentPostgresUrl({
      ABRAXAS_DATABASE_URL: "postgresql://localhost:5432/abraxas_test",
    });
    expect(url).toContain("postgresql://");
  });

  it("does not require Supabase project ref in config resolution", () => {
    const cfg = resolvePersistenceConfig({
      ABRAXAS_POSTGREST_URL: "https://postgrest.internal",
      ABRAXAS_DB_SERVICE_ROLE_KEY: "x",
    });
    expect(cfg.ok).toBe(true);
    expect(JSON.stringify(cfg)).not.toMatch(/supabase\.co/);
  });

  it("requirePersistenceAdmin throws when unconfigured", () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.ABRAXAS_POSTGREST_URL;
    delete process.env.ABRAXAS_DB_SERVICE_ROLE_KEY;
    resetPersistenceClientForTests();
    expect(() => requirePersistenceAdmin()).toThrow();
    process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey;
    resetPersistenceClientForTests();
  });
});
