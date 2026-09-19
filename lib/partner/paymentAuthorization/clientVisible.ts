// FILE: lib/partner/paymentAuthorization/clientVisible.ts
// Strip kit results to allow/deny, reason, payment action binding, and expiry.

import type { PartnerIntegrationOutcome } from "@/lib/partner/integrationKit/contract";
import type { PartnerKitSafeResult } from "@/lib/partner/integrationKit/client";
import type {
  PaymentAuthorizationActionBinding,
  PaymentAuthorizationActionScope,
  PaymentAuthorizationActionType,
  PaymentAuthorizationSafeReasonCode,
} from "@/lib/partner/paymentAuthorization/contract";

export interface PaymentAuthorizationClientVisibleResult {
  allowed: boolean;
  reason: PaymentAuthorizationSafeReasonCode;
  payment_action_binding: PaymentAuthorizationActionBinding;
  expires_at: string | null;
}

export function paymentReasonFromOutcome(outcome: PartnerIntegrationOutcome): PaymentAuthorizationSafeReasonCode {
  switch (outcome) {
    case "permitted":
      return "permitted";
    case "denied":
      return "policy_denied";
    case "expired":
      return "receipt_expired";
    case "revoked":
      return "receipt_revoked";
    case "wrong_partner":
      return "partner_mismatch";
    case "wrong_policy":
    case "wrong_policy_version":
    case "policy_version_missing":
    case "policy_version_unknown":
    case "policy_version_draft":
    case "policy_version_deprecated":
    case "policy_version_not_yet_effective":
    case "policy_version_not_adopted":
      return "policy_mismatch";
    case "environment_mismatch":
      return "environment_mismatch";
    case "retry":
      return "retry";
    default:
      return "invalid";
  }
}

export function deniedPaymentResult(
  reason: PaymentAuthorizationSafeReasonCode,
  actionType: PaymentAuthorizationActionType | "rejected",
  actionScope: string,
  nonceState: PaymentAuthorizationActionBinding["nonce_state"],
  expiresAt: string | null = null,
): PaymentAuthorizationClientVisibleResult {
  return {
    allowed: false,
    reason,
    payment_action_binding: {
      action_type: actionType,
      action_scope: actionScope,
      nonce_state: nonceState,
      authorization_kind: "not_a_payment",
    },
    expires_at: expiresAt,
  };
}

export function permittedPaymentResult(
  actionType: PaymentAuthorizationActionType,
  actionScope: PaymentAuthorizationActionScope,
  expiresAt: string,
): PaymentAuthorizationClientVisibleResult {
  return {
    allowed: true,
    reason: "permitted",
    payment_action_binding: {
      action_type: actionType,
      action_scope: actionScope,
      nonce_state: "consumed",
      authorization_kind: "not_a_payment",
    },
    expires_at: expiresAt,
  };
}

export function toClientVisiblePaymentResult(
  result: PartnerKitSafeResult,
  actionType: PaymentAuthorizationActionType,
  actionScope: string,
  expiresAt: string | null,
): PaymentAuthorizationClientVisibleResult {
  const allowed = result.outcome === "permitted" && result.action === "permit";
  if (allowed) {
    return {
      allowed: true,
      reason: "permitted",
      payment_action_binding: {
        action_type: actionType,
        action_scope: actionScope,
        nonce_state: "issued",
        authorization_kind: "not_a_payment",
      },
      expires_at: expiresAt,
    };
  }
  return deniedPaymentResult(
    paymentReasonFromOutcome(result.outcome),
    actionType,
    actionScope,
    "rejected",
    expiresAt,
  );
}

export function assertNoSensitivePaymentClientKeys(payload: unknown): string[] {
  const leaks: string[] = [];
  const blob = JSON.stringify(payload ?? null).toLowerCase();
  const needles = [
    "receipt_id",
    "dr_",
    "signature",
    "wallet_address",
    "email",
    "legal_name",
    "date_of_birth",
    "claim_ref",
    "evaluated_claim",
    "jwt",
    "id_token",
    "card_number",
    "payment_method",
    "transfer_id",
    "charge_id",
    "subscription_id",
    "provider_payload",
  ];
  for (const needle of needles) {
    if (blob.includes(needle)) leaks.push(needle);
  }
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(blob)) leaks.push("email_like");
  return leaks;
}
