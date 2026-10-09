// FILE: lib/goodTrouble/sandboxPartnerVerification.test.ts

import { describe, expect, it, vi } from "vitest";
import {
  CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON,
} from "@abraxas/partner-kit/trust";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import {
  createGoodTroubleProtectedActionStore,
  createGoodTroubleSandboxRequestStore,
  parseGoodTroublePartnerCallback,
  verifyGoodTroubleSandboxAccess,
} from "@/lib/goodTrouble/sandboxPartnerVerification";
import { generatePartnerRequestId } from "@/lib/partner/integrationKit";

function validSandboxReceipt(overrides: Record<string, unknown> = {}) {
  return {
    receipt_id: "dr_gt_sandbox_verify",
    schema_version: "1.0.0",
    artifact_type: "eligibility_decision_receipt",
    partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    policy_version: 2,
    decision_result: "approved",
    signature_valid: true,
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    production_usable: false,
    decision_context: "sandbox_only",
    currently_valid: true,
    invalidation_reasons: [CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON],
    lifecycle_status: "active",
    ...overrides,
  };
}

function mockFetch(receipt: Record<string, unknown> | null, status = 200) {
  return vi.fn(async (url: string | URL | Request) => {
    if (String(url).includes("/public")) {
      if (!receipt || status !== 200) {
        return new Response("{}", { status: status === 200 ? 404 : status });
      }
      return new Response(JSON.stringify(receipt), { status: 200 });
    }
    return new Response("{}", { status: 404 });
  }) as unknown as typeof fetch;
}

