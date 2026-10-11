import { describe, expect, it, vi, beforeEach } from "vitest";

const PRESENT = new Set([
  "wallet_bindings",
  "partner_policies",
  "user_profiles",
  "consent_receipts",
  "decision_receipts",
]);

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: (table: string) => ({
      select: (_cols?: string, opts?: { head?: boolean; count?: string }) => {
        if (opts?.head) {
          return Promise.resolve(
            PRESENT.has(table) ? { error: null } : { error: { message: "missing" } },
          );
        }
        return {
          in: () => Promise.resolve({
            data: table === "partner_policies" ? [{ id: "cielo-verified-guest-v1" }] : [],
          }),
        };
      },
    }),
  })),
}));

describe("probeDemoActivationReadiness", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("flags phantom path blocked when solana tables missing", async () => {
    const { probeDemoActivationReadiness } = await import("./demoActivationReadiness");
    const report = await probeDemoActivationReadiness({
      NEXT_PUBLIC_SUPABASE_URL: "https://ocntwbxarpjeixdnzide.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-key",
      ABRAXAS_SOLANA_NATIVE: "true",
      NEXT_PUBLIC_ABRAXAS_SOLANA_NATIVE: "true",
      ABRAXAS_RUNTIME_ENV: "demo",
    });
    expect(report.phantom_cielo_path_ready).toBe(false);
    expect(report.blocked_reasons).toContain("demo_schema_134_138_incomplete");
    expect(report.legacy_cielo_policy_present).toBe(true);
  });
});
