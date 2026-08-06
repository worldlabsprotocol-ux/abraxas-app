// FILE: lib/partner/partnerFlowRateLimit.ts
// Configurable Partner Flow rate limits — privacy-preserving client identity, no raw IPs in audit metadata.

import { createHmac } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const PARTNER_FLOW_RATE_LIMIT_ENDPOINTS = [
  "/api/v1/partner-flow/evaluate",
  "/api/v1/partner-flow/complete",
  "/api/v1/partner-flow/refresh",
  "/api/receipts/public",
  "/api/v1/verification-requests/consent",
] as const;

export type PartnerFlowRateLimitEndpoint = (typeof PARTNER_FLOW_RATE_LIMIT_ENDPOINTS)[number];

export interface PartnerFlowRateLimitResult {
  allowed: boolean;
  limit: number;
  attemptsInWindow: number;
  retryAfterSec: number;
  /** HMAC bucket key only — never a raw IP or wallet address. */
  clientBucketKey: string;
  backend: "memory" | "disabled";
}

const RATE_LIMIT_NAMESPACE = "abraxas-partner-flow-rate-v1";
const DEFAULT_WINDOW_SEC = 60;

const ENDPOINT_ENV_KEYS: Record<PartnerFlowRateLimitEndpoint, string> = {
  "/api/v1/partner-flow/evaluate": "PARTNER_FLOW_RATE_LIMIT_EVALUATE",
  "/api/v1/partner-flow/complete": "PARTNER_FLOW_RATE_LIMIT_COMPLETE",
  "/api/v1/partner-flow/refresh": "PARTNER_FLOW_RATE_LIMIT_REFRESH",
  "/api/receipts/public": "PARTNER_FLOW_RATE_LIMIT_PUBLIC_RECEIPT",
  "/api/v1/verification-requests/consent": "PARTNER_FLOW_RATE_LIMIT_CONSENT",
};

const DEFAULT_LIMITS: Record<PartnerFlowRateLimitEndpoint, number> = {
  "/api/v1/partner-flow/evaluate": 30,
  "/api/v1/partner-flow/complete": 30,
  "/api/v1/partner-flow/refresh": 20,
  "/api/receipts/public": 120,
  "/api/v1/verification-requests/consent": 30,
};

type MemoryBucket = { timestamps: number[] };

const memoryBuckets = new Map<string, MemoryBucket>();

function rateLimitSalt(): string {
  return (
    process.env.PARTNER_FLOW_RATE_LIMIT_SALT?.trim()
    || process.env.ABRAXAS_PSEUDONYM_SALT?.trim()
    || "abraxas-partner-flow-pilot"
  );
}

export function isPartnerFlowRateLimitEnabled(): boolean {
  const raw = process.env.PARTNER_FLOW_RATE_LIMIT_ENABLED?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return true;
}

export function getPartnerFlowRateLimitWindowSec(): number {
  const raw = process.env.PARTNER_FLOW_RATE_LIMIT_WINDOW_SEC;
  if (!raw) return DEFAULT_WINDOW_SEC;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WINDOW_SEC;
}

export function getPartnerFlowRateLimitForEndpoint(endpoint: PartnerFlowRateLimitEndpoint): number {
  const envKey = ENDPOINT_ENV_KEYS[endpoint];
  const raw = process.env[envKey];
  if (!raw) return DEFAULT_LIMITS[endpoint];
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_LIMITS[endpoint];
}

/** Extract client IP for hashing only — never log or persist the raw value. */
export function extractClientIpForRateLimit(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")?.trim()
    ?? "127.0.0.1"
  );
}

/**
 * Privacy-preserving rate-limit bucket key.
 * Uses HMAC-SHA256; raw IP and wallet addresses never leave this function.
 */
