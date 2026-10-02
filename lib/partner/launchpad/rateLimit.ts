// FILE: lib/partner/launchpad/rateLimit.ts
// Launchpad rate limits — Upstash when configured, in-memory fallback for local dev.

import type { NextRequest } from "next/server";
import { createHmac } from "crypto";
import {
  checkUpstashRateLimitWithPrefix,
  getPartnerFlowUpstashConfigState,
  isPartnerFlowUpstashConfigured,
} from "@/lib/partner/partnerFlowUpstashStore";
import { isPartnerFlowProductionRuntime } from "@/lib/partner/partnerFlowRateLimit";

const LAUNCHPAD_UPSTASH_PREFIX = "abraxas-launchpad-rate-v1";
const buckets = new Map<string, { count: number; resetAt: number }>();

export function resetLaunchpadRateLimitStoreForTests(): void {
  buckets.clear();
}

function clientKey(req: NextRequest, suffix: string): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip") || "unknown";
  return `${suffix}:${ip}`;
}

function hmacBucketKey(raw: string): string {
  const secret = process.env.PARTNER_FLOW_RATE_LIMIT_SALT
    ?? process.env.ABRAXAS_BROWSER_SESSION_SECRET
    ?? process.env.ABRAXAS_SIGNING_KEY;
  if (!secret || secret.length < 16) return raw;
  return createHmac("sha256", secret).update(raw).digest("hex").slice(0, 32);
}

async function checkUpstash(
  bucketKey: string,
  limit: number,
  windowSec: number,
): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number } | null> {
  if (!isPartnerFlowUpstashConfigured()) return null;
  try {
    const result = await checkUpstashRateLimitWithPrefix({
      prefix: LAUNCHPAD_UPSTASH_PREFIX,
      bucketKey: hmacBucketKey(bucketKey),
      limit,
      windowSec,
    });
    if (result.allowed) return { allowed: true };
    return { allowed: false, retryAfterSec: result.retryAfterSec };
  } catch {
    return null;
  }
}

function checkMemory(
  key: string,
  limit: number,
  windowSec: number,
): { allowed: true } | { allowed: false; retryAfterSec: number } {
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

export async function checkLaunchpadTenantRateLimit(
  req: NextRequest,
  route: string,
  tenantId: string,
  limit: number,
  windowSec = 60,
): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number }> {
  const tenant = tenantId.trim().toLowerCase() || "unknown";
  return checkLaunchpadRateLimit(req, `${route}:tenant:${tenant}`, limit, windowSec);
}

export async function checkLaunchpadRateLimit(
  req: NextRequest,
  route: string,
  limit: number,
  windowSec = 60,
): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number }> {
  const key = clientKey(req, route);
  const upstash = await checkUpstash(key, limit, windowSec);
  if (upstash) return upstash;

  if (isPartnerFlowProductionRuntime()) {
    return { allowed: false, retryAfterSec: windowSec };
  }

  return checkMemory(key, limit, windowSec);
}

export function launchpadRateLimitBackendInfo(): {
  backend: "upstash" | "memory" | "distributed_unavailable";
  upstash_config: ReturnType<typeof getPartnerFlowUpstashConfigState>;
} {
  if (isPartnerFlowUpstashConfigured()) {
    return {
      backend: "upstash",
      upstash_config: getPartnerFlowUpstashConfigState(),
    };
  }
  return {
    backend: isPartnerFlowProductionRuntime() ? "distributed_unavailable" : "memory",
    upstash_config: getPartnerFlowUpstashConfigState(),
  };
}
