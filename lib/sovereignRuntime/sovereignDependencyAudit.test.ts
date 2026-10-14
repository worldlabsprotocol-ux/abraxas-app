import { describe, expect, it } from "vitest";
import { SOVEREIGN_DISPOSABLE_REF } from "@/lib/databaseRecovery/manifestGuard";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import {
  assertSovereignCoreProviderFree,
  buildSovereignDependencyAudit,
} from "./sovereignDependencyAudit";

describe("Build #561 sovereign dependency audit", () => {
  const signing = JSON.stringify(generateTestSigningKeyPair().privateKeyJwk);
  const key32 = Buffer.alloc(32, 7).toString("base64");

  it("marks provider-independent core when postgres_direct and no category D in core", () => {
    const audit = buildSovereignDependencyAudit({
      ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      ABRAXAS_SOVEREIGN_DATABASE_ID: SOVEREIGN_DISPOSABLE_REF,
      ABRAXAS_DATABASE_URL: "postgresql://127.0.0.1:5432/sovereign_cert",
      ABRAXAS_EVIDENCE_STORAGE_ROOT: "/tmp/evidence",
      ABRAXAS_EVIDENCE_ENCRYPTION_KEY: key32,
      ABRAXAS_SIGNING_KEY: signing,
      IDV_PROVIDER: "manual",
    });
    expect(audit.provider_independent_core).toBe(true);
    expect(audit.category_d_in_core).toEqual([]);
  });

  it("flags Supabase env on postgres_direct as category D in core", () => {
    const audit = buildSovereignDependencyAudit({
      ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      ABRAXAS_SOVEREIGN_DATABASE_ID: SOVEREIGN_DISPOSABLE_REF,
      ABRAXAS_DATABASE_URL: "postgresql://127.0.0.1:5432/sovereign_cert",
      ABRAXAS_EVIDENCE_STORAGE_ROOT: "/tmp/evidence",
      ABRAXAS_EVIDENCE_ENCRYPTION_KEY: key32,
      ABRAXAS_SIGNING_KEY: signing,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "role",
    });
    expect(audit.provider_independent_core).toBe(false);
    expect(audit.category_d_in_core).toContain("supabase_env_on_direct_backend");
  });

  it("flags Veriff on sovereign core path", () => {
    const audit = buildSovereignDependencyAudit({
      ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      ABRAXAS_SOVEREIGN_DATABASE_ID: SOVEREIGN_DISPOSABLE_REF,
      ABRAXAS_DATABASE_URL: "postgresql://127.0.0.1:5432/sovereign_cert",
      ABRAXAS_EVIDENCE_STORAGE_ROOT: "/tmp/evidence",
      ABRAXAS_EVIDENCE_ENCRYPTION_KEY: key32,
      ABRAXAS_SIGNING_KEY: signing,
      IDV_PROVIDER: "veriff",
    });
    expect(audit.category_d_in_core).toContain("veriff_on_sovereign_core");
  });

  it("assertSovereignCoreProviderFree fails closed on postgrest default", () => {
    const gate = assertSovereignCoreProviderFree({});
    expect(gate.ok).toBe(false);
    expect(gate.blockers).toContain("postgres_direct_required");
  });
});
