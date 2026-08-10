// FILE: lib/demo/partnerSandboxDemoViews.ts
// Explicit allowlists for admin demo responses — no PII, secrets, or raw claims.

import type { PublicReceiptLiveTrustView } from "@/lib/decisionReceipts/publicReceiptLiveTrust";

export const DEMO_PASSPORT_STATUS_FIELDS = [
  "label",
  "credential_status",
  "required_claim_types_present",
  "required_claim_types_missing",
  "sandbox_only",
] as const;

export const DEMO_PUBLIC_RECEIPT_FIELDS = [
  "decision_result",
  "policy_id",
  "receipt_id",
  "evaluated_at",
  "expires_at",
  "signature_valid",
  "currently_valid",
  "invalidation_reasons",
] as const;

export type DemoPassportStatusView = {
  label: string;
  credential_status: string;
  required_claim_types_present: string[];
  required_claim_types_missing: string[];
  sandbox_only: true;
};

export type DemoPublicReceiptView = Pick<
  PublicReceiptLiveTrustView,
  | "decision_result"
  | "policy_id"
  | "receipt_id"
  | "evaluated_at"
  | "expires_at"
  | "signature_valid"
  | "currently_valid"
  | "invalidation_reasons"
>;

const REQUIRED_SANDBOX_CLAIM_TYPES = [
  "identity_verified",
  "wallet_binding_confirmed",
  "screening_outcome",
] as const;

export function buildDemoPassportStatusView(input: {
  credentialStatus: string;
  activeClaimTypes: string[];
}): DemoPassportStatusView {
  const present = REQUIRED_SANDBOX_CLAIM_TYPES.filter((ct) => input.activeClaimTypes.includes(ct));
  const missing = REQUIRED_SANDBOX_CLAIM_TYPES.filter((ct) => !input.activeClaimTypes.includes(ct));

  return {
    label: "Synthetic sandbox holder (pre-provisioned for demonstration)",
    credential_status: input.credentialStatus,
    required_claim_types_present: [...present],
    required_claim_types_missing: [...missing],
    sandbox_only: true,
  };
}

export function toDemoPublicReceiptView(view: PublicReceiptLiveTrustView): DemoPublicReceiptView {
  return {
    decision_result: view.decision_result,
    policy_id: view.policy_id,
    receipt_id: view.receipt_id,
    evaluated_at: view.evaluated_at,
    expires_at: view.expires_at,
    signature_valid: view.signature_valid,
    currently_valid: view.currently_valid ?? false,
    invalidation_reasons: view.invalidation_reasons ?? [],
  };
}

export function demoViewHasNoForbiddenKeys(payload: Record<string, unknown>): boolean {
  const text = JSON.stringify(payload).toLowerCase();
  const forbiddenKeyPatterns = [
    '"subject_id"',
    '"subject_pseudonym_id"',
    '"subject_pseudonym"',
    '"sui_address"',
    '"wallet_address"',
    '"wallet_binding_ref"',
    '"email"',
    '"date_of_birth"',
    '"legal_name"',
    '"document"',
    '"selfie"',
    '"biometric"',
    '"api_key"',
    '"secret"',
    '"claims_json"',
    '"credential_jwt"',
    '"signature"',
    '"payload_hash"',
  ];
  return !forbiddenKeyPatterns.some((pattern) => text.includes(pattern));
}

const FORBIDDEN_OPERATIONAL_CLAIM_PATTERNS = [
  "webhook_enqueued",
  "webhook_delivered",
  "metering_recorded",
  "delivery_success",
  '"webhook"',
  '"metering"',
  '"enqueued"',
  '"delivered"',
  '"event_id"',
  "webhook_payload",
  "x-webhook-secret",
  "api_key",
  "endpoint_url",
] as const;

export function demoResponseHasNoOperationalClaims(payload: unknown): boolean {
  const text = JSON.stringify(payload).toLowerCase();
  return !FORBIDDEN_OPERATIONAL_CLAIM_PATTERNS.some((pattern) => text.includes(pattern));
}

export const DEMO_COMPLETION_NEUTRAL_OPS_NOTE =
  "Operational metering and notification hooks run through the existing Partner Flow infrastructure. Delivery evidence is not displayed in this Phase 1 demonstration.";
