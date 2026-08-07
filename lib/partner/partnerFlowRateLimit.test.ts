import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  checkPartnerFlowRateLimit,
  hashPartnerFlowClientBucketKey,
  isStrongPartnerFlowRateLimitSecret,
  partnerFlowRateLimitResponse,
  resetPartnerFlowRateLimitStoreForTests,
  resolvePartnerFlowRateLimitSecret,
  resolveTrustedClientIpIdentity,
  getPartnerFlowRateLimitBackendInfo,
} from "@/lib/partner/partnerFlowRateLimit";
import {
  checkPartnerFlowUpstashRateLimit,
  probePartnerFlowUpstashHealth,
  resetPartnerFlowUpstashStoreForTests,
} from "@/lib/partner/partnerFlowUpstashStore";

vi.mock("@/lib/partner/partnerFlowUpstashStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/partnerFlowUpstashStore")>();
  return {
    ...actual,
    checkPartnerFlowUpstashRateLimit: vi.fn(actual.checkPartnerFlowUpstashRateLimit),
    probePartnerFlowUpstashHealth: vi.fn(actual.probePartnerFlowUpstashHealth),
  };
});

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
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetPartnerFlowRateLimitStoreForTests();
    resetPartnerFlowUpstashStoreForTests();
    vi.mocked(checkPartnerFlowUpstashRateLimit).mockReset();
    vi.mocked(probePartnerFlowUpstashHealth).mockReset();
  });

  afterEach(() => {
    process.env = { ...envBackup };
    resetPartnerFlowRateLimitStoreForTests();
    resetPartnerFlowUpstashStoreForTests();
  });

  function requestWithHeaders(headers: Record<string, string>): NextRequest {
    return new NextRequest("http://localhost/api/v1/partner-flow/evaluate", {
      method: "POST",
      headers,
    });
  }

  it("allows requests under the configured limit (in-memory default)", async () => {
    const req = requestWithHeaders({ "x-real-ip": "203.0.113.10" });
    const first = await checkPartnerFlowRateLimit(req, "/api/v1/partner-flow/evaluate", {
      sessionSubject: "0xabc",
    });
    const second = await checkPartnerFlowRateLimit(req, "/api/v1/partner-flow/evaluate", {
      sessionSubject: "0xabc",
    });

    expect(first.allowed).toBe(true);
    expect(first.backend).toBe("memory");
    expect(second.allowed).toBe(true);
    expect(second.attemptsInWindow).toBe(2);
    expect(checkPartnerFlowUpstashRateLimit).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After when limit exceeded", async () => {
    const req = requestWithHeaders({});
    await checkPartnerFlowRateLimit(req, "/api/v1/partner-flow/evaluate", { sessionSubject: "0xdef" });
    await checkPartnerFlowRateLimit(req, "/api/v1/partner-flow/evaluate", { sessionSubject: "0xdef" });
    const blocked = await checkPartnerFlowRateLimit(req, "/api/v1/partner-flow/evaluate", {
      sessionSubject: "0xdef",
    });

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);

    const res = partnerFlowRateLimitResponse(blocked);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe(String(blocked.retryAfterSec));
  });

  it("uses Upstash when both env vars are present", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    vi.mocked(checkPartnerFlowUpstashRateLimit).mockResolvedValue({
      allowed: true,
      attemptsInWindow: 1,
      retryAfterSec: 60,
    });

    const req = requestWithHeaders({});
    const result = await checkPartnerFlowRateLimit(req, "/api/v1/partner-flow/evaluate", {
      sessionSubject: "0xabc",
    });

    expect(result.backend).toBe("upstash");
    expect(result.allowed).toBe(true);
    expect(checkPartnerFlowUpstashRateLimit).toHaveBeenCalledOnce();
    const call = vi.mocked(checkPartnerFlowUpstashRateLimit).mock.calls[0]![0];
    expect(call.bucketKey).toMatch(/^[a-f0-9]{32}$/);
    expect(call.bucketKey).not.toContain("0xabc");
    expect(JSON.stringify(call)).not.toContain("0xabc");
  });

  it("fails closed when Upstash is configured but unavailable", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    vi.mocked(checkPartnerFlowUpstashRateLimit).mockRejectedValue(new Error("redis down"));

    const req = new NextRequest("http://localhost/api/receipts/dr_test/public", {
      headers: { "x-real-ip": "203.0.113.10" },
    });
    const result = await checkPartnerFlowRateLimit(req, "/api/receipts/public");

    expect(result.allowed).toBe(false);
    expect(result.backend).toBe("distributed_unavailable");
  });

  it("fails closed when only UPSTASH_REDIS_REST_URL is set (no memory fallback)", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const req = new NextRequest("http://localhost/api/receipts/dr_test/public", {
      headers: { "x-real-ip": "203.0.113.10" },
    });
    const blocked = await checkPartnerFlowRateLimit(req, "/api/receipts/public");

    expect(blocked.allowed).toBe(false);
    expect(blocked.backend).toBe("distributed_config_incomplete");
    expect(checkPartnerFlowUpstashRateLimit).not.toHaveBeenCalled();

    delete process.env.UPSTASH_REDIS_REST_URL;
    resetPartnerFlowRateLimitStoreForTests();
    const memoryResult = await checkPartnerFlowRateLimit(req, "/api/receipts/public");
    expect(memoryResult.backend).toBe("memory");
    expect(memoryResult.attemptsInWindow).toBe(1);
  });

  it("fails closed when only UPSTASH_REDIS_REST_TOKEN is set (no memory fallback)", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = "super-secret-token-value";

    const req = requestWithHeaders({});
    const blocked = await checkPartnerFlowRateLimit(req, "/api/v1/partner-flow/evaluate", {
      sessionSubject: "0xabc",
    });

    expect(blocked.allowed).toBe(false);
    expect(blocked.backend).toBe("distributed_config_incomplete");
    expect(checkPartnerFlowUpstashRateLimit).not.toHaveBeenCalled();

    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetPartnerFlowRateLimitStoreForTests();
    const memoryResult = await checkPartnerFlowRateLimit(req, "/api/v1/partner-flow/evaluate", {
      sessionSubject: "0xabc",
    });
    expect(memoryResult.backend).toBe("memory");
    expect(memoryResult.attemptsInWindow).toBe(1);
  });

  it("reports incomplete configuration in health without leaking secrets", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const info = await getPartnerFlowRateLimitBackendInfo();
    expect(info.backend).toBe("distributed_config_incomplete");
    expect(info.distributedStoreConfigIncomplete).toBe(true);
    expect(info.distributedStoreConfigured).toBe(false);
    expect(info.note).toMatch(/incomplete/i);
    expect(info.note).not.toContain("https://example.upstash.io");
    expect(JSON.stringify(info)).not.toContain("super-secret");
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

  it("uses distinct buckets for different session subjects", async () => {
    const req = requestWithHeaders({});
    for (let i = 0; i < 2; i++) {
      await checkPartnerFlowRateLimit(req, "/api/v1/partner-flow/evaluate", { sessionSubject: "0x111" });
    }
    const otherSubject = await checkPartnerFlowRateLimit(req, "/api/v1/partner-flow/evaluate", {
      sessionSubject: "0x222",
    });
    expect(otherSubject.allowed).toBe(true);
    expect(otherSubject.attemptsInWindow).toBe(1);
  });

  it("reports memory backend in health when Upstash is not configured", async () => {
    vi.mocked(probePartnerFlowUpstashHealth).mockResolvedValue({
      configured: false,
      configState: "none",
      reachable: null,
      errorCode: null,
    });

    const info = await getPartnerFlowRateLimitBackendInfo();
    expect(info.backend).toBe("memory");
    expect(info.distributedStoreActive).toBe(false);
    expect(info.distributedStoreConfigured).toBe(false);
    expect(info.note).toMatch(/in-process memory/i);
  });

  it("reports upstash backend when configured and reachable", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    vi.mocked(probePartnerFlowUpstashHealth).mockResolvedValue({
      configured: true,
      configState: "complete",
      reachable: true,
      errorCode: null,
    });

    const info = await getPartnerFlowRateLimitBackendInfo();
    expect(info.backend).toBe("upstash");
    expect(info.distributedStoreActive).toBe(true);
    expect(info.note).toMatch(/Network-wide protection active/i);
  });

  it("reports distributed_unavailable in health when Upstash is unreachable", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    vi.mocked(probePartnerFlowUpstashHealth).mockResolvedValue({
      configured: true,
      configState: "complete",
      reachable: false,
      errorCode: "unreachable",
    });

    const info = await getPartnerFlowRateLimitBackendInfo();
    expect(info.backend).toBe("distributed_unavailable");
    expect(info.distributedStoreConfigured).toBe(true);
    expect(info.distributedStoreActive).toBe(false);
    expect(info.distributedStoreReachable).toBe(false);
    expect(info.note).toMatch(/unreachable/i);
    expect(info.note).not.toContain("test-token");
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
