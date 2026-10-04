// FILE: lib/partner/twoAppEvaluation/callbackContinuation.ts
// Holder callback continuation hints for two-app evaluation — display only, never authorization.

import { PARTNER_INTEGRATION_FORBIDDEN_CALLBACK_KEYS } from "@/lib/partner/integrationKit/contract";

export const TWO_APP_EVAL_CALLBACK_SESSION_KEY = "abx_two_app_eval_id" as const;

export type TwoAppEvalHolderOutcome = "approved" | "denied" | "pending_review" | "unknown";

export interface TwoAppEvalCallbackDisplayHints {
  receipt_id: string | null;
  status: string | null;
  decision: string | null;
  partner_id: string | null;
  policy_id: string | null;
  decision_id: string | null;
  receipt_expires_at: string | null;
}

export interface TwoAppEvalCallbackContinuationView {
  hints: TwoAppEvalCallbackDisplayHints;
  holder_outcome: TwoAppEvalHolderOutcome;
  forbidden_detected: boolean;
  callback_trusted: false;
  server_verification_required: true;
  notice: string;
}

function normalizeSearch(
  search: URLSearchParams | Record<string, string | string[] | undefined>,
): URLSearchParams {
  if (search instanceof URLSearchParams) return search;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, value);
    }
  }
  return params;
}

function detectForbiddenCallbackKeys(params: URLSearchParams): boolean {
  for (const key of Array.from(params.keys())) {
    const lower = key.toLowerCase();
    if (PARTNER_INTEGRATION_FORBIDDEN_CALLBACK_KEYS.some((forbidden) => lower.includes(forbidden))) {
      return true;
    }
  }
  return false;
}

function inferHolderOutcome(params: URLSearchParams): TwoAppEvalHolderOutcome {
  const status = params.get("status")?.trim().toLowerCase() ?? "";
  const decision = params.get("decision")?.trim().toLowerCase() ?? "";
  if (status === "denied" || decision === "denied") return "denied";
  if (status === "pending_review" || decision === "manual_review") return "pending_review";
  if (status === "approved" || decision === "approved") return "approved";
  if (params.get("receipt_id")?.trim()) return "approved";
  return "unknown";
}

export function buildTwoAppEvalCallbackContinuationView(
  search: URLSearchParams | Record<string, string | string[] | undefined>,
): TwoAppEvalCallbackContinuationView {
  const params = normalizeSearch(search);
  const forbidden_detected = detectForbiddenCallbackKeys(params);
  const holder_outcome = inferHolderOutcome(params);

  return {
    hints: {
      receipt_id: params.get("receipt_id")?.trim() || null,
      status: params.get("status")?.trim() || null,
      decision: params.get("decision")?.trim() || null,
      partner_id: params.get("partner_id")?.trim() || null,
      policy_id: params.get("policy_id")?.trim() || null,
      decision_id: params.get("decision_id")?.trim() || null,
      receipt_expires_at: params.get("receipt_expires_at")?.trim() || null,
    },
    holder_outcome,
    forbidden_detected,
    callback_trusted: false,
    server_verification_required: true,
    notice:
      "Callback query parameters are not authorization. Your relying application must verify the signed public receipt and narrow result server-side before granting access.",
  };
}

export function twoAppEvalJourneyHref(evaluationId: string | null): string {
  if (!evaluationId) return "/evaluation/two-app";
  return `/evaluation/two-app?id=${encodeURIComponent(evaluationId)}`;
}
