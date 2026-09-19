// FILE: lib/partner/paymentAuthorization/contract.ts
// Payment Authorization Adapter. Policy and receipt layer only. Not a processor.

import { PARTNER_INTEGRATION_GOOGLE_BOUNDARY } from "@/lib/partner/integrationKit/contract";
import { PARTNER_EVENT_NOT_AUTHORIZATION } from "@/lib/partner/eventDelivery/contract";
export const PAYMENT_AUTHORIZATION_ADAPTER_VERSION = "1.0.0" as const;

export const PAYMENT_AUTHORIZATION_ACTION_TYPES = [
  "authorize_checkout",
  "authorize_recurring_payment",
] as const;
export type PaymentAuthorizationActionType = (typeof PAYMENT_AUTHORIZATION_ACTION_TYPES)[number];

export const PAYMENT_AUTHORIZATION_CHECKOUT_SCOPE = "sandbox:checkout" as const;
export const PAYMENT_AUTHORIZATION_RECURRING_SCOPE = "sandbox:recurring_payment" as const;
export const PAYMENT_AUTHORIZATION_ALLOWED_SCOPES = [
  PAYMENT_AUTHORIZATION_CHECKOUT_SCOPE,
  PAYMENT_AUTHORIZATION_RECURRING_SCOPE,
] as const;
export type PaymentAuthorizationActionScope = (typeof PAYMENT_AUTHORIZATION_ALLOWED_SCOPES)[number];

export const PAYMENT_AUTHORIZATION_TYPE_SCOPES: Record<
  PaymentAuthorizationActionType,
  PaymentAuthorizationActionScope
> = {
  authorize_checkout: PAYMENT_AUTHORIZATION_CHECKOUT_SCOPE,
  authorize_recurring_payment: PAYMENT_AUTHORIZATION_RECURRING_SCOPE,
};

export const PAYMENT_AUTHORIZATION_SAFE_REASON_CODES = [
  "permitted",
  "policy_denied",
  "receipt_expired",
  "receipt_revoked",
  "partner_mismatch",
  "policy_mismatch",
  "environment_mismatch",
  "action_mismatch",
  "action_expired",
  "replayed",
  "store_unavailable",
  "invalid",
  "retry",
] as const;
export type PaymentAuthorizationSafeReasonCode = (typeof PAYMENT_AUTHORIZATION_SAFE_REASON_CODES)[number];

export const PAYMENT_AUTHORIZATION_CLIENT_VISIBLE_KEYS = [
  "allowed",
  "reason",
  "payment_action_binding",
  "expires_at",
] as const;

export const PAYMENT_AUTHORIZATION_FORBIDDEN_CLIENT_KEYS = [
  "receipt",
  "receipt_id",
  "signature",
  "signature_valid",
  "wallet",
  "wallet_address",
  "email",
  "legal_name",
  "date_of_birth",
  "dob",
  "profile",
  "claims",
  "evaluated_claim_refs",
  "jwt",
  "id_token",
  "card",
  "pan",
  "cvv",
  "iban",
  "payment_method",
  "payment_details",
  "charge_id",
  "transfer_id",
  "subscription_id",
  "amount",
  "currency",
  "provider_payload",
] as const;

export const PAYMENT_AUTHORIZATION_NOT_A_PROCESSOR =
  "Abraxas is the private policy and receipt layer for commerce. It is not a payment processor, card vault, custodian, stablecoin issuer, merchant of record, checkout provider, or subscription billing platform.";

export const PAYMENT_AUTHORIZATION_NO_FUNDS_BOUNDARY =
  "An approved authorization is not a payment, transfer, charge, subscription, or settlement. The merchant or payment partner executes its own payment flow. Abraxas never moves funds.";

export const PAYMENT_AUTHORIZATION_CIRCLE_SEPARATION =
  "Circle Arc testnet settlement stays a separate review → confirm → submit flow and requires confirm_testnet_transfer. This adapter never calls Circle or creates a transfer.";

export const PAYMENT_AUTHORIZATION_PRIVACY_CONTRACT = [
  PARTNER_INTEGRATION_GOOGLE_BOUNDARY,
  PARTNER_EVENT_NOT_AUTHORIZATION,
  PAYMENT_AUTHORIZATION_NO_FUNDS_BOUNDARY,
  "Partners receive only allow or deny, a safe reason code, payment action binding, and expiry.",
  "Browser responses must not include receipts, signatures, claims, PII, wallet data, payment details, or provider payloads.",
] as const;

export const PAYMENT_AUTHORIZATION_VERIFICATION_REUSE =
  "Receipt verification is AbraxasPartnerKit plus GET /api/receipts/{id}/public. This adapter does not implement a second verifier.";

export const PAYMENT_AUTHORIZATION_FLOW =
  "Policy pack → hosted Partner Flow → minimum approved receipt → payment preflight → merchant payment flow → lifecycle or webhook re-check. A webhook body is never a payment grant.";

export interface PaymentAuthorizationActionContract {
  partner_id: string;
  policy_id: string;
  policy_version: number;
  action_type: PaymentAuthorizationActionType;
  action_scope: PaymentAuthorizationActionScope;
  expires_at: string;
  nonce: string;
}

export interface PaymentAuthorizationActionBinding {
  action_type: PaymentAuthorizationActionType | "rejected";
  action_scope: string;
  nonce_state: "issued" | "consumed" | "replayed" | "rejected";
  authorization_kind: "not_a_payment";
}

export const PAYMENT_AUTHORIZATION_LIVE_INTEGRATION_REQUIREMENTS = [
  "The merchant or payment partner remains the execution system. Abraxas only answers a preflight for one named payment action.",
  "An allowed result is authorization to start the partner's own checkout or recurring billing flow. It is not a charge, capture, transfer, or settlement.",
  "Production access stays on the reviewed Launchpad upgrade path. No self-serve live payment credentials from this adapter.",
  "Pin partner_id, policy_id, and policy_version. Fail closed on draft, deprecated, missing, or mismatched versions.",
  "Issue a server-authoritative action contract (type, narrow scope, expiry, one-time nonce) before each authorization.",
  "Verify the current public receipt on the server. Do not trust callbacks, webhooks, or client flags.",
  "Consume the durable nonce on the first permitted preflight. Replay the same nonce as deny.",
  "Re-check expiry, revocation, policy version, partner binding, payment scope, and nonce replay before later grants.",
  "Return only allow or deny, a safe reason, payment action binding, and expiry. Never return receipt or payment material.",
  "Do not vault cards, store PANs, call Circle, create transfers, or move funds from Abraxas.",
  "Keep Circle Arc testnet settlement on the explicit confirm_testnet_transfer path. Do not fold it into this adapter.",
  "Integrate a live payment partner only after a written commerce agreement, production review, and named processor contract.",
] as const;
