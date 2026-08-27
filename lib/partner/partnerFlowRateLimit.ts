// FILE: lib/partner/partnerFlowRateLimit.ts
// Configurable Partner Flow rate limits — privacy-preserving client identity, no raw IPs in audit metadata.

import { createHmac } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  checkPartnerFlowUpstashRateLimit,
  getPartnerFlowUpstashConfigState,
  isPartnerFlowUpstashConfigured,
  probePartnerFlowUpstashHealth,
  resetPartnerFlowUpstashStoreForTests,
} from "@/lib/partner/partnerFlowUpstashStore";

export const PARTNER_FLOW_RATE_LIMIT_ENDPOINTS = [
  "/api/v1/partner-flow/evaluate",
  "/api/v1/partner-flow/complete",
  "/api/v1/partner-flow/refresh",
  "/api/receipts/public",
  "/api/v1/verification-requests/consent",
] as const;

export type PartnerFlowRateLimitEndpoint = (typeof PARTNER_FLOW_RATE_LIMIT_ENDPOINTS)[number];

export type PartnerFlowRateLimitBackend =
  | "memory"
  | "upstash"
  | "disabled"
  | "identity_unavailable"
  | "distributed_unavailable"
  | "distributed_config_incomplete";

export interface PartnerFlowRateLimitResult {
  allowed: boolean;
  limit: number;
  attemptsInWindow: number;
  retryAfterSec: number;
  backend: PartnerFlowRateLimitBackend;
}

const RATE_LIMIT_NAMESPACE = "abraxas-partner-flow-rate-v1";
const DEFAULT_WINDOW_SEC = 60;
const MIN_SECRET_LENGTH = 16;

/** Documented weak literals — never accepted as HMAC secrets. */
export const PARTNER_FLOW_RATE_LIMIT_FORBIDDEN_SECRETS = [
  "abraxas-pilot",
  "abraxas-partner-flow-pilot",
] as const;

const SECRET_CANDIDATES = [
  "PARTNER_FLOW_RATE_LIMIT_SALT",
  "ABRAXAS_BROWSER_SESSION_SECRET",
  "ABRAXAS_SIGNING_KEY",
] as const;

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

const IP_BASED_ENDPOINTS = new Set<PartnerFlowRateLimitEndpoint>([
  "/api/receipts/public",
]);

/** Shared bucket when no trustworthy client IP exists (not client-spoofable). */
const UNTRUSTED_PROXY_IDENTITY = "untrusted-proxy:shared";

type MemoryBucket = { timestamps: number[] };

const memoryBuckets = new Map<string, MemoryBucket>();
let misconfigWarningLogged = false;

export function isPartnerFlowProductionRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

export function isPartnerFlowRateLimitEnabled(): boolean {
  const raw = process.env.PARTNER_FLOW_RATE_LIMIT_ENABLED?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return true;
}

export function isStrongPartnerFlowRateLimitSecret(value: string | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length < MIN_SECRET_LENGTH) return false;
  if ((PARTNER_FLOW_RATE_LIMIT_FORBIDDEN_SECRETS as readonly string[]).includes(trimmed)) {
    return false;
  }
  return true;
}

export function resolvePartnerFlowRateLimitSecret(): {
  configured: boolean;
  secret: string | null;
  source: (typeof SECRET_CANDIDATES)[number] | null;
} {
  for (const envKey of SECRET_CANDIDATES) {
    const value = process.env[envKey];
    if (isStrongPartnerFlowRateLimitSecret(value)) {
      return { configured: true, secret: value!.trim(), source: envKey };
    }
  }
  return { configured: false, secret: null, source: null };
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

export type TrustedClientIpSource =
  | "vercel-x-real-ip"
  | "vercel-x-vercel-forwarded-for"
  | "untrusted-proxy-shared";

export interface TrustedClientIpResult {
  identityMaterial: string;
  source: TrustedClientIpSource;
  /** Always false — raw IP is never returned to callers. */
  exposesRawIp: false;
}

/**
 * Trusted client IP for rate-limit identity only.
 * On Vercel: uses platform-controlled x-real-ip / x-vercel-forwarded-for (never x-forwarded-for).
 * Elsewhere: returns a shared non-spoofable fallback (all clients share one bucket).
 */
export function resolveTrustedClientIpIdentity(request: NextRequest): TrustedClientIpResult {
  if (process.env.VERCEL === "1") {
    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) {
      return {
        identityMaterial: `vercel-ip:${realIp}`,
        source: "vercel-x-real-ip",
        exposesRawIp: false,
      };
    }

    const vercelForwarded = request.headers.get("x-vercel-forwarded-for")?.trim();
    if (vercelForwarded) {
      const clientIp = vercelForwarded.split(",")[0]?.trim();
      if (clientIp) {
        return {
          identityMaterial: `vercel-ip:${clientIp}`,
          source: "vercel-x-vercel-forwarded-for",
          exposesRawIp: false,
        };
      }
    }
  }

  return {
    identityMaterial: UNTRUSTED_PROXY_IDENTITY,
    source: "untrusted-proxy-shared",
    exposesRawIp: false,
  };
}

