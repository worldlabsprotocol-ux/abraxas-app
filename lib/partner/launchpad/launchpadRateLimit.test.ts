// FILE: lib/partner/launchpad/launchpadRateLimit.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  checkLaunchpadRateLimit,
  resetLaunchpadRateLimitStoreForTests,
} from "@/lib/partner/launchpad/rateLimit";

describe("launchpad rate limit", () => {
  beforeEach(() => {
    resetLaunchpadRateLimitStoreForTests();
  });

  it("blocks after limit is exceeded", () => {
    const req = new NextRequest("http://localhost/api/launchpad/applications", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    expect(checkLaunchpadRateLimit(req, "/api/launchpad/applications", 2).allowed).toBe(true);
    expect(checkLaunchpadRateLimit(req, "/api/launchpad/applications", 2).allowed).toBe(true);
    const blocked = checkLaunchpadRateLimit(req, "/api/launchpad/applications", 2);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });
});
