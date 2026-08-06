import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  checkPartnerFlowRateLimit,
  hashPartnerFlowClientBucketKey,
  isStrongPartnerFlowRateLimitSecret,
  partnerFlowRateLimitResponse,
  resetPartnerFlowRateLimitStoreForTests,
  resolvePartnerFlowRateLimitSecret,
  resolveTrustedClientIpIdentity,
} from "@/lib/partner/partnerFlowRateLimit";

const STRONG_TEST_SECRET = "integration-test-secret-minimum-32-chars";

describe("partnerFlowRateLimit", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...envBackup,
      PARTNER_FLOW_RATE_LIMIT_ENABLED: "true",
      PARTNER_FLOW_RATE_LIMIT_WINDOW_SEC: "60",
      PARTNER_FLOW_RATE_LIMIT_EVALUATE: "2",
      PARTNER_FLOW_RATE_LIMIT_SALT: STRONG_TEST_SECRET,
    };
    delete process.env.ABRAXAS_BROWSER_SESSION_SECRET;
    delete process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.VERCEL;
    resetPartnerFlowRateLimitStoreForTests();
  });

  afterEach(() => {
    process.env = { ...envBackup };
    resetPartnerFlowRateLimitStoreForTests();
  });

  function requestWithHeaders(headers: Record<string, string>): NextRequest {
    return new NextRequest("http://localhost/api/v1/partner-flow/evaluate", {
      method: "POST",
      headers,
    });
  }

  it("allows requests under the configured limit", () => {
    const req = requestWithHeaders({ "x-real-ip": "203.0.113.10" });
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
    const req = requestWithHeaders({});
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

  it("never exposes raw IP in bucket key output", () => {
    const rawIp = "198.51.100.42";
    const key = hashPartnerFlowClientBucketKey({
      endpoint: "/api/receipts/public",
      identityMaterial: `vercel-ip:${rawIp}`,
      secret: STRONG_TEST_SECRET,
    });

    expect(key).not.toContain(rawIp);
    expect(key).toMatch(/^[a-f0-9]{32}$/);
  });

  it("uses distinct buckets for different session subjects", () => {
    const req = requestWithHeaders({});
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

describe("partnerFlowRateLimit secret resolution", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("does not fall back to public literals when unset", () => {
    delete process.env.PARTNER_FLOW_RATE_LIMIT_SALT;
    delete process.env.ABRAXAS_BROWSER_SESSION_SECRET;
    delete process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.ABRAXAS_PSEUDONYM_SALT;

    const resolved = resolvePartnerFlowRateLimitSecret();
    expect(resolved.configured).toBe(false);
    expect(resolved.secret).toBeNull();
  });

  it("accepts ABRAXAS_BROWSER_SESSION_SECRET when explicit salt is absent", () => {
    delete process.env.PARTNER_FLOW_RATE_LIMIT_SALT;
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "production-browser-session-secret-value";

    const resolved = resolvePartnerFlowRateLimitSecret();
    expect(resolved.configured).toBe(true);
    expect(resolved.source).toBe("ABRAXAS_BROWSER_SESSION_SECRET");
  });

  it("rejects known public literal secrets", () => {
    expect(isStrongPartnerFlowRateLimitSecret("abraxas-partner-flow-pilot")).toBe(false);
    expect(isStrongPartnerFlowRateLimitSecret("abraxas-pilot")).toBe(false);
    expect(isStrongPartnerFlowRateLimitSecret("short")).toBe(false);
  });
});

describe("partnerFlowRateLimit trusted IP", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("ignores attacker-controlled x-forwarded-for on Vercel", () => {
    process.env.VERCEL = "1";
    const req = new NextRequest("http://localhost/api/receipts/dr_test/public", {
      headers: {
        "x-forwarded-for": "1.2.3.4",
        "x-real-ip": "203.0.113.55",
      },
    });

    const trusted = resolveTrustedClientIpIdentity(req);
    expect(trusted.source).toBe("vercel-x-real-ip");
    expect(trusted.identityMaterial).toBe("vercel-ip:203.0.113.55");
    expect(trusted.identityMaterial).not.toContain("1.2.3.4");
  });

  it("uses shared fallback identity when no trustworthy IP exists", () => {
    delete process.env.VERCEL;
    const req = new NextRequest("http://localhost/api/receipts/dr_test/public", {
      headers: { "x-forwarded-for": "attacker-controlled-ip" },
    });

    const trusted = resolveTrustedClientIpIdentity(req);
    expect(trusted.source).toBe("untrusted-proxy-shared");
    expect(trusted.identityMaterial).not.toContain("attacker-controlled-ip");
  });
});
