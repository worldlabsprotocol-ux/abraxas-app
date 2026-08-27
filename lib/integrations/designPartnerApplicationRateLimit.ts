// FILE: lib/integrations/designPartnerApplicationRateLimit.ts
// Design-partner apply intake rate limits — separate namespace from Partner Flow telemetry.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getPartnerFlowUpstashConfigState,
  checkUpstashRateLimitWithPrefix,
  resetPartnerFlowUpstashStoreForTests,
} from "@/lib/partner/partnerFlowUpstashStore";
import {
  hashRateLimitBucketKey,
  isPartnerFlowProductionRuntime,
  isPartnerFlowRateLimitEnabled,
  resolvePartnerFlowRateLimitSecret,
  resolveTrustedClientIpIdentity,
} from "@/lib/partner/partnerFlowRateLimit";

export const DESIGN_PARTNER_APPLY_RATE_LIMIT_NAMESPACE = "abraxas-design-partner-apply-rate-v1";
export const DESIGN_PARTNER_APPLY_UPSTASH_PREFIX = "abraxas-design-partner-apply-rate-v1";
export const DESIGN_PARTNER_APPLY_ROUTE_KEY = "/api/integrations/apply";

const DEFAULT_WINDOW_SEC = 3600;
const DEFAULT_LIMIT = 5;

type MemoryBucket = { timestamps: number[] };
const memoryBuckets = new Map<string, MemoryBucket>();

export interface DesignPartnerApplyRateLimitResult {
  allowed: boolean;
  limit: number;
  retryAfterSec: number;
  backend: "upstash" | "memory" | "disabled" | "distributed_config_incomplete" | "distributed_unavailable" | "identity_unavailable";
}

export function getDesignPartnerApplyRateLimitWindowSec(): number {
  const raw = process.env.DESIGN_PARTNER_APPLY_RATE_LIMIT_WINDOW_SEC
    ?? process.env.PARTNER_FLOW_RATE_LIMIT_WINDOW_SEC;
  if (!raw) return DEFAULT_WINDOW_SEC;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WINDOW_SEC;
}

export function getDesignPartnerApplyRateLimit(): number {
  const raw = process.env.DESIGN_PARTNER_APPLY_RATE_LIMIT;
  if (!raw) return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_LIMIT;
}

function pruneWindow(timestamps: number[], windowMs: number, now: number): number[] {
  const cutoff = now - windowMs;
  return timestamps.filter((ts) => ts >= cutoff);
}

function checkMemoryRateLimit(
  bucketKey: string,
  limit: number,
  windowMs: number,
  now: number,
): Pick<DesignPartnerApplyRateLimitResult, "allowed" | "retryAfterSec"> {
  const bucket = memoryBuckets.get(bucketKey) ?? { timestamps: [] };
  const pruned = pruneWindow(bucket.timestamps, windowMs, now);

  if (pruned.length >= limit) {
    const oldest = pruned[0] ?? now;
    memoryBuckets.set(bucketKey, { timestamps: pruned });
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  pruned.push(now);
  memoryBuckets.set(bucketKey, { timestamps: pruned });
  return {
    allowed: true,
    retryAfterSec: Math.ceil(windowMs / 1000),
  };
}

export function hashDesignPartnerApplyBucketKey(input: {
  identityMaterial: string;
  secret: string;
}): string {
  return hashRateLimitBucketKey({
    namespace: DESIGN_PARTNER_APPLY_RATE_LIMIT_NAMESPACE,
    routeKey: DESIGN_PARTNER_APPLY_ROUTE_KEY,
    identityMaterial: input.identityMaterial,
    secret: input.secret,
  });
}

export async function checkDesignPartnerApplyRateLimit(
  request: NextRequest,
): Promise<DesignPartnerApplyRateLimitResult> {
  const limit = getDesignPartnerApplyRateLimit();
  const windowSec = getDesignPartnerApplyRateLimitWindowSec();
  const windowMs = windowSec * 1000;
  const now = Date.now();

  if (!isPartnerFlowRateLimitEnabled()) {
    return { allowed: true, limit, retryAfterSec: windowSec, backend: "disabled" };
  }

  const secretResolution = resolvePartnerFlowRateLimitSecret();
  const upstashState = getPartnerFlowUpstashConfigState();
  const production = isPartnerFlowProductionRuntime();

  if (production) {
    if (!secretResolution.configured || !secretResolution.secret) {
      return { allowed: false, limit, retryAfterSec: windowSec, backend: "identity_unavailable" };
    }
    if (upstashState === "incomplete") {
      return { allowed: false, limit, retryAfterSec: windowSec, backend: "distributed_config_incomplete" };
    }
    if (upstashState !== "complete") {
      return { allowed: false, limit, retryAfterSec: windowSec, backend: "distributed_unavailable" };
    }
  }

  if (!secretResolution.configured || !secretResolution.secret) {
    return { allowed: true, limit, retryAfterSec: windowSec, backend: "disabled" };
  }

  const trusted = resolveTrustedClientIpIdentity(request);
  const bucketKey = hashDesignPartnerApplyBucketKey({
    identityMaterial: trusted.identityMaterial,
    secret: secretResolution.secret,
  });

  if (upstashState === "complete") {
    try {
      const upstash = await checkUpstashRateLimitWithPrefix({
        prefix: DESIGN_PARTNER_APPLY_UPSTASH_PREFIX,
        bucketKey,
        limit,
        windowSec,
      });
      return {
        allowed: upstash.allowed,
        limit,
        retryAfterSec: upstash.retryAfterSec,
        backend: "upstash",
      };
    } catch {
      if (production) {
        return { allowed: false, limit, retryAfterSec: windowSec, backend: "distributed_unavailable" };
      }
    }
  }

  if (production) {
    return { allowed: false, limit, retryAfterSec: windowSec, backend: "distributed_unavailable" };
  }

  const memory = checkMemoryRateLimit(bucketKey, limit, windowMs, now);
  return { ...memory, limit, backend: "memory" };
}

export function designPartnerApplyRateLimitResponse(
  result: Pick<DesignPartnerApplyRateLimitResult, "retryAfterSec">,
): NextResponse {
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSec) },
    },
  );
}

export function designPartnerApplyRateLimitUnavailableResponse(): NextResponse {
  return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
}

export function resetDesignPartnerApplyRateLimitStoreForTests(): void {
  memoryBuckets.clear();
  resetPartnerFlowUpstashStoreForTests();
}
