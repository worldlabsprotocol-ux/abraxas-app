// FILE: lib/partner/evm/fixtures.ts
// Local receipt fixtures for the EVM preflight. No live issuance. No RPC.

import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";

export const EVM_REF_PARTNER_ID = "partner-evm-ref";
export const EVM_REF_POLICY_ID = "partner-evm-ref-age_21_retail-v1";

export type EvmFixtureId =
  | "approved"
  | "denied"
  | "expired"
  | "revoked"
  | "cross_partner"
  | "altered_policy"
  | "sandbox_only";

const BASE: PartnerFlowPublicReceipt & { policy_version?: number } = {
  receipt_id: "dr_evm_fixture",
  schema_version: "1.0.0",
  partner_id: EVM_REF_PARTNER_ID,
  policy_id: EVM_REF_POLICY_ID,
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

export function evmFixtureReceipt(id: EvmFixtureId): PartnerFlowPublicReceipt {
  switch (id) {
    case "approved":
      return { ...BASE };
    case "denied":
      return { ...BASE, receipt_id: "dr_evm_denied", decision_result: "denied" };
    case "expired":
      return {
        ...BASE,
        receipt_id: "dr_evm_expired",
        expires_at: "2020-01-01T00:00:00.000Z",
        status: "expired",
        currently_valid: false,
      };
    case "revoked":
      return { ...BASE, receipt_id: "dr_evm_revoked", status: "revoked", currently_valid: false };
    case "cross_partner":
      return { ...BASE, receipt_id: "dr_evm_cross", partner_id: "partner-other" };
    case "altered_policy":
      return { ...BASE, receipt_id: "dr_evm_policy", policy_id: "other-policy-v1" };
    case "sandbox_only":
      return { ...BASE, receipt_id: "dr_evm_sandbox" };
    default: {
      const _never: never = id;
      return _never;
    }
  }
}

export function isEvmFixtureId(value: string): value is EvmFixtureId {
  return (
    value === "approved"
    || value === "denied"
    || value === "expired"
    || value === "revoked"
    || value === "cross_partner"
    || value === "altered_policy"
    || value === "sandbox_only"
  );
}