describe("Good Trouble sandbox partner verification", () => {
  it("parses callback with partner-local gtv without treating it as authorization", () => {
    const parsed = parseGoodTroublePartnerCallback(new URLSearchParams({
      gtv: "gtf_" + "a".repeat(64),
      receipt_id: "dr_gt_sandbox_verify",
      status: "approved",
    }));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.receipt_id).toBe("dr_gt_sandbox_verify");
  });

  it("permits valid signed sandbox receipt after verifyForAction", async () => {
    const result = await verifyGoodTroubleSandboxAccess({
      search: new URLSearchParams({ receipt_id: "dr_gt_sandbox_verify" }),
      fetchFn: mockFetch(validSandboxReceipt()),
    });
    expect(result.action).toBe("permit");
    expect(result.grant).toBe(true);
    expect(result.outcome).toBe("permitted");
    expect(result.callback_trusted).toBe(false);
  });

  it("denies missing receipt", async () => {
    const result = await verifyGoodTroubleSandboxAccess({
      search: new URLSearchParams({ receipt_id: "dr_missing" }),
      fetchFn: mockFetch(null),
    });
    expect(result.action).toBe("deny");
    expect(result.grant).toBe(false);
    expect(result.errors).toContain("receipt_missing");
  });

  it("denies expired receipt", async () => {
    const result = await verifyGoodTroubleSandboxAccess({
      search: new URLSearchParams({ receipt_id: "dr_gt_sandbox_verify" }),
      fetchFn: mockFetch(validSandboxReceipt({
        expires_at: "2020-01-01T00:00:00.000Z",
        status: "expired",
        currently_valid: false,
        lifecycle_status: "expired",
      })),
    });
    expect(result.grant).toBe(false);
    expect(result.outcome).toBe("expired");
  });

  it("denies revoked receipt", async () => {
    const result = await verifyGoodTroubleSandboxAccess({
      search: new URLSearchParams({ receipt_id: "dr_gt_sandbox_verify" }),
      fetchFn: mockFetch(validSandboxReceipt({
        status: "revoked",
        currently_valid: false,
        lifecycle_status: "revoked",
        partner_safe_reason: "receipt_revoked",
      })),
    });
    expect(result.grant).toBe(false);
    expect(result.outcome).toBe("revoked");
  });

  it("denies superseded receipt", async () => {
    const result = await verifyGoodTroubleSandboxAccess({
      search: new URLSearchParams({ receipt_id: "dr_gt_sandbox_verify" }),
      fetchFn: mockFetch(validSandboxReceipt({
        lifecycle_status: "superseded",
        currently_valid: false,
        partner_safe_reason: "receipt_superseded",
      })),
    });
    expect(result.grant).toBe(false);
    expect(result.outcome).toBe("superseded");
  });

  it("denies wrong partner", async () => {
    const result = await verifyGoodTroubleSandboxAccess({
      search: new URLSearchParams({ receipt_id: "dr_gt_sandbox_verify" }),
      fetchFn: mockFetch(validSandboxReceipt({ partner_id: "other-partner" })),
    });
    expect(result.grant).toBe(false);
    expect(result.outcome).toBe("wrong_partner");
  });

  it("denies wrong policy", async () => {
    const result = await verifyGoodTroubleSandboxAccess({
      search: new URLSearchParams({ receipt_id: "dr_gt_sandbox_verify" }),
      fetchFn: mockFetch(validSandboxReceipt({ policy_id: "good-trouble-browse-v1" })),
    });
    expect(result.grant).toBe(false);
    expect(result.outcome).toBe("wrong_policy");
  });

  it("denies wrong policy version", async () => {
    const result = await verifyGoodTroubleSandboxAccess({
      search: new URLSearchParams({ receipt_id: "dr_gt_sandbox_verify" }),
      fetchFn: mockFetch(validSandboxReceipt({ policy_version: 1 })),
    });
    expect(result.grant).toBe(false);
    expect(result.outcome).toBe("wrong_policy_version");
  });

  it("denies request correlation mismatch", async () => {
    const result = await verifyGoodTroubleSandboxAccess({
      search: new URLSearchParams({
        receipt_id: "dr_gt_sandbox_verify",
        request_id: "req_callback",
      }),
      expectedRequestId: "req_expected",
      fetchFn: mockFetch(validSandboxReceipt()),
    });
    expect(result.grant).toBe(false);
    expect(result.outcome).toBe("wrong_request_correlation");
  });

  it("denies invalid callback without receipt_id", async () => {
    const result = await verifyGoodTroubleSandboxAccess({
      search: new URLSearchParams({ gtv: "gtf_test" }),
      fetchFn: mockFetch(validSandboxReceipt()),
    });
    expect(result.grant).toBe(false);
    expect(result.errors).toContain("receipt_id_missing");
  });

  it("denies invalid signature", async () => {
    const result = await verifyGoodTroubleSandboxAccess({
      search: new URLSearchParams({ receipt_id: "dr_gt_sandbox_verify" }),
      fetchFn: mockFetch(validSandboxReceipt({ signature_valid: false })),
    });
    expect(result.grant).toBe(false);
    expect(result.outcome).toBe("invalid_signature");
  });

  it("denies replayed protected action after successful verification", async () => {
    const store = createGoodTroubleProtectedActionStore();
    const fetchFn = mockFetch(validSandboxReceipt());
    const search = new URLSearchParams({ receipt_id: "dr_gt_sandbox_verify" });
    const first = await verifyGoodTroubleSandboxAccess({
      search,
      fetchFn,
      protectedActionKey: "checkout:session-1",
      protectedActionStore: store,
    });
    expect(first.grant).toBe(true);
    const second = await verifyGoodTroubleSandboxAccess({
      search,
      fetchFn,
      protectedActionKey: "checkout:session-1",
      protectedActionStore: store,
    });
    expect(second.grant).toBe(false);
    expect(second.protected_action_replayed).toBe(true);
    expect(second.outcome).toBe("permitted");
  });

  it("accepts durable req_* correlation via request state store", async () => {
    const requestStore = createGoodTroubleSandboxRequestStore();
    const requestId = generatePartnerRequestId();
    requestStore.put({
      requestId,
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      environment: "sandbox",
      returnUrl: "https://www.goodtroublecanna.com/age-verification-result",
      purpose: "purchase",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
    const result = await verifyGoodTroubleSandboxAccess({
      search: new URLSearchParams({ receipt_id: "dr_gt_sandbox_verify", request_id: requestId }),
      expectedRequestId: requestId,
      requestStateStore: requestStore,
      fetchFn: mockFetch(validSandboxReceipt()),
    });
    expect(result.grant).toBe(true);
  });

  it("denies req_* correlation when purpose mismatches purchase", async () => {
    const requestStore = createGoodTroubleSandboxRequestStore();
    const requestId = generatePartnerRequestId();
    requestStore.put({
      requestId,
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      environment: "sandbox",
      returnUrl: "https://www.goodtroublecanna.com/age-verification-result",
      purpose: "browse",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
    const result = await verifyGoodTroubleSandboxAccess({
      search: new URLSearchParams({ receipt_id: "dr_gt_sandbox_verify", request_id: requestId }),
      expectedRequestId: requestId,
      requestStateStore: requestStore,
      fetchFn: mockFetch(validSandboxReceipt()),
    });
    expect(result.grant).toBe(false);
    expect(result.errors.some((e) => e.includes("purpose"))).toBe(true);
  });
});