export function hashPartnerFlowClientBucketKey(input: {
  endpoint: PartnerFlowRateLimitEndpoint;
  clientIp?: string;
  sessionSubject?: string | null;
}): string {
  const subject = input.sessionSubject?.trim();
  const identityMaterial = subject
    ? `session:${subject}`
    : `ip:${input.clientIp ?? "unknown"}`;

  return createHmac("sha256", rateLimitSalt())
    .update(`${RATE_LIMIT_NAMESPACE}:${input.endpoint}:${identityMaterial}`, "utf8")
    .digest("hex")
    .slice(0, 32);
}

function pruneWindow(timestamps: number[], windowMs: number, now: number): number[] {
  const cutoff = now - windowMs;
  return timestamps.filter(ts => ts >= cutoff);
}

function checkMemoryRateLimit(
  bucketKey: string,
  limit: number,
  windowMs: number,
  now: number,
): Pick<PartnerFlowRateLimitResult, "allowed" | "attemptsInWindow" | "retryAfterSec"> {
  const bucket = memoryBuckets.get(bucketKey) ?? { timestamps: [] };
  const pruned = pruneWindow(bucket.timestamps, windowMs, now);

  if (pruned.length >= limit) {
    const oldest = pruned[0] ?? now;
    const retryAfterMs = Math.max(0, oldest + windowMs - now);
    memoryBuckets.set(bucketKey, { timestamps: pruned });
    return {
      allowed: false,
      attemptsInWindow: pruned.length,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  pruned.push(now);
  memoryBuckets.set(bucketKey, { timestamps: pruned });
  return {
    allowed: true,
    attemptsInWindow: pruned.length,
    retryAfterSec: Math.ceil(windowMs / 1000),
  };
}

export function checkPartnerFlowRateLimit(
  request: NextRequest,
  endpoint: PartnerFlowRateLimitEndpoint,
  options?: { sessionSubject?: string | null },
): PartnerFlowRateLimitResult {
  const limit = getPartnerFlowRateLimitForEndpoint(endpoint);
  const windowSec = getPartnerFlowRateLimitWindowSec();
  const windowMs = windowSec * 1000;
  const now = Date.now();

  const clientIp = extractClientIpForRateLimit(request);
  const clientBucketKey = hashPartnerFlowClientBucketKey({
    endpoint,
    clientIp,
    sessionSubject: options?.sessionSubject,
  });

  if (!isPartnerFlowRateLimitEnabled()) {
    return {
      allowed: true,
      limit,
      attemptsInWindow: 0,
      retryAfterSec: windowSec,
      clientBucketKey,
      backend: "disabled",
    };
  }

  const memoryResult = checkMemoryRateLimit(clientBucketKey, limit, windowMs, now);
  return {
    ...memoryResult,
    limit,
    clientBucketKey,
    backend: "memory",
  };
}

export function partnerFlowRateLimitResponse(
  result: Pick<PartnerFlowRateLimitResult, "retryAfterSec">,
): NextResponse {
  return NextResponse.json(
    { error: "Too many requests", code: "rate_limited" },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
      },
    },
  );
}

/** Test-only reset — clears in-process buckets between vitest cases. */
export function resetPartnerFlowRateLimitStoreForTests(): void {
  memoryBuckets.clear();
}

export function getPartnerFlowRateLimitBackendInfo(): {
  enabled: boolean;
  backend: "memory" | "disabled";
  distributedStoreRequired: boolean;
  distributedStoreConfigured: boolean;
  note: string;
} {
  const upstashConfigured = Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim()
    && process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );

  return {
    enabled: isPartnerFlowRateLimitEnabled(),
    backend: isPartnerFlowRateLimitEnabled() ? "memory" : "disabled",
    distributedStoreRequired: true,
    distributedStoreConfigured: upstashConfigured,
    note: upstashConfigured
      ? "Upstash env vars are set but distributed rate limiting is not wired yet; limits apply per server instance only."
      : "Rate limits use in-process memory only. Configure Upstash Redis (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN) for durable cross-instance protection on Vercel.",
  };
}
