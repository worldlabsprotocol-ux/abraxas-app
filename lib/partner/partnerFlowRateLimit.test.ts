import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  checkPartnerFlowRateLimit,
  hashPartnerFlowClientBucketKey,
  partnerFlowRateLimitResponse,
  resetPartnerFlowRateLimitStoreForTests,
} from "@/lib/partner/partnerFlowRateLimit";

describe("partnerFlowRateLimit", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    resetPartnerFlowRateLimitStoreForTests();
    process.env.PARTNER_FLOW_RATE_LIMIT_ENABLED = "true";
    process.env.PARTNER_FLOW_RATE_LIMIT_WINDOW_SEC = "60";
    process.env.PARTNER_FLOW_RATE_LIMIT_EVALUATE = "2";
    process.env.PARTNER_FLOW_RATE_LIMIT_SALT = "test-salt";
  });

  afterEach(() => {
    process.env = { ...envBackup };
    resetPartnerFlowRateLimitStoreForTests();
  });

  function requestWithIp(ip: string): NextRequest {
    return new NextRequest("http://localhost/api/v1/partner-flow/evaluate", {
      method: "POST",
      headers: { "x-forwarded-for": ip },
    });
  }

  it("allows requests under the configured limit", () => {
    const req = requestWithIp("203.0.113.10");
    const first = checkPartnerFlowRateLimit(req, "/api/v1/partner-flow/evaluate", {
      sessionSubject: "0xabc",
    });
    const second = checkPartnerFlowRateLimit(req, "/api/v1/partner-flow/evaluate", {
      sessionSubject: "0xabc",
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.attemptsInWindow).toBe(2);
  });

  it("returns 429 with Retry-After when limit exceeded", () => {
    const req = requestWithIp("203.0.113.11");
    checkPartnerFlowRateLimit(req, "/api/v1/partner-flow/evaluate", { sessionSubject: "0xdef" });
    checkPartnerFlowRateLimit(req, "/api/v1/partner-flow/evaluate", { sessionSubject: "0xdef" });
    const blocked = checkPartnerFlowRateLimit(req, "/api/v1/partner-flow/evaluate", {
      sessionSubject: "0xdef",
    });

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);

    const res = partnerFlowRateLimitResponse(blocked);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe(String(blocked.retryAfterSec));
  });

  it("never exposes raw IP in bucket key metadata", () => {
    const rawIp = "198.51.100.42";
    const key = hashPartnerFlowClientBucketKey({
      endpoint: "/api/receipts/public",
      clientIp: rawIp,
    });

    expect(key).not.toContain(rawIp);
    expect(key).toMatch(/^[a-f0-9]{32}$/);
  });

  it("uses distinct buckets for different session subjects", () => {
    const req = requestWithIp("203.0.113.12");
    for (let i = 0; i < 2; i++) {
      checkPartnerFlowRateLimit(req, "/api/v1/partner-flow/evaluate", { sessionSubject: "0x111" });
    }
    const otherSubject = checkPartnerFlowRateLimit(req, "/api/v1/partner-flow/evaluate", {
      sessionSubject: "0x222",
    });
    expect(otherSubject.allowed).toBe(true);
    expect(otherSubject.attemptsInWindow).toBe(1);
  });
});
