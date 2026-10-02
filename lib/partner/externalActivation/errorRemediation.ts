// FILE: lib/partner/externalActivation/errorRemediation.ts
// Developer-facing remediation for stable Verify-with-Abraxas error categories.

import type { UniversalIntegrationErrorCategory } from "@/lib/partner/integrationKit/verificationRequest";

export interface DeveloperErrorRemediation {
  category: UniversalIntegrationErrorCategory | "api_key_required" | "application_id_required" | "request_state_store_required";
  meaning: string;
  likely_cause: string;
  developer_action: string;
}

const REMEDIATION: Record<string, DeveloperErrorRemediation> = {
  invalid_request: {
    category: "invalid_request",
    meaning: "The verification request was rejected before a holder could start.",
    likely_cause: "Missing or invalid return URL, credentials, binding, or required policy fields such as expectedContentHash.",
    developer_action: "Check ABRAXAS_CALLBACK_URL, ABRAXAS_SANDBOX_API_KEY, ABRAXAS_APP_ID, and any policy-specific fields in your server init.",
  },
  expired_request: {
    category: "expired_request",
    meaning: "The verification request expired before the holder finished.",
    likely_cause: "The holder took too long or your server reused an old request_id.",
    developer_action: "Create a fresh createVerificationRequest(), persist the new request_id, and redirect again.",
  },
  invalid_callback: {
    category: "invalid_callback",
    meaning: "The callback could not be trusted or did not match your pending request.",
    likely_cause: "Tampered query params, missing receipt_id, or expectedRequestId not loaded from durable partner storage.",
    developer_action: "Load request_id from your durable store, call verifyCallbackWithNarrowResult with expectedRequestId, and reject unsigned query keys.",
  },
  receipt_invalid: {
    category: "receipt_invalid",
    meaning: "The receipt failed signature, audience, or validity checks.",
    likely_cause: "Wrong receipt_id, stale copy, or verification attempted without server-side PartnerKit.",
    developer_action: "Re-fetch GET /api/receipts/{id}/public on your server and verify with AbraxasPartnerKit before resuming.",
  },
  receipt_expired: {
    category: "receipt_expired",
    meaning: "The receipt existed but is no longer currently valid.",
    likely_cause: "Session TTL elapsed or an old receipt was reused.",
    developer_action: "Start a new verification request; do not treat an expired receipt as authorization.",
  },
  receipt_revoked: {
    category: "receipt_revoked",
    meaning: "The receipt was revoked and cannot grant access.",
    likely_cause: "Supersession, operator revocation, or policy refresh.",
    developer_action: "Require a fresh holder verification before the protected action.",
  },
  policy_mismatch: {
    category: "policy_mismatch",
    meaning: "The receipt policy does not match your configured binding.",
    likely_cause: "Wrong ABRAXAS_POLICY_ID or policyVersion drift.",
    developer_action: "Pin policyId and requirePolicyVersion to your Launchpad binding and regenerate env from Integration Studio.",
  },
  application_mismatch: {
    category: "application_mismatch",
    meaning: "The receipt partner or application context does not match your server config.",
    likely_cause: "Mixed sandbox apps or copied credentials from another tenant.",
    developer_action: "Use one sandbox application's partner_id, application_id, and API key together.",
  },
  result_denied: {
    category: "result_denied",
    meaning: "Verification completed but the narrow result was not approved.",
    likely_cause: "Holder did not meet the policy or sandbox proof prerequisites.",
    developer_action: "Show a safe denial to the user and do not resume the protected action.",
  },
  rate_limited: {
    category: "rate_limited",
    meaning: "Abraxas temporarily rejected additional requests.",
    likely_cause: "Too many create or verify calls in a short window.",
    developer_action: "Backoff and retry; avoid creating duplicate requests during the same user action.",
  },
  temporarily_unavailable: {
    category: "temporarily_unavailable",
    meaning: "Abraxas could not complete the request right now.",
    likely_cause: "Transient platform or network failure.",
    developer_action: "Retry with the same idempotency key where supported; surface a retry affordance to users.",
  },
  api_key_required: {
    category: "api_key_required",
    meaning: "Hosted handoff requires a sandbox server API key.",
    likely_cause: "ABRAXAS_SANDBOX_API_KEY missing from server environment.",
    developer_action: "Copy the one-time sandbox key from Integration Studio into a server-only env var. Never expose it in client code.",
  },
  application_id_required: {
    category: "application_id_required",
    meaning: "Hosted handoff requires your sandbox application id.",
    likely_cause: "ABRAXAS_APP_ID missing from server init.",
    developer_action: "Copy application_id from Integration Studio or Launchpad into server env.",
  },
  request_state_store_required: {
    category: "request_state_store_required",
    meaning: "Redirect mode requires durable partner storage for req_* correlation.",
    likely_cause: "Using legacy redirect mode without a PartnerRequestStateStore.",
    developer_action: "Prefer hosted_handoff (default) or provide durable request_id persistence across instances.",
  },
};

export function developerErrorRemediation(category: string): DeveloperErrorRemediation {
  return REMEDIATION[category] ?? {
    category: "invalid_request",
    meaning: "Verification failed.",
    likely_cause: "See server-side PartnerKit errors.",
    developer_action: "Log PartnerKit errors server-side and compare against the Verify with Abraxas quickstart.",
  };
}

export function listDeveloperErrorRemediation(): DeveloperErrorRemediation[] {
  return Object.values(REMEDIATION);
}
