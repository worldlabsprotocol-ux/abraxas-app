// FILE: lib/partner/partnerSandboxCallback.ts
// Launchpad / acceptance sandbox callback display — never authorization from query params.

import { PARTNER_INTEGRATION_FORBIDDEN_CALLBACK_KEYS } from "@/lib/partner/integrationKit/contract";
import { parsePartnerCallbackParams } from "@/lib/partner/integrationKit/callback";
import {
  isPartnerFlowReceiptOutcome,
  type PartnerFlowReceiptOutcome,
} from "@/lib/partner/partnerFlowReceiptOutcome";

export const PARTNER_SANDBOX_CALLBACK_PATH = "/partner/callback" as const;

export type PartnerSandboxHolderOutcome = "approved" | "denied" | "pending_review" | "invalid_callback" | "unknown";

export interface PartnerSandboxCallbackHints {
  receipt_id: string | null;
  status: string | null;
  decision: string | null;
  partner_id: string | null;
  policy_id: string | null;
  decision_id: string | null;
  receipt_expires_at: string | null;
  receipt_outcome: PartnerFlowReceiptOutcome | null;
}

export interface PartnerSandboxCallbackView {
  hints: PartnerSandboxCallbackHints;
  holder_outcome: PartnerSandboxHolderOutcome;
  forbidden_detected: boolean;
  parse_errors: string[];
  callback_trusted: false;
  server_verification_required: true;
  headline: string;
  body: string;
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

function inferHolderOutcome(params: URLSearchParams, parseOk: boolean): PartnerSandboxHolderOutcome {
  if (!parseOk) return "invalid_callback";
  const status = params.get("status")?.trim().toLowerCase() ?? "";
  const decision = params.get("decision")?.trim().toLowerCase() ?? "";
  if (status === "denied" || decision === "denied") return "denied";
  if (status === "pending_review" || decision === "manual_review") return "pending_review";
  if (status === "approved" || decision === "approved") return "approved";
  if (params.get("receipt_id")?.trim()) return "approved";
  return "unknown";
}

export function buildPartnerSandboxCallbackView(
  search: URLSearchParams | Record<string, string | string[] | undefined>,
): PartnerSandboxCallbackView {
  const params = normalizeSearch(search);
  const forbidden_detected = detectForbiddenCallbackKeys(params);
  const parsed = parsePartnerCallbackParams(params);
  const parseOk = parsed.ok;
  const holder_outcome = inferHolderOutcome(params, parseOk);

  const hints: PartnerSandboxCallbackHints = {
    receipt_id: params.get("receipt_id")?.trim() || null,
    status: params.get("status")?.trim() || null,
    decision: params.get("decision")?.trim() || null,
    partner_id: params.get("partner_id")?.trim() || null,
    policy_id: params.get("policy_id")?.trim() || null,
    decision_id: params.get("decision_id")?.trim() || null,
    receipt_expires_at: params.get("receipt_expires_at")?.trim() || null,
    receipt_outcome: (() => {
      const raw = params.get("receipt_outcome")?.trim();
      return isPartnerFlowReceiptOutcome(raw) ? raw : null;
    })(),
  };

  let headline = "Returned from verification";
  let body = "This page confirms that Abraxas redirected you back to the application callback. Your server must verify the signed result before granting access.";

  if (forbidden_detected) {
    headline = "Callback could not be trusted";
    body = "Unexpected sensitive fields appeared in the callback URL. Do not log query strings. Verify using your server and the public receipt API only.";
  } else if (holder_outcome === "approved") {
    headline = "Wallet control verified";
    body = "Your verification is complete. The requesting application can verify the approved wallet-control result on its server before continuing.";
  } else if (holder_outcome === "denied") {
    headline = "Verification not approved";
    body = "Abraxas did not share an approved result with this application. You can close this page or return to the application for next steps.";
  } else if (holder_outcome === "pending_review") {
    headline = "Verification pending review";
    body = "This result is not final yet. The application should wait for an updated outcome before granting access.";
  } else if (holder_outcome === "invalid_callback") {
    headline = "Callback incomplete";
    body = "Required callback fields were missing or invalid. The application should not treat this URL as proof of verification.";
  }

  return {
    hints,
    holder_outcome,
    forbidden_detected,
    parse_errors: parseOk ? [] : parsed.errors,
    callback_trusted: false,
    server_verification_required: true,
    headline,
    body,
  };
}

export function isKnownInternalPartnerReturnPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized === PARTNER_SANDBOX_CALLBACK_PATH;
}
