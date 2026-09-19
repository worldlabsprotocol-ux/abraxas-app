// FILE: lib/partner/paymentAuthorization/fixtures.ts
// Local receipt fixtures for payment preflight. No live issuance. No payments.

import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";

export const PAYMENT_REF_PARTNER_ID = "partner-payment-ref";
export const PAYMENT_REF_POLICY_ID = "partner-payment-ref-age_21_retail-v1";

export type PaymentFixtureId =
  | "approved"
  | "denied"
  | "expired"
  | "revoked"
  | "cross_partner"
  | "altered_policy";

const BASE: PartnerFlowPublicReceipt & { policy_version?: number } = {
  receipt_id: "dr_payment_fixture",
  schema_version: "1.0.0",
  partner_id: PAYMENT_REF_PARTNER_ID,
  policy_id: PAYMENT_REF_POLICY_ID,
  policy_version: 1,
  decision_result: "approved",
  signature_valid: true,
  expires_at: "2099-01-01T00:00:00.000Z",
  status: "active",
  production_usable: false,
  decision_context: "sandbox_only",
  currently_valid: true,
  invalidation_reasons: [],
  artifact_type: "eligibility_decision_receipt",
};

export function paymentFixtureReceipt(id: PaymentFixtureId): PartnerFlowPublicReceipt {
  switch (id) {
    case "approved":
      return { ...BASE };
    case "denied":
      return { ...BASE, receipt_id: "dr_payment_denied", decision_result: "denied" };
    case "expired":
      return {
        ...BASE,
        receipt_id: "dr_payment_expired",
        expires_at: "2020-01-01T00:00:00.000Z",
        status: "expired",
        currently_valid: false,
      };
    case "revoked":
      return { ...BASE, receipt_id: "dr_payment_revoked", status: "revoked", currently_valid: false };
    case "cross_partner":
      return { ...BASE, receipt_id: "dr_payment_cross", partner_id: "partner-other" };
    case "altered_policy":
      return { ...BASE, receipt_id: "dr_payment_policy", policy_id: "other-policy-v1" };
    default: {
      const _never: never = id;
      return _never;
    }
  }
}

export function isPaymentFixtureId(value: string): value is PaymentFixtureId {
  return (
    value === "approved"
    || value === "denied"
    || value === "expired"
    || value === "revoked"
    || value === "cross_partner"
    || value === "altered_policy"
  );
}
