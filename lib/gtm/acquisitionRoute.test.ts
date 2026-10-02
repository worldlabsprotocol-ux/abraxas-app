// FILE: lib/gtm/acquisitionRoute.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/gtm/acquisition/route";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";
import {
  listGtmAcquisitionEventsForTests,
  resetGtmAcquisitionEventsForTests,
} from "./acquisitionStore";

function acquisitionRequest(body: unknown, ip = "203.0.113.42"): NextRequest {
  return new NextRequest("http://localhost/api/gtm/acquisition", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("gtm acquisition route", () => {
  const savedEnv = {
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  beforeEach(() => {
    resetGtmAcquisitionEventsForTests();
    resetLaunchpadRateLimitStoreForTests();
    delete process.env.VERCEL;
    process.env.VERCEL_ENV = "preview";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    if (savedEnv.VERCEL === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = savedEnv.VERCEL;
    if (savedEnv.VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = savedEnv.VERCEL_ENV;
    if (savedEnv.UPSTASH_REDIS_REST_URL === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = savedEnv.UPSTASH_REDIS_REST_URL;
    if (savedEnv.UPSTASH_REDIS_REST_TOKEN === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = savedEnv.UPSTASH_REDIS_REST_TOKEN;
    resetLaunchpadRateLimitStoreForTests();
  });

  it("records sanitized discovery events", async () => {
    const res = await POST(
      acquisitionRequest({
        event_type: "discovery_completed",
        attributes: {
          industry_category: "fintech_digital_assets",
          app_count_band: "2_3",
          has_kyc_vendor: "yes",
          primary_pain: "repeat_verification",
          email: "blocked@example.com",
          name: "Jane Doe",
          date_of_birth: "1990-01-01",
          provider_subject: "prov-subj-123",
          other_text: "freeform answer",
        },
      }),
    );
    expect(res.status).toBe(200);
    const events = listGtmAcquisitionEventsForTests();
    expect(events).toHaveLength(1);
    expect(events[0]?.attributes.email).toBeUndefined();
    expect(events[0]?.attributes.name).toBeUndefined();
    expect(events[0]?.attributes.other_text).toBeUndefined();
    expect(events[0]?.attributes.industry_category).toBe("fintech_digital_assets");
  });

  it("rejects invalid event types", async () => {
    const res = await POST(acquisitionRequest({ event_type: "not_real" }));
    expect(res.status).toBe(400);
  });

  it("drops nested arbitrary attribute objects", async () => {
    const res = await POST(
      acquisitionRequest({
        event_type: "proof_pack_viewed",
        attributes: {
          proof_pack: "institutional_reuse",
          nested: { email: "evil@example.com", arbitrary: true },
          industry_category: "fintech_digital_assets",
        },
      }),
    );
    expect(res.status).toBe(200);
    const attrs = listGtmAcquisitionEventsForTests()[0]?.attributes ?? {};
    expect(attrs.nested).toBeUndefined();
    expect(attrs.industry_category).toBe("fintech_digital_assets");
  });

  it("rejects payloads larger than 4KB", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/gtm/acquisition", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.43" },
        body: JSON.stringify({
          event_type: "discovery_started",
          padding: "x".repeat(5000),
        }),
      }),
    );
    expect(res.status).toBe(413);
    expect(listGtmAcquisitionEventsForTests()).toHaveLength(0);
  });

  it("rate limits abusive traffic", async () => {
    const ip = "203.0.113.99";
    for (let i = 0; i < 120; i += 1) {
      const ok = await POST(acquisitionRequest({ event_type: "discovery_started" }, ip));
      expect(ok.status).toBe(200);
    }
    const blocked = await POST(acquisitionRequest({ event_type: "discovery_started" }, ip));
    expect(blocked.status).toBe(429);
    const body = (await blocked.json()) as { error?: string };
    expect(body.error).toBe("rate_limited");
  });
});
