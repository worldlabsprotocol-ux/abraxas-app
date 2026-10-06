/**
 * External consumer boundary — imports only @abraxas/partner-kit, never @/lib.
 */
import { describe, expect, it, vi } from "vitest";
import {
  AbraxasPartnerKit,
  MemoryPartnerRequestStateStore,
  permitProtocolAction,
  parsePartnerCallbackParams,
} from "@abraxas/partner-kit";

describe("external consumer (@abraxas/partner-kit only)", () => {
  it("runs verifyForAction permit/deny flow with mocked public receipt fetch", async () => {
    const store = new MemoryPartnerRequestStateStore();
    const kit = new AbraxasPartnerKit({
      partnerId: "partner-ext",
      policyId: "partner-ext-age_21_retail-v1",
      policyVersion: 1,
      environment: "sandbox",
      requestStateStore: store,
      fetchFn: vi.fn(async (url: string | URL | Request) => {
        if (String(url).includes("/public")) {
          return new Response(JSON.stringify({
            receipt_id: "dr_ext",
            schema_version: "1.0.0",
            partner_id: "partner-ext",
            policy_id: "partner-ext-age_21_retail-v1",
            policy_version: 1,
            decision_result: "approved",
            signature_valid: true,
            expires_at: "2099-01-01T00:00:00.000Z",
            status: "active",
            production_usable: false,
            decision_context: "sandbox_only",
            currently_valid: true,
            invalidation_reasons: ["sandbox_only_not_production_usable"],
            artifact_type: "eligibility_decision_receipt",
          }), { status: 200 });
        }
        if (String(url).includes("/narrow-result")) {
          return new Response(JSON.stringify({
            schema_version: "1.0.0",
            receipt_id: "dr_ext",
            partner_id: "partner-ext",
            policy_id: "partner-ext-age_21_retail-v1",
            decision: "approved",
            result_family: "age_eligible_21",
            currently_valid: true,
            production_usable: false,
            trust_environment: "sandbox",
            invalidation_reasons: [],
          }), { status: 200 });
        }
        return new Response("{}", { status: 404 });
      }) as typeof fetch,
    });

    const requestId = "req_external_test";
    store.put({
      requestId,
      partnerId: "partner-ext",
      policyId: "partner-ext-age_21_retail-v1",
      environment: "sandbox",
      returnUrl: "https://partner.example/callback",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });

    const request = await kit.createVerificationRequest({
      returnUrl: "https://partner.example/callback",
      mode: "redirect",
      requestId,
    });
    expect(request.ok).toBe(true);

    const callback = new URLSearchParams({
      receipt_id: "dr_ext",
      request_id: requestId,
    });
    const parsed = parsePartnerCallbackParams(callback);
    expect(parsed.ok).toBe(true);

    const verified = await kit.verifyCallbackWithNarrowResult({
      search: callback,
      expectedRequestId: request.ok ? request.request_id : undefined,
    });
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(permitProtocolAction(verified.verification)).toBe(true);
      expect(verified.narrow.decision).toBe("approved");
    }

    const stale = await kit.verifyForAction({
      receiptId: "dr_ext",
      expectedEnvironment: "production",
    });
    expect(permitProtocolAction(stale)).toBe(false);
  });
});
