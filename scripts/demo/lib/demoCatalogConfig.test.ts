import { describe, expect, it } from "vitest";
import { validateCatalogDemoConfig } from "./demoCatalogConfig";
import { KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS } from "./knownProductionSupabaseProjectRefs";

const DEMO_REF = "demo-project-ref-abc";
const PRODUCTION_REF = KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS[0];

function baseEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    DEMO_SUPABASE_PROJECT_REF: DEMO_REF,
    PRODUCTION_SUPABASE_PROJECT_REF: PRODUCTION_REF,
    NEXT_PUBLIC_SUPABASE_URL: `https://${DEMO_REF}.supabase.co`,
    DEMO_SUPABASE_DATABASE_URL: `postgresql://postgres:secret@db.${DEMO_REF}.supabase.co:5432/postgres`,
    ...overrides,
  };
}

describe("demoCatalogConfig", () => {
  it("requires exact confirmation matching demo ref", () => {
    expect(() => validateCatalogDemoConfig({
      env: baseEnv(),
      confirmation: "wrong-ref",
    })).toThrow(/confirmation/i);
  });

  it("rejects production database target before client construction", () => {
    expect(() => validateCatalogDemoConfig({
      env: baseEnv({
        DEMO_SUPABASE_DATABASE_URL: `postgresql://postgres:secret@db.${PRODUCTION_REF}.supabase.co:5432/postgres`,
      }),
      confirmation: DEMO_REF,
    })).toThrow(/denied|does not match/i);
  });

  it("rejects NODE_TLS_REJECT_UNAUTHORIZED=0 before client construction", () => {
    const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    try {
      expect(() => validateCatalogDemoConfig({
        env: baseEnv(),
        confirmation: DEMO_REF,
      })).toThrow(/NODE_TLS_REJECT_UNAUTHORIZED/);
    } finally {
      if (previous === undefined) {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      } else {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous;
      }
    }
  });

  it("requires session pooler CA path before client construction", () => {
    expect(() => validateCatalogDemoConfig({
      env: baseEnv({
        DEMO_SUPABASE_DATABASE_URL: `postgresql://postgres.${DEMO_REF}:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
      }),
      confirmation: DEMO_REF,
    })).toThrow(/DEMO_SUPABASE_SSL_ROOT_CERT_PATH/);
  });

  it("accepts valid direct database config with confirmation", () => {
    const config = validateCatalogDemoConfig({
      env: baseEnv(),
      confirmation: DEMO_REF,
    });
    expect(config.demoProjectRef).toBe(DEMO_REF);
    expect(config.databaseTransport).toBe("direct");
    expect(config.maskedDatabaseTarget).toContain("demo");
  });
});
