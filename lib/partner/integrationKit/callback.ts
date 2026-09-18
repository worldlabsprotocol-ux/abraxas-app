// FILE: lib/partner/integrationKit/callback.ts
// Parse Partner Flow / Launchpad callbacks. Query params are never authorization.

import {
  PARTNER_INTEGRATION_CALLBACK_KEYS,
  PARTNER_INTEGRATION_FORBIDDEN_CALLBACK_KEYS,
} from "@/lib/partner/integrationKit/contract";

const ALLOWED = new Set<string>(PARTNER_INTEGRATION_CALLBACK_KEYS);

export interface ParsedPartnerCallback {
  receipt_id: string | null;
  decision: string | null;
  status: string | null;
  decision_id: string | null;
  policy_id: string | null;
  partner_id: string | null;
}

export function parsePartnerCallbackParams(
  search: URLSearchParams | Record<string, string | string[] | undefined>,
): { ok: true; params: ParsedPartnerCallback } | { ok: false; errors: string[] } {
  const params = search instanceof URLSearchParams
    ? search
    : new URLSearchParams(
        Object.entries(search).flatMap(([key, value]) => {
          if (value == null) return [];
          return Array.isArray(value) ? value.map((item) => [key, item] as [string, string]) : [[key, value]];
        }),
      );

  const errors: string[] = [];
  for (const key of Array.from(params.keys())) {
    const lower = key.toLowerCase();
    if (PARTNER_INTEGRATION_FORBIDDEN_CALLBACK_KEYS.some((forbidden) => lower.includes(forbidden))) {
      errors.push(`pii_in_callback:${key}`);
    }
    if (!ALLOWED.has(key)) {
      errors.push(`unknown_callback_param:${key}`);
    }
  }

  const receiptId = params.get("receipt_id")?.trim() || null;
  if (!receiptId) errors.push("receipt_id_missing");

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    params: {
      receipt_id: receiptId,
      decision: params.get("decision"),
      status: params.get("status"),
      decision_id: params.get("decision_id"),
      policy_id: params.get("policy_id"),
      partner_id: params.get("partner_id"),
    },
  };
}
