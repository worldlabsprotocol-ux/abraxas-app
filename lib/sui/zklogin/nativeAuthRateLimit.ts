// FILE: lib/sui/zklogin/nativeAuthRateLimit.ts
// Durable rate limits for native auth bridge endpoints (serverless-safe).

import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

const TABLE = "zklogin_native_auth_rate_limit";
const WINDOW_SEC = 60;

const memoryBuckets = new Map<string, { count: number; windowStartMs: number }>();

function skipDurableStore(): boolean {
  if (process.env.NATIVE_AUTH_RATE_LIMIT_FORCE_DURABLE_TEST === "1") return false;
  return Boolean(process.env.VITEST);
}

function isProductionRuntime(): boolean {
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.ABRAXAS_RUNTIME_ENV === "production") return true;
  if (process.env.VERCEL === "1") return false;
  return process.env.NODE_ENV === "production";
}

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
}

function bucketHash(endpoint: string, ip: string): string {
  return createHash("sha256").update(`native_auth_rate:${endpoint}:${ip}`, "utf8").digest("hex");
}

export type NativeAuthRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

export async function checkNativeAuthRateLimit(
  req: NextRequest,
  endpoint: "login-state" | "handoff-prepare" | "handoff-consume",
  limit: number,
): Promise<NativeAuthRateLimitResult> {
  const hash = bucketHash(endpoint, clientIp(req));
  const nowMs = Date.now();
  const windowStartIso = new Date(nowMs - (nowMs % (WINDOW_SEC * 1000))).toISOString();
  const expiresAtIso = new Date(nowMs + WINDOW_SEC * 2 * 1000).toISOString();

  if (skipDurableStore()) {
    const row = memoryBuckets.get(hash);
    if (!row || nowMs - row.windowStartMs >= WINDOW_SEC * 1000) {
      memoryBuckets.set(hash, { count: 1, windowStartMs: nowMs });
      return { allowed: true };
    }
    row.count += 1;
    if (row.count > limit) {
      return { allowed: false, retryAfterSec: WINDOW_SEC };
    }
    return { allowed: true };
  }

  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from(TABLE)
      .select("request_count, window_start")
      .eq("bucket_hash", hash)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const { error: insertError } = await sb.from(TABLE).insert({
        bucket_hash: hash,
        window_start: windowStartIso,
        request_count: 1,
        expires_at: expiresAtIso,
      });
      if (insertError) throw insertError;
      return { allowed: true };
    }

    const windowStartMs = new Date(String(data.window_start)).getTime();
    if (nowMs - windowStartMs >= WINDOW_SEC * 1000) {
      const { error: resetError } = await sb.from(TABLE).update({
        window_start: windowStartIso,
        request_count: 1,
        expires_at: expiresAtIso,
      }).eq("bucket_hash", hash);
      if (resetError) throw resetError;
      return { allowed: true };
    }

    const nextCount = Number(data.request_count) + 1;
    if (nextCount > limit) {
      return { allowed: false, retryAfterSec: WINDOW_SEC };
    }

    const { error: updateError } = await sb.from(TABLE).update({
      request_count: nextCount,
      expires_at: expiresAtIso,
    }).eq("bucket_hash", hash);
    if (updateError) throw updateError;
    return { allowed: true };
  } catch {
    if (isProductionRuntime()) {
      return { allowed: false, retryAfterSec: WINDOW_SEC };
    }
    return { allowed: true };
  }
}

export function resetNativeAuthRateLimitForTests(): void {
  memoryBuckets.clear();
}
