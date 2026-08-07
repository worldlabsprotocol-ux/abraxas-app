import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as evaluatePOST } from "@/app/api/v1/partner-flow/evaluate/route";
import { GET as publicReceiptGET } from "@/app/api/receipts/[receiptId]/public/route";
import { buildPartnerFlowHealthReport } from "@/lib/partner/partnerFlowHealth";
import {
  checkPartnerFlowRateLimit,
  hashPartnerFlowClientBucketKey,
  resetPartnerFlowRateLimitStoreForTests,
} from "@/lib/partner/partnerFlowRateLimit";
import {
  checkPartnerFlowUpstashRateLimit,
  resetPartnerFlowUpstashStoreForTests,
} from "@/lib/partner/partnerFlowUpstashStore";
import {
  getPartnerFlowTelemetrySnapshot,
  partnerFlowTelemetryHasNoPii,
  recordPartnerFlowTelemetry,
  resetPartnerFlowTelemetryForTests,
} from "@/lib/partner/partnerFlowTelemetry";
import { enforcePartnerFlowRateLimit } from "@/lib/partner/partnerFlowRouteGuard";

const STRONG_TEST_SECRET = "route-security-test-secret-32chars-min";
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

vi.mock("@/lib/partner/partnerFlowUpstashStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/partnerFlowUpstashStore")>();
  return {
    ...actual,
    checkPartnerFlowUpstashRateLimit: vi.fn(actual.checkPartnerFlowUpstashRateLimit),
    probePartnerFlowUpstashHealth: vi.fn(actual.probePartnerFlowUpstashHealth),
  };
});

function postJson(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/v1/partner-flow/evaluate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}

