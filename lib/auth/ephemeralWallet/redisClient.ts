// FILE: lib/auth/ephemeralWallet/redisClient.ts

import { Redis } from "@upstash/redis";

export type EphemeralRedisConfigState = "none" | "complete" | "incomplete";

let cached: Redis | null = null;

export function getEphemeralRedisConfigState(
  env: Record<string, string | undefined> = process.env,
): EphemeralRedisConfigState {
  const hasUrl = Boolean(env.UPSTASH_REDIS_REST_URL?.trim());
  const hasToken = Boolean(env.UPSTASH_REDIS_REST_TOKEN?.trim());
  if (hasUrl && hasToken) return "complete";
  if (hasUrl || hasToken) return "incomplete";
  return "none";
}

export function isEphemeralRedisConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return getEphemeralRedisConfigState(env) === "complete";
}

export function getEphemeralRedis(
  env: Record<string, string | undefined> = process.env,
): Redis | null {
  if (!isEphemeralRedisConfigured(env)) return null;
  if (!cached) {
    cached = new Redis({
      url: env.UPSTASH_REDIS_REST_URL!.trim(),
      token: env.UPSTASH_REDIS_REST_TOKEN!.trim(),
    });
  }
  return cached;
}

export function resetEphemeralRedisClientForTests(): void {
  cached = null;
}
