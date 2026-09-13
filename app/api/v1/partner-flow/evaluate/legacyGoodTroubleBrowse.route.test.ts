// FILE: app/api/v1/partner-flow/evaluate/legacyGoodTroubleBrowse.route.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";

const mockEvaluatePartnerFlow = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: vi.fn(async () => ({
    ok: true,
    session: { suiAddress: "0xabc" },
  })),
}));

vi.mock("@/lib/partner/returnUrlAllowlist", () => ({
  isAllowedPartnerReturnUrl: vi.fn(async () => true),
}));

vi.mock("@/lib/partner/partnerFlowRouteGuard", () => ({
  enforcePartnerFlowRateLimit: vi.fn(async () => null),
  recordPartnerFlowRequestOutcome: vi.fn(),
}));

vi.mock("@/lib/partner/logPartnerUsage", () => ({ logPartnerUsage: vi.fn() }));
vi.mock("@/lib/partner/partnerMeteringHooks", () => ({ maybeRecordPartnerFlowReceiptMetering: vi.fn() }));
vi.mock("@/lib/partner/webhooks/webhookHooks", () => ({ maybeEnqueuePartnerReceiptIssued: vi.fn() }));
vi.mock("@/lib/partner/partnerFlowAudit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/partnerFlowAudit")>();
  return {
    ...actual,
    auditPartnerFlowStepRequired: vi.fn(),
    auditPartnerFlowReceiptOutcome: vi.fn(),
    auditPartnerFlowStepBestEffort: vi.fn(),
    resolvePartnerFlowTraceId: vi.fn(() => "trace-legacy-route"),
  };
});
vi.mock("@/lib/partner/enrichPartnerFlowResponse", () => ({
  enrichPartnerFlowResponse: (result: unknown) => result,
}));
vi.mock("@/lib/partner/relyingPartyFlow", () => ({
  evaluatePartnerFlow: (...args: unknown[]) => mockEvaluatePartnerFlow(...args),
  PartnerFlowIdempotencyConflictError: class extends Error {
    readonly code = "conflict";
  },
}));

import { POST } from "./route";

const GTB_FLOW_ID = `gtb_${"a".repeat(64)}`;
const LEGACY_BROWSE_RETURN_URL =
  `https://www.goodtroublecanna.com/browse-verification-result?gtb=${GTB_FLOW_ID}`;

describe("POST /api/v1/partner-flow/evaluate legacy Good Trouble browse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEvaluatePartnerFlow.mockResolvedValue({
      next: "passport",
      passport_url: "https://abraxas.test/partner/continue?verify_request=vr-legacy",
      verification_request_id: "vr-legacy",
    });
  });

  it("normalizes missing policy_id and purpose before evaluatePartnerFlow", async () => {
    const res = await POST(new NextRequest("http://localhost/api/v1/partner-flow/evaluate", {
      method: "POST",
      body: JSON.stringify({
        partner_id: GOOD_TROUBLE_PARTNER_ID,
        return_url: LEGACY_BROWSE_RETURN_URL,
      }),
      headers: { "content-type": "application/json" },
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.next).toBe("passport");
    expect(mockEvaluatePartnerFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
        purpose: "browse",
        returnUrl: LEGACY_BROWSE_RETURN_URL,
      }),
    );
  });
});