describe("partner-flow rate limit security regressions", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...envBackup,
      PARTNER_FLOW_RATE_LIMIT_ENABLED: "true",
      PARTNER_FLOW_RATE_LIMIT_WINDOW_SEC: "60",
      PARTNER_FLOW_RATE_LIMIT_EVALUATE: "2",
      PARTNER_FLOW_RATE_LIMIT_PUBLIC_RECEIPT: "1",
      PARTNER_FLOW_RATE_LIMIT_SALT: STRONG_TEST_SECRET,
    };
    delete process.env.ABRAXAS_BROWSER_SESSION_SECRET;
    delete process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.VERCEL;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetPartnerFlowRateLimitStoreForTests();
    resetPartnerFlowUpstashStoreForTests();
    vi.mocked(checkPartnerFlowUpstashRateLimit).mockReset();
    resetPartnerFlowTelemetryForTests();

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
    resetPartnerFlowUpstashStoreForTests();
    resetPartnerFlowTelemetryForTests();
  });

  it("evaluate returns 429 with Retry-After after abuse threshold", async () => {
    const body = {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
    };

    const first = await evaluatePOST(postJson(body));
    const second = await evaluatePOST(postJson(body));
    const third = await evaluatePOST(postJson(body));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.headers.get("Retry-After")).toBeTruthy();

    const blocked = await third.json();
    expect(blocked.code).toBe("rate_limited");
    expect(JSON.stringify(blocked)).not.toMatch(/[0-9]{1,3}(\.[0-9]{1,3}){3}/);
    expect(JSON.stringify(blocked)).not.toMatch(/[a-f0-9]{32}/);

    const snapshot = getPartnerFlowTelemetrySnapshot(24);
    expect(snapshot.rate_limited_total).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(snapshot)).not.toMatch(/[0-9]{1,3}(\.[0-9]{1,3}){3}/);
  });

  it("production public receipt fails closed when HMAC secret is missing", async () => {
    process.env = {
      ...envBackup,
      PARTNER_FLOW_RATE_LIMIT_ENABLED: "true",
      NODE_ENV: "production",
      VERCEL: "1",
    };
    delete process.env.PARTNER_FLOW_RATE_LIMIT_SALT;
    delete process.env.ABRAXAS_BROWSER_SESSION_SECRET;
    delete process.env.ABRAXAS_SIGNING_KEY;
    resetPartnerFlowRateLimitStoreForTests();

    const req = new NextRequest("http://localhost/api/receipts/dr_test/public", {
      headers: { "x-real-ip": "203.0.113.99" },
    });
    const params = Promise.resolve({ receiptId: "dr_test" });

    const res = await publicReceiptGET(req, { params });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("Service temporarily unavailable");
    expect(getPublicReceipt).not.toHaveBeenCalled();
  });

  it("ignores attacker-controlled x-forwarded-for on Vercel and shares one bucket per real IP", async () => {
    process.env.VERCEL = "1";
    process.env.PARTNER_FLOW_RATE_LIMIT_PUBLIC_RECEIPT = "5";
    resetPartnerFlowRateLimitStoreForTests();

    const req = new NextRequest("http://localhost/api/receipts/dr_test/public", {
      headers: {
        "x-forwarded-for": "10.0.0.1",
        "x-real-ip": "203.0.113.10",
      },
    });
    const spoofed = new NextRequest("http://localhost/api/receipts/dr_test/public", {
      headers: {
        "x-forwarded-for": "10.0.0.2",
        "x-real-ip": "203.0.113.10",
      },
    });

    const first = await checkPartnerFlowRateLimit(req, "/api/receipts/public");
    const second = await checkPartnerFlowRateLimit(spoofed, "/api/receipts/public");

    expect(first.backend).toBe("memory");
    expect(first.attemptsInWindow).toBe(1);
    expect(second.attemptsInWindow).toBe(2);
  });

  it("never leaks raw IP or bucket key in telemetry, health, or 429 response", async () => {
    const rawIp = "203.0.113.77";
    process.env.VERCEL = "1";
    process.env.PARTNER_FLOW_RATE_LIMIT_PUBLIC_RECEIPT = "1";
    resetPartnerFlowRateLimitStoreForTests();

    const req = new NextRequest("http://localhost/api/receipts/dr_test/public", {
      headers: { "x-real-ip": rawIp },
    });

    const bucketKey = hashPartnerFlowClientBucketKey({
      endpoint: "/api/receipts/public",
      identityMaterial: `vercel-ip:${rawIp}`,
      secret: STRONG_TEST_SECRET,
    });

    const blocked = await enforcePartnerFlowRateLimit({
      request: req,
      endpoint: "/api/receipts/public",
      method: "GET",
      started: Date.now(),
    });
    await publicReceiptGET(req, { params: Promise.resolve({ receiptId: "dr_test" }) });
    const blockedRes = blocked ?? await enforcePartnerFlowRateLimit({
      request: req,
      endpoint: "/api/receipts/public",
      method: "GET",
      started: Date.now(),
    });

    expect(blockedRes).not.toBeNull();
    const blockedJson = await blockedRes!.json();
    const blockedText = JSON.stringify(blockedJson) + blockedRes!.headers.get("Retry-After");
    expect(blockedText).not.toContain(rawIp);
    expect(blockedText).not.toContain(bucketKey);

    const telemetryEvent = recordPartnerFlowTelemetry({
      endpoint: "/api/receipts/public",
      method: "GET",
      httpStatus: 429,
      latencyMs: 3,
      rateLimited: true,
    });
    expect(partnerFlowTelemetryHasNoPii(telemetryEvent)).toBe(true);
    expect(JSON.stringify(telemetryEvent)).not.toContain(rawIp);
    expect(JSON.stringify(telemetryEvent)).not.toContain(bucketKey);

    const health = await buildPartnerFlowHealthReport(24);
    const healthText = JSON.stringify(health);
    expect(healthText).not.toContain(rawIp);
    expect(healthText).not.toContain(bucketKey);
    expect(healthText).not.toContain(STRONG_TEST_SECRET);
  });

  it("evaluate returns 503 when Upstash configuration is URL-only", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const res = await evaluatePOST(postJson({
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
    }));

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("rate_limit_store_config_incomplete");
    expect(evaluatePartnerFlow).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain("https://example.upstash.io");
  });

  it("production public receipt fails closed when Upstash is configured but unavailable", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    process.env.VERCEL = "1";

    vi.mocked(checkPartnerFlowUpstashRateLimit).mockRejectedValue(new Error("redis down"));
    resetPartnerFlowRateLimitStoreForTests();

    const req = new NextRequest("http://localhost/api/receipts/dr_test/public", {
      headers: { "x-real-ip": "203.0.113.99" },
    });
    const params = Promise.resolve({ receiptId: "dr_test" });

    const res = await publicReceiptGET(req, { params });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("rate_limit_store_unavailable");
    expect(getPublicReceipt).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain("test-token");
  });

  it("normal evaluate flow still succeeds under generous limits", async () => {
    process.env.PARTNER_FLOW_RATE_LIMIT_EVALUATE = "30";
    resetPartnerFlowRateLimitStoreForTests();

    const res = await evaluatePOST(postJson({
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
    }));

    expect(res.status).toBe(200);
    expect(evaluatePartnerFlow).toHaveBeenCalledTimes(1);
  });
});
