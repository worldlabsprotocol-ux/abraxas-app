import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as evaluatePOST } from "@/app/api/v1/partner-flow/evaluate/route";
import { GET as publicReceiptGET } from "@/app/api/receipts/[receiptId]/public/route";
import { resetPartnerFlowRateLimitStoreForTests } from "@/lib/partner/partnerFlowRateLimit";
import { resetPartnerFlowTelemetryForTests, getPartnerFlowTelemetrySnapshot } from "@/lib/partner/partnerFlowTelemetry";

const SUI = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const RETURN_URL = "https://abraxas-app.vercel.app/demo/partner-access";
const PARTNER_ID = "good-trouble-cannabis";
const POLICY_ID = "good-trouble-retail-v1";

const evaluatePartnerFlow = vi.fn();
const getPublicReceipt = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: vi.fn(async () => ({
    ok: true,
    session: { suiAddress: SUI },
  })),
}));

vi.mock("@/lib/partner/returnUrlAllowlist", () => ({
  isAllowedPartnerReturnUrl: vi.fn(async () => true),
}));

vi.mock("@/lib/partner/relyingPartyFlow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/relyingPartyFlow")>();
  return {
    ...actual,
    evaluatePartnerFlow: (...args: unknown[]) => evaluatePartnerFlow(...args),
  };
});

vi.mock("@/lib/verify/resolveFlowParams", () => ({
  resolvePartnerFlowParams: vi.fn(() => ({ policyId: POLICY_ID })),
}));

vi.mock("@/lib/partner/logPartnerUsage", () => ({
  logPartnerUsage: vi.fn(),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: vi.fn(async () => "audit-1"),
}));

vi.mock("@/lib/decisionReceipts/service", () => ({
  getPublicReceipt: (...args: unknown[]) => getPublicReceipt(...args),
}));

vi.mock("@/lib/decisionReceipts/views", () => ({
  assertNoPiiInPublicView: vi.fn(),
}));

function postJson(url: string, body: Record<string, unknown>, ip = "203.0.113.50") {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
  });
}

describe("partner-flow rate limit route integration", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    resetPartnerFlowRateLimitStoreForTests();
    resetPartnerFlowTelemetryForTests();
    process.env.PARTNER_FLOW_RATE_LIMIT_ENABLED = "true";
    process.env.PARTNER_FLOW_RATE_LIMIT_WINDOW_SEC = "60";
    process.env.PARTNER_FLOW_RATE_LIMIT_EVALUATE = "2";
    process.env.PARTNER_FLOW_RATE_LIMIT_PUBLIC_RECEIPT = "1";
    process.env.PARTNER_FLOW_RATE_LIMIT_SALT = "route-test-salt";

    evaluatePartnerFlow.mockResolvedValue({
      next: "passport",
      verification_request_id: "00000000-0000-4000-8000-0000000000aa",
      passport_url: "https://example.com/passport",
    });
    getPublicReceipt.mockResolvedValue({
      receipt_id: "dr_test",
      artifact_type: "eligibility_decision_receipt",
      decision_result: "approved",
    });
  });

  afterEach(() => {
    process.env = { ...envBackup };
    resetPartnerFlowRateLimitStoreForTests();
    resetPartnerFlowTelemetryForTests();
  });

  it("evaluate returns 429 with Retry-After after abuse threshold", async () => {
    const body = {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
    };

    const first = await evaluatePOST(postJson("http://localhost/api/v1/partner-flow/evaluate", body));
    const second = await evaluatePOST(postJson("http://localhost/api/v1/partner-flow/evaluate", body));
    const third = await evaluatePOST(postJson("http://localhost/api/v1/partner-flow/evaluate", body));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.headers.get("Retry-After")).toBeTruthy();

    const blocked = await third.json();
    expect(blocked.code).toBe("rate_limited");

    const snapshot = getPartnerFlowTelemetrySnapshot(24);
    expect(snapshot.rate_limited_total).toBeGreaterThanOrEqual(1);
  });

  it("public receipt rate limits by hashed IP without breaking normal flow", async () => {
    const req = new NextRequest("http://localhost/api/receipts/dr_test/public", {
      headers: { "x-forwarded-for": "203.0.113.99" },
    });
    const params = Promise.resolve({ receiptId: "dr_test" });

    const ok = await publicReceiptGET(req, { params });
    expect(ok.status).toBe(200);

    const blocked = await publicReceiptGET(req, { params });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("normal evaluate flow still succeeds under generous limits", async () => {
    process.env.PARTNER_FLOW_RATE_LIMIT_EVALUATE = "30";
    resetPartnerFlowRateLimitStoreForTests();

    const res = await evaluatePOST(
      postJson("http://localhost/api/v1/partner-flow/evaluate", {
        partner_id: PARTNER_ID,
        policy_id: POLICY_ID,
        return_url: RETURN_URL,
      }),
    );

    expect(res.status).toBe(200);
    expect(evaluatePartnerFlow).toHaveBeenCalledTimes(1);
  });
});
