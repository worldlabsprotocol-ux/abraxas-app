// FILE: lib/integrations/designPartnerApplicationRateLimit.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  checkDesignPartnerApplyRateLimit,
  resetDesignPartnerApplyRateLimitStoreForTests,
} from "./designPartnerApplicationRateLimit";

const STRONG_SECRET = "design-partner-rate-limit-secret-32";

describe("designPartnerApplicationRateLimit", () => {
  beforeEach(() => {
    resetDesignPartnerApplyRateLimitStoreForTests();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PARTNER_FLOW_RATE_LIMIT_ENABLED", "true");
    vi.stubEnv("PARTNER_FLOW_RATE_LIMIT_SALT", STRONG_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetDesignPartnerApplyRateLimitStoreForTests();
  });

  it("uses memory fallback locally when Upstash is absent", async () => {
    const req = new NextRequest("http://localhost/api/integrations/apply", { method: "POST" });
    const first = await checkDesignPartnerApplyRateLimit(req);
    expect(first.allowed).toBe(true);
    expect(first.backend).toBe("memory");
  });

  it("fails closed in production without Upstash", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NODE_ENV", "production");

    const req = new NextRequest("http://localhost/api/integrations/apply", {
      method: "POST",
      headers: { "x-real-ip": "203.0.113.10" },
    });
    const result = await checkDesignPartnerApplyRateLimit(req);
    expect(result.allowed).toBe(false);
    expect(result.backend).toBe("distributed_unavailable");
  });

  it("fails closed in production when Upstash config is incomplete", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");

    const req = new NextRequest("http://localhost/api/integrations/apply", {
      method: "POST",
      headers: { "x-real-ip": "203.0.113.10" },
    });
    const result = await checkDesignPartnerApplyRateLimit(req);
    expect(result.allowed).toBe(false);
    expect(result.backend).toBe("distributed_config_incomplete");
  });

  it("fails closed in production without a strong HMAC secret", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    delete process.env.PARTNER_FLOW_RATE_LIMIT_SALT;
    delete process.env.ABRAXAS_BROWSER_SESSION_SECRET;
    delete process.env.ABRAXAS_SIGNING_KEY;

    const req = new NextRequest("http://localhost/api/integrations/apply", {
      method: "POST",
      headers: { "x-real-ip": "203.0.113.10" },
    });
    const result = await checkDesignPartnerApplyRateLimit(req);
    expect(result.allowed).toBe(false);
    expect(result.backend).toBe("identity_unavailable");
  });
});
