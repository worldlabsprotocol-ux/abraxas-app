// FILE: lib/partner/launchpad/launchpadRateLimit.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  checkLaunchpadRateLimit,
  checkLaunchpadTenantRateLimit,
  launchpadRateLimitBackendInfo,
  resetLaunchpadRateLimitStoreForTests,
} from "@/lib/partner/launchpad/rateLimit";

describe("launchpad rate limit", () => {
  const env = { ...process.env };

  beforeEach(() => {
    resetLaunchpadRateLimitStoreForTests();
    delete process.env.VERCEL;
    process.env.VERCEL_ENV = "preview";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("blocks after limit is exceeded", async () => {
    const req = new NextRequest("http://localhost/api/launchpad/applications", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    expect((await checkLaunchpadRateLimit(req, "/api/launchpad/applications", 2)).allowed).toBe(true);
    expect((await checkLaunchpadRateLimit(req, "/api/launchpad/applications", 2)).allowed).toBe(true);
    const blocked = await checkLaunchpadRateLimit(req, "/api/launchpad/applications", 2);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("scopes sandbox readiness limits by tenant", async () => {
    const req = new NextRequest("http://localhost/api/launchpad/sandbox-readiness/run", {
      headers: { "x-forwarded-for": "203.0.113.11" },
    });
    expect((await checkLaunchpadTenantRateLimit(req, "/api/launchpad/sandbox-readiness/run", "partner-a", 1)).allowed).toBe(true);
    expect((await checkLaunchpadTenantRateLimit(req, "/api/launchpad/sandbox-readiness/run", "partner-a", 1)).allowed).toBe(false);
    expect((await checkLaunchpadTenantRateLimit(req, "/api/launchpad/sandbox-readiness/run", "partner-b", 1)).allowed).toBe(true);
  });

  it("reports backend info without claiming production scale", () => {
    const info = launchpadRateLimitBackendInfo();
    expect(["memory", "upstash", "distributed_unavailable"]).toContain(info.backend);
    expect(info.upstash_config).toBeDefined();
  });

  it("returns safe public copy from enforceLaunchpadRateLimit", async () => {
    const { enforceLaunchpadRateLimit } = await import("@/lib/partner/launchpad/apiHelpers");
    const req = new NextRequest("http://localhost/api/launchpad/applications", {
      headers: { "x-forwarded-for": "203.0.113.99" },
    });
    expect(await enforceLaunchpadRateLimit(req, "/api/launchpad/applications", 1)).toBeNull();
    const blocked = await enforceLaunchpadRateLimit(req, "/api/launchpad/applications", 1);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    const body = await blocked!.json() as { code: string; error: string; retry_after_sec?: number };
    expect(body.code).toBe("launchpad_rate_limited");
    expect(body.error).toMatch(/Too many sandbox requests/i);
    expect(body.error).not.toBe("launchpad_rate_limited");
    expect(typeof body.retry_after_sec).toBe("number");
  });

  it("fails closed in production when Upstash is not configured", async () => {
    const env = { ...process.env };
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const req = new NextRequest("http://localhost/api/launchpad/applications", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const blocked = await checkLaunchpadRateLimit(req, "/api/launchpad/applications", 10);
    expect(blocked.allowed).toBe(false);

    process.env = { ...env };
  });
});
