// FILE: lib/idv/biometric/captureGuard.ts
// Production guards: rate limiting, structured audit logs, retention policy constants.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BiometricDecision } from "./types";
import { normalizeHolderSubjectKey } from "@/lib/idv/holderIdentityRef";
import { idvReviewSessionAnchor } from "@/lib/idv/holderSubjectIdv";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { countBiometricAssessmentsInWindowDirect } from "@/lib/persistence/idvDirectStore";

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

export type CaptureRateLimitUnavailableReason = "storage_unavailable";

export interface CaptureRateLimitResult {
  allowed: boolean;
  /** True when enforcement could not be evaluated — callers must fail closed (503). */
  unavailable?: boolean;
  unavailableReason?: CaptureRateLimitUnavailableReason;
  attemptsInWindow: number;
  limit: number;
  retryAfterSec?: number;
}

export async function checkCaptureRateLimit(
  supabase: SupabaseClient | null,
  holderSubjectKey: string,
): Promise<CaptureRateLimitResult> {
  const limit = getCaptureRateLimitPerHour();
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  if (persistenceUsesDirectPostgres()) {
    try {
      const attemptsInWindow = await countBiometricAssessmentsInWindowDirect(holderSubjectKey, since);
      if (attemptsInWindow >= limit) {
        return { allowed: false, attemptsInWindow, limit, retryAfterSec: 3600 };
      }
      return { allowed: true, attemptsInWindow, limit };
    } catch {
      logCaptureAudit({
        event: "rate_limit_enforcement_unavailable",
        holder_subject: holderSubjectAuditRef(holderSubjectKey),
        reason: "storage_unavailable",
      });
      return {
        allowed: false,
        unavailable: true,
        unavailableReason: "storage_unavailable",
        attemptsInWindow: 0,
        limit,
        retryAfterSec: 120,
      };
    }
  }
  if (!supabase) {
    return {
      allowed: false,
      unavailable: true,
      unavailableReason: "storage_unavailable",
      attemptsInWindow: 0,
      limit,
      retryAfterSec: 120,
    };
  }
  const anchor = idvReviewSessionAnchor(normalizeHolderSubjectKey(holderSubjectKey));

  let countQuery = supabase
    .from("identity_biometric_assessments")
    .select("id", { count: "exact", head: true });

  countQuery = anchor.holder_subject_id
    ? countQuery.eq("holder_subject_id", anchor.holder_subject_id)
    : countQuery.eq("sui_address", anchor.sui_address ?? holderSubjectKey);

  const { count, error } = await countQuery.gte("analyzed_at", since);

  if (error) {
    logCaptureAudit({
      event: "rate_limit_enforcement_unavailable",
      holder_subject: holderSubjectAuditRef(holderSubjectKey),
      reason: "storage_unavailable",
    });
    return {
      allowed: false,
      unavailable: true,
      unavailableReason: "storage_unavailable",
      attemptsInWindow: 0,
      limit,
      retryAfterSec: 120,
    };
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
  | "rate_limit_enforcement_unavailable";

function holderSubjectAuditRef(subjectKey: string): string {
  const key = normalizeHolderSubjectKey(subjectKey);
  if (key.startsWith("abx_hs_")) return `${key.slice(0, 12)}…`;
  return `${key.slice(0, 8)}…`;
}

export function logCaptureAudit(payload: {
  event: CaptureAuditEvent;
  sui_address?: string;
  holder_subject?: string;
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
