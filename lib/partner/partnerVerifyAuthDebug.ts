// FILE: lib/partner/partnerVerifyAuthDebug.ts
// Partner verify auth diagnostics — no tokens, PII, return_url, gtv, or wallet addresses.

import { sanitizeAuthDebugPayload } from "@/lib/sui/zklogin/authDebug";

export type PartnerVerifyAuthEvent =
  | "auth_start"
  | "oauth_callback_received"
  | "zklogin_complete"
  | "browser_session_ready"
  | "partner_resume_restored"
  | "partner_evaluate_started"
  | "partner_evaluate_result";

export type PartnerVerifyAuthPayload = {
  phase?: string;
  outcome?: string;
  correlationId?: string;
  detail?: string;
  errorCode?: string;
};

const PREFIX = "[abraxas-partner-auth]";

const ALLOWED_PAYLOAD_KEYS = new Set<keyof PartnerVerifyAuthPayload>([
  "phase",
  "outcome",
  "correlationId",
  "detail",
  "errorCode",
]);

const ALLOWED_OUTCOMES = new Set([
  "enter",
  "passport",
  "pending_review",
  "denied",
  "auth_required",
  "browser_session_missing",
  "error",
]);

const ALLOWED_PHASES = new Set([
  "loading",
  "sign_in",
  "signing_in",
  "preparing",
  "verifying",
  "returning",
  "pending_review",
  "denied",
  "error",
  "invalid_link",
]);

const ALLOWED_ERROR_CODES = new Set([
  "401",
  "403",
  "browser_session",
  "evaluate_failed",
  "callback_failed",
]);

const CORRELATION_ID_PATTERN = /^pv_[a-f0-9]{6,16}$/i;

export function createPartnerVerifyCorrelationId(): string {
  const bytes = typeof crypto !== "undefined" && crypto.getRandomValues
    ? crypto.getRandomValues(new Uint8Array(4))
    : null;
  const suffix = bytes
    ? Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
    : Math.random().toString(16).slice(2, 10);
  return `pv_${suffix}`;
}

export function sanitizePartnerVerifyAuthPayload(
  payload: Record<string, unknown> = {},
): PartnerVerifyAuthPayload {
  const shared = sanitizeAuthDebugPayload(payload);
  const safe: PartnerVerifyAuthPayload = {};

  if (shared.correlationId && CORRELATION_ID_PATTERN.test(shared.correlationId)) {
    safe.correlationId = shared.correlationId;
  }

  for (const [rawKey, rawValue] of Object.entries(payload)) {
    if (!ALLOWED_PAYLOAD_KEYS.has(rawKey as keyof PartnerVerifyAuthPayload)) continue;

    if (rawKey === "phase" && typeof rawValue === "string" && ALLOWED_PHASES.has(rawValue)) {
      safe.phase = rawValue;
      continue;
    }

    if (rawKey === "outcome" && typeof rawValue === "string" && ALLOWED_OUTCOMES.has(rawValue)) {
      safe.outcome = rawValue;
      continue;
    }

    if (rawKey === "errorCode" && typeof rawValue === "string" && ALLOWED_ERROR_CODES.has(rawValue)) {
      safe.errorCode = rawValue;
    }
  }

  return safe;
}

export function logPartnerVerifyAuthEvent(
  event: PartnerVerifyAuthEvent,
  payload: PartnerVerifyAuthPayload = {},
): void {
  if (typeof window === "undefined") return;
  const enabled =
    process.env.NODE_ENV !== "production"
    || process.env.NEXT_PUBLIC_ABRAXAS_AUTH_DEBUG === "1";
  if (!enabled) return;
  const safe = sanitizePartnerVerifyAuthPayload(payload as Record<string, unknown>);
  console.info(PREFIX, event, safe);
}
