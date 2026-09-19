// FILE: lib/partner/solana/fixtures.ts
// Local receipt fixtures for the Solana reference gate. No live issuance. No funds.

import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";

export const SOLANA_REF_PARTNER_ID = "partner-solana-ref";
export const SOLANA_REF_POLICY_ID = "partner-solana-ref-age_21_retail-v1";

export type SolanaFixtureId =
  | "approved"
  | "denied"
  | "expired"
  | "revoked"
  | "cross_partner"
  | "altered_policy"
  | "sandbox_only";

const BASE: PartnerFlowPublicReceipt & { policy_version?: number } = {
  receipt_id: "dr_solana_fixture",
  schema_version: "1.0.0",
  partner_id: SOLANA_REF_PARTNER_ID,
  policy_id: SOLANA_REF_POLICY_ID,
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

export function solanaFixtureReceipt(id: SolanaFixtureId): PartnerFlowPublicReceipt {
  switch (id) {
    case "approved":
      return { ...BASE };
    case "denied":
      return { ...BASE, receipt_id: "dr_solana_denied", decision_result: "denied" };
    case "expired":
      return {
        ...BASE,
        receipt_id: "dr_solana_expired",
        expires_at: "2020-01-01T00:00:00.000Z",
        status: "expired",
        currently_valid: false,
      };
    case "revoked":
      return { ...BASE, receipt_id: "dr_solana_revoked", status: "revoked", currently_valid: false };
    case "cross_partner":
      return { ...BASE, receipt_id: "dr_solana_cross", partner_id: "partner-other" };
    case "altered_policy":
      return { ...BASE, receipt_id: "dr_solana_policy", policy_id: "other-policy-v1" };
    case "sandbox_only":
      return { ...BASE, receipt_id: "dr_solana_sandbox" };
    default: {
      const _never: never = id;
      return _never;
    }
  }
}

export function isSolanaFixtureId(value: string): value is SolanaFixtureId {
  return (
    value === "approved" ||
    value === "denied" ||
    value === "expired" ||
    value === "revoked" ||
    value === "cross_partner" ||
    value === "altered_policy" ||
    value === "sandbox_only"
  );
}
