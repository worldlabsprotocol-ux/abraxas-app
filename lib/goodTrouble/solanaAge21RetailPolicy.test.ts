// FILE: lib/goodTrouble/solanaAge21RetailPolicy.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID } from "@/lib/goodTrouble/goodTroubleSolanaPolicyIds";

const getPolicy = vi.fn();

vi.mock("@/lib/verification/requestsService", () => ({
  getPolicy: (...args: unknown[]) => getPolicy(...args),
}));

describe("evaluateGoodTroubleSolanaAge21", () => {
  beforeEach(() => {
    getPolicy.mockReset();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
  });

  it("denies when qualified identity evidence is missing", async () => {
    getPolicy.mockResolvedValue({
      version: 1,
      rules_json: {
        required_claims: [{ claim_type: "identity_verified", min_assurance: "L2" }],
      },
    });

    const createClient = vi.fn(() => ({
      from: (table: string) => {
        if (table === "holder_accounts") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: "sub_ind_test" } }),
              }),
            }),
          };
        }
        if (table === "identity_verifications") {
          return {
            select: () => ({
              or: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
            }),
          };
        }
        throw new Error(table);
      },
    }));

    vi.doMock("@supabase/supabase-js", () => ({ createClient }));

    const { evaluateGoodTroubleSolanaAge21 } = await import("@/lib/goodTrouble/solanaAge21RetailPolicy");
    const result = await evaluateGoodTroubleSolanaAge21({
      claimsSubjectKey: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      holderAccountId: "sub_ind_test",
    });

    expect(result.policy_id).toBe(GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID);
    expect(result.decision).toBe("denied");
    expect(result.reason_codes).toContain("qualified_identity_evidence_missing");
  });
});