/**
 * Privacy-preserving rate-limit bucket key.
 * Requires an explicit strong server secret — never uses public literals.
 */
/** Privacy-preserving HMAC bucket key for any rate-limit namespace. */
export function hashRateLimitBucketKey(input: {
  namespace: string;
  routeKey: string;
  identityMaterial: string;
  secret: string;
}): string {
  return createHmac("sha256", input.secret)
    .update(`${input.namespace}:${input.routeKey}:${input.identityMaterial}`, "utf8")
    .digest("hex")
    .slice(0, 32);
}

export function hashPartnerFlowClientBucketKey(input: {
  endpoint: PartnerFlowRateLimitEndpoint;
  identityMaterial: string;
  secret: string;
}): string {
  return hashRateLimitBucketKey({
    namespace: RATE_LIMIT_NAMESPACE,
    routeKey: input.endpoint,
    identityMaterial: input.identityMaterial,
    secret: input.secret,
  });
}

function warnRateLimitMisconfigured(): void {
  if (misconfigWarningLogged) return;
  misconfigWarningLogged = true;
  console.error(JSON.stringify({
    type: "abraxas_partner_flow_rate_limit_misconfigured",
    severity: "critical",
    message: "Partner Flow rate limiting disabled: configure a strong server secret",
    accepted_env: [...SECRET_CANDIDATES],
  }));
}

