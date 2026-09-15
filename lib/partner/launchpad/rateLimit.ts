// FILE: lib/partner/launchpad/rateLimit.ts
// In-memory rate limits for Partner Launchpad provisioning and credential routes.

import type { NextRequest } from "next/server";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function resetLaunchpadRateLimitStoreForTests(): void {
  buckets.clear();
}

function clientKey(req: NextRequest, suffix: string): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip") || "unknown";
  return `${suffix}:${ip}`;
}

export function checkLaunchpadRateLimit(
  req: NextRequest,
  route: string,
  limit: number,
  windowSec = 60,
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const key = clientKey(req, route);
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true };
}
