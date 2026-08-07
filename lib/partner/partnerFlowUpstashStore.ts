// FILE: lib/partner/partnerFlowUpstashStore.ts
// Upstash Redis-backed Partner Flow rate limits — HMAC bucket keys only, no raw identifiers.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { PartnerFlowRateLimitEndpoint } from "@/lib/partner/partnerFlowRateLimit";

export const PARTNER_FLOW_UPSTASH_PREFIX = "abraxas-partner-flow-rate-v1";

export interface UpstashRateLimitCheckResult {
  allowed: boolean;
  attemptsInWindow: number;
  retryAfterSec: number;
}

export interface UpstashHealthProbe {
  configured: boolean;
  configState: PartnerFlowUpstashConfigState;
  reachable: boolean | null;
  errorCode: string | null;
}

export type PartnerFlowUpstashConfigState = "none" | "complete" | "incomplete";

let redisClient: Redis | null = null;
const limiterCache = new Map<string, Ratelimit>();

export function getPartnerFlowUpstashConfigState(
  env: Record<string, string | undefined> = process.env,
): PartnerFlowUpstashConfigState {
  const hasUrl = Boolean(env.UPSTASH_REDIS_REST_URL?.trim());
  const hasToken = Boolean(env.UPSTASH_REDIS_REST_TOKEN?.trim());
  if (hasUrl && hasToken) return "complete";
  if (hasUrl || hasToken) return "incomplete";
  return "none";
}

export function isPartnerFlowUpstashConfigIncomplete(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return getPartnerFlowUpstashConfigState(env) === "incomplete";
}

export function isPartnerFlowUpstashConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return getPartnerFlowUpstashConfigState(env) === "complete";
}

export function getPartnerFlowUpstashRedis(
  env: Record<string, string | undefined> = process.env,
): Redis | null {
  if (!isPartnerFlowUpstashConfigured(env)) return null;
  if (!redisClient) {
    redisClient = new Redis({
      url: env.UPSTASH_REDIS_REST_URL!.trim(),
      token: env.UPSTASH_REDIS_REST_TOKEN!.trim(),
    });
  }
  return redisClient;
}

function limiterCacheKey(
  endpoint: PartnerFlowRateLimitEndpoint,
  limit: number,
  windowSec: number,
): string {
  return `${endpoint}:${limit}:${windowSec}`;
}

function getRatelimiter(
  endpoint: PartnerFlowRateLimitEndpoint,
  limit: number,
  windowSec: number,
  env: Record<string, string | undefined> = process.env,
): Ratelimit {
  const cacheKey = limiterCacheKey(endpoint, limit, windowSec);
  const cached = limiterCache.get(cacheKey);
  if (cached) return cached;

  const redis = getPartnerFlowUpstashRedis(env);
  if (!redis) {
    throw new Error("partner_flow_upstash_not_configured");
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    prefix: PARTNER_FLOW_UPSTASH_PREFIX,
    analytics: false,
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

export async function checkPartnerFlowUpstashRateLimit(input: {
  bucketKey: string;
  endpoint: PartnerFlowRateLimitEndpoint;
  limit: number;
  windowSec: number;
  env?: Record<string, string | undefined>;
}): Promise<UpstashRateLimitCheckResult> {
  const ratelimit = getRatelimiter(
    input.endpoint,
    input.limit,
    input.windowSec,
    input.env,
  );
  const { success, limit, remaining, reset } = await ratelimit.limit(input.bucketKey);
  const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  const attemptsInWindow = success ? limit - remaining : limit;

  return {
    allowed: success,
    attemptsInWindow,
    retryAfterSec,
  };
}

export async function probePartnerFlowUpstashHealth(
  env: Record<string, string | undefined> = process.env,
): Promise<UpstashHealthProbe> {
  const configState = getPartnerFlowUpstashConfigState(env);

  if (configState === "none") {
    return { configured: false, configState, reachable: null, errorCode: null };
  }

  if (configState === "incomplete") {
    return {
      configured: false,
      configState,
      reachable: false,
      errorCode: "config_incomplete",
    };
  }

  try {
    const redis = getPartnerFlowUpstashRedis(env);
    if (!redis) {
      return { configured: true, configState, reachable: false, errorCode: "client_init_failed" };
    }
    const pong = await redis.ping();
    if (pong !== "PONG") {
      return { configured: true, configState, reachable: false, errorCode: "ping_failed" };
    }
    return { configured: true, configState, reachable: true, errorCode: null };
  } catch {
    return { configured: true, configState, reachable: false, errorCode: "unreachable" };
  }
}

/** Test-only reset — clears cached clients between vitest cases. */
export function resetPartnerFlowUpstashStoreForTests(): void {
  redisClient = null;
  limiterCache.clear();
}
