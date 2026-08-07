// FILE: examples/partner-access-nextjs-starter/lib/callbackParams.ts
// Accept only frozen Partner Flow callback parameters — no PII in URLs.

import { PARTNER_CALLBACK_PARAMS } from "@/lib/protocol/compatibility";

export const FROZEN_CALLBACK_PARAM_SET = new Set<string>(PARTNER_CALLBACK_PARAMS);

/** Keys that must never appear in callback URLs (manifest + common PII). */
export const FORBIDDEN_CALLBACK_KEYS = [
  "email",
  "wallet",
  "wallet_address",
  "address",
  "jwt",
  "token",
  "id_token",
  "access_token",
  "selfie",
  "document",
  "date_of_birth",
  "phone",
  "ssn",
  "identity",
] as const;

export interface ParsedCallbackParams {
  status: string | null;
  decision_id: string | null;
  receipt_id: string | null;
  receipt_expires_at: string | null;
  credential_id: string | null;
  policy_id: string | null;
  partner_id: string | null;
}

export interface CallbackParamValidationResult {
  ok: boolean;
  params: ParsedCallbackParams | null;
  errors: string[];
}

function parseFrozenParams(searchParams: URLSearchParams): ParsedCallbackParams {
  return {
    status: searchParams.get("status"),
    decision_id: searchParams.get("decision_id"),
    receipt_id: searchParams.get("receipt_id"),
    receipt_expires_at: searchParams.get("receipt_expires_at"),
    credential_id: searchParams.get("credential_id"),
    policy_id: searchParams.get("policy_id"),
    partner_id: searchParams.get("partner_id"),
  };
}

export function validateCallbackSearchParams(
  searchParams: URLSearchParams,
): CallbackParamValidationResult {
  const errors: string[] = [];

  for (const key of Array.from(searchParams.keys())) {
    const lower = key.toLowerCase();
    if (FORBIDDEN_CALLBACK_KEYS.some((forbidden) => lower.includes(forbidden))) {
      errors.push(`forbidden_callback_param:${key}`);
    }
    if (!FROZEN_CALLBACK_PARAM_SET.has(key)) {
      errors.push(`unknown_callback_param:${key}`);
    }
  }

  const params = parseFrozenParams(searchParams);

  if (!params.receipt_id?.trim()) {
    errors.push("receipt_id_missing");
  }

  if (errors.length > 0) {
    return { ok: false, params: null, errors };
  }

  return { ok: true, params, errors: [] };
}

export function callbackParamsForAudit(params: ParsedCallbackParams): Record<string, string> {
  return {
    receipt_id: params.receipt_id ?? "",
    partner_id: params.partner_id ?? "",
    policy_id: params.policy_id ?? "",
    status: params.status ?? "",
  };
}
