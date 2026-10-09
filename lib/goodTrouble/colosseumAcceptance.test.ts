import { describe, expect, it } from "vitest";
import {
  expectedSandboxReceiptTrust,
  receiptTrustMatchesColosseumSandbox,
  verifyLiveReceiptWithCanonicalSandboxVerifier,
} from "./colosseumAcceptance";
import { CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON } from "@/lib/partner/sandboxReceiptTrustContract";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "./canonicalProductionConfig";

describe("colosseumAcceptance", () => {
  it("expects sandbox-only trust projection for new receipts", () => {
    expect(expectedSandboxReceiptTrust()).toEqual({
      decision_context: "sandbox_only",
      production_usable: false,
      invalidation_reasons: [CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON],
    });
  });

  it("flags production-labeled receipts", () => {
    const errors = receiptTrustMatchesColosseumSandbox({
      receipt_id: "dr_test",
      decision_context: "production",
      production_usable: true,
      currently_valid: true,
      policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    });
    expect(errors.some((e) => e.startsWith("decision_context:"))).toBe(true);
  });

  it("verifier denies production-context public receipt (fixture fetch)", async () => {
    const fetchFn = async (url: string | URL | Request) => {
      if (String(url).includes("/public")) {
        return new Response(JSON.stringify({
          receipt_id: "dr_prod_ctx",
          decision_context: "production",
          production_usable: true,
          currently_valid: true,
          policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
          policy_version: 2,
          partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
          invalidation_reasons: [],
        }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    };
    const result = await verifyLiveReceiptWithCanonicalSandboxVerifier({
      receiptId: "dr_prod_ctx",
      fetchFn: fetchFn as typeof fetch,
    });
    expect(result.action).toBe("deny");
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
