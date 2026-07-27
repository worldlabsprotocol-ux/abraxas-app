// FILE: lib/idv/biometric/captureGuard.ts
// Production guards: rate limiting, structured audit logs, retention policy constants.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BiometricDecision } from "./types";

/** Max capture submissions per wallet per rolling hour (production default). */
export function getCaptureRateLimitPerHour(): number {
  const raw = process.env.ABRAXAS_CAPTURE_RATE_LIMIT_PER_HOUR;
  if (!raw) return 5;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

const RATE_WINDOW_MS = 60 * 60 * 1000;

/** Document images retained after credential issuance (days). Purge via ops cron. */
export const BIOMETRIC_DOCUMENT_RETENTION_DAYS = Number.parseInt(
  process.env.ABRAXAS_BIOMETRIC_DOC_RETENTION_DAYS ?? "90",
  10,
) || 90;

/** Assessment score rows retained for audit (days). */
export const BIOMETRIC_ASSESSMENT_RETENTION_DAYS = Number.parseInt(
  process.env.ABRAXAS_BIOMETRIC_ASSESSMENT_RETENTION_DAYS ?? "365",
  10,
) || 365;

export interface CaptureRateLimitResult {
  allowed: boolean;
  attemptsInWindow: number;
  limit: number;
  retryAfterSec?: number;
}

export async function checkCaptureRateLimit(
  supabase: SupabaseClient,
  suiAddress: string,
): Promise<CaptureRateLimitResult> {
  const limit = getCaptureRateLimitPerHour();
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();

  const { count, error } = await supabase
    .from("identity_biometric_assessments")
    .select("id", { count: "exact", head: true })
    .eq("sui_address", suiAddress)
    .gte("analyzed_at", since);

  if (error) {
    // Table missing pre-migration — allow but log; ops should run 037
    logCaptureAudit({
      event: "rate_limit_check_skipped",
      sui_address: suiAddress,
      reason: error.message,
    });
    return { allowed: true, attemptsInWindow: 0, limit };
  }

  const attemptsInWindow = count ?? 0;
  if (attemptsInWindow >= limit) {
    return {
      allowed: false,
      attemptsInWindow,
      limit,
      retryAfterSec: 3600,
    };
  }

  return { allowed: true, attemptsInWindow, limit };
}

export type CaptureAuditEvent =
  | "capture_started"
  | "capture_rejected_engine"
  | "capture_queued_review"
  | "capture_auto_approved"
  | "capture_rate_limited"
  | "capture_error"
  | "rate_limit_check_skipped";

export function logCaptureAudit(payload: {
  event: CaptureAuditEvent;
  sui_address?: string;
  capture_session_id?: string;
  decision?: BiometricDecision;
  engine_version?: string;
  reason?: string;
  scores?: { face_match: number; liveness: number };
}): void {
  console.log(JSON.stringify({
    type: "abraxas_biometric_capture",
    ts: new Date().toISOString(),
    ...payload,
  }));
}
