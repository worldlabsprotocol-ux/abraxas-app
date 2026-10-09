// FILE: lib/partner/goodTroublePurchaseReturnDiagnostics.ts
// Privacy-safe purchase return diagnostics — no verifier, pepper, secrets, or full URLs.

import { extractGoodTroubleFlowToken } from "@/lib/partner/continuationReturnUrlMatch";

export type GoodTroublePurchaseReturnStage =
  | "flow_created"
  | "escrow_persisted"
  | "ownership_cookie_written"
  | "callback_received"
  | "ownership_proof_available"
  | "escrow_recovered"
  | "pkce_verified"
  | "receipt_verified"
  | "return_completed"
  | "continuation_loaded"
  | "gtv_binding_cookie_read"
  | "return_url_upgraded"
  | "return_url_bare"
  | "return_failed";

export type GoodTroublePurchaseReturnDiagnostic = {
  stage: GoodTroublePurchaseReturnStage;
  code: string;
  verify_request_id?: string;
  correlation_id?: string;
  has_stored_gtv?: boolean;
  has_hint_gtv?: boolean;
  has_binding_cookie?: boolean;
};

export function buildPurchaseReturnDiagnostic(input: {
  stage: GoodTroublePurchaseReturnStage;
  code: string;
  verifyRequestId?: string;
  correlationId?: string;
  storedReturnUrl?: string;
  mergedHint?: string;
  bindingCookiePresent?: boolean;
}): GoodTroublePurchaseReturnDiagnostic {
  return {
    stage: input.stage,
    code: input.code,
    verify_request_id: input.verifyRequestId?.trim() || undefined,
    correlation_id: input.correlationId?.trim() || undefined,
    has_stored_gtv: input.storedReturnUrl
      ? Boolean(extractGoodTroubleFlowToken(input.storedReturnUrl))
      : undefined,
    has_hint_gtv: input.mergedHint
      ? Boolean(extractGoodTroubleFlowToken(input.mergedHint))
      : undefined,
    has_binding_cookie: input.bindingCookiePresent,
  };
}

export function logGoodTroublePurchaseReturnDiagnostic(
  diagnostic: GoodTroublePurchaseReturnDiagnostic,
): void {
  if (process.env.NODE_ENV === "test") return;
  console.info(JSON.stringify({
    kind: "good_trouble_purchase_return",
    ...diagnostic,
  }));
}