function resetMisconfigWarningForTests(): void {
  misconfigWarningLogged = false;
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

function buildIdentityMaterial(
  request: NextRequest,
  endpoint: PartnerFlowRateLimitEndpoint,
  sessionSubject?: string | null,
): { material: string; requiresSecret: boolean } {
  const subject = sessionSubject?.trim();
  if (subject) {
    return { material: `session:${subject}`, requiresSecret: true };
  }

  if (IP_BASED_ENDPOINTS.has(endpoint)) {
    const trusted = resolveTrustedClientIpIdentity(request);
    return { material: trusted.identityMaterial, requiresSecret: true };
  }

  const trusted = resolveTrustedClientIpIdentity(request);
  return { material: trusted.identityMaterial, requiresSecret: true };
}

export async function checkPartnerFlowRateLimit(
  request: NextRequest,
  endpoint: PartnerFlowRateLimitEndpoint,
  options?: { sessionSubject?: string | null },
): Promise<PartnerFlowRateLimitResult> {
  const limit = getPartnerFlowRateLimitForEndpoint(endpoint);
  const windowSec = getPartnerFlowRateLimitWindowSec();
  const windowMs = windowSec * 1000;
  const now = Date.now();

  if (!isPartnerFlowRateLimitEnabled()) {
    return {
      allowed: true,
      limit,
      attemptsInWindow: 0,
      retryAfterSec: windowSec,
      backend: "disabled",
    };
  }

  const secretResolution = resolvePartnerFlowRateLimitSecret();
  const { material } = buildIdentityMaterial(request, endpoint, options?.sessionSubject);
  const isIpBased = !options?.sessionSubject?.trim() && IP_BASED_ENDPOINTS.has(endpoint);
  const upstashConfigState = getPartnerFlowUpstashConfigState();
  const upstashConfigured = upstashConfigState === "complete";

  if (!secretResolution.configured || !secretResolution.secret) {
    if (isPartnerFlowProductionRuntime()) {
      if (isIpBased) {
        return {
          allowed: false,
          limit,
          attemptsInWindow: 0,
          retryAfterSec: windowSec,
          backend: "identity_unavailable",
        };
      }

      warnRateLimitMisconfigured();
      return {
        allowed: true,
        limit,
        attemptsInWindow: 0,
        retryAfterSec: windowSec,
        backend: "disabled",
      };
    }

    return {
      allowed: true,
      limit,
      attemptsInWindow: 0,
      retryAfterSec: windowSec,
      backend: "disabled",
    };
  }

  const bucketKey = hashPartnerFlowClientBucketKey({
    endpoint,
    identityMaterial: material,
    secret: secretResolution.secret,
  });

  if (upstashConfigState === "incomplete") {
    return {
      allowed: false,
      limit,
      attemptsInWindow: 0,
      retryAfterSec: windowSec,
      backend: "distributed_config_incomplete",
    };
  }

  if (upstashConfigured) {
    try {
      const upstashResult = await checkPartnerFlowUpstashRateLimit({
        bucketKey,
        endpoint,
        limit,
        windowSec,
      });
      return {
        ...upstashResult,
        limit,
        backend: "upstash",
      };
    } catch {
      return {
        allowed: false,
        limit,
        attemptsInWindow: 0,
        retryAfterSec: windowSec,
        backend: "distributed_unavailable",
      };
    }
  }

  const memoryResult = checkMemoryRateLimit(bucketKey, limit, windowMs, now);
  return {
    ...memoryResult,
    limit,
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

export function partnerFlowRateLimitConfigIncompleteResponse(): NextResponse {
  return NextResponse.json(
    { error: "Service temporarily unavailable", code: "rate_limit_store_config_incomplete" },
    { status: 503 },
  );
}

export function partnerFlowRateLimitDistributedUnavailableResponse(): NextResponse {
  return NextResponse.json(
    { error: "Service temporarily unavailable", code: "rate_limit_store_unavailable" },
    { status: 503 },
  );
}

export function partnerFlowRateLimitIdentityUnavailableResponse(): NextResponse {
  return NextResponse.json(
    { error: "Service temporarily unavailable" },
    { status: 503 },
  );
}

/** Test-only reset — clears in-process buckets between vitest cases. */
export function resetPartnerFlowRateLimitStoreForTests(): void {
  memoryBuckets.clear();
  resetMisconfigWarningForTests();
  resetPartnerFlowUpstashStoreForTests();
}

export interface PartnerFlowRateLimitBackendInfo {
  enabled: boolean;
  backend: PartnerFlowRateLimitBackend | "memory" | "upstash";
  hmacSecretConfigured: boolean;
  trustedIpStrategy: string;
  distributedStoreRequired: boolean;
  distributedStoreConfigured: boolean;
  distributedStoreConfigIncomplete: boolean;
  distributedStoreActive: boolean;
  distributedStoreReachable: boolean | null;
  distributedStoreErrorCode: string | null;
  note: string;
}

export async function getPartnerFlowRateLimitBackendInfo(): Promise<PartnerFlowRateLimitBackendInfo> {
  const upstashConfigState = getPartnerFlowUpstashConfigState();
  const upstashConfigured = upstashConfigState === "complete";
  const upstashConfigIncomplete = upstashConfigState === "incomplete";
  const upstashHealth = await probePartnerFlowUpstashHealth();
  const secret = resolvePartnerFlowRateLimitSecret();
  const enabled = isPartnerFlowRateLimitEnabled();

  const distributedStoreActive = upstashConfigured
    && upstashHealth.reachable === true
    && enabled
    && secret.configured;

  let backend: PartnerFlowRateLimitBackendInfo["backend"] = enabled ? "memory" : "disabled";
  if (!enabled) {
    backend = "disabled";
  } else if (upstashConfigIncomplete) {
    backend = "distributed_config_incomplete";
  } else if (distributedStoreActive) {
    backend = "upstash";
  } else if (upstashConfigured && upstashHealth.reachable === false) {
    backend = "distributed_unavailable";
  } else {
    backend = "memory";
  }

  let note = "Rate limits use in-process memory only (basic per-instance protection). "
    + "Configure Upstash Redis (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN) for network-wide protection on Vercel.";

  if (upstashConfigIncomplete) {
    note = "Upstash Redis configuration is incomplete (only one of UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN is set). "
      + "Partner Flow rate-limited routes fail closed until both are set or both are removed.";
  } else if (distributedStoreActive) {
    note = "Network-wide protection active via Upstash Redis. Limits are shared across all Vercel instances.";
  } else if (upstashConfigured && upstashHealth.reachable === false) {
    note = `Upstash Redis is configured but unreachable (${upstashHealth.errorCode ?? "unknown"}). `
      + "Public receipt requests fail closed until connectivity is restored. Limits are not silently downgraded.";
  }

  if (enabled && !secret.configured && isPartnerFlowProductionRuntime()) {
    note = "CRITICAL: No strong HMAC secret configured. Public receipt rate limiting fails closed; other endpoints are not rate limited.";
  }

  return {
    enabled,
    backend,
    hmacSecretConfigured: secret.configured,
    trustedIpStrategy: process.env.VERCEL === "1"
      ? "vercel-x-real-ip"
      : "untrusted-proxy-shared-fallback",
    distributedStoreRequired: true,
    distributedStoreConfigured: upstashConfigured,
    distributedStoreConfigIncomplete: upstashConfigIncomplete,
    distributedStoreActive,
    distributedStoreReachable: upstashHealth.reachable,
    distributedStoreErrorCode: upstashHealth.errorCode,
    note,
  };
}
