// FILE: lib/partner/partnerActivitySignal/fixtures.ts
// Local receipt fixtures for activity-signal preflight. No live issuance.

import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";

export const ACTIVITY_REF_PARTNER_ID = "partner-activity-ref";
export const ACTIVITY_REF_POLICY_ID = "partner-activity-ref-age_21_retail-v1";
export const ACTIVITY_FIXTURE_PAYLOAD_HASH =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

export type ActivityFixtureId = "approved" | "denied" | "expired" | "revoked";

const BASE: PartnerFlowPublicReceipt & { policy_version?: number; payload_hash?: string } = {
  receipt_id: "dr_activity_fixture",
  schema_version: "1.0.0",
  partner_id: ACTIVITY_REF_PARTNER_ID,
  policy_id: ACTIVITY_REF_POLICY_ID,
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
  payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
};

export function activityFixtureReceipt(id: ActivityFixtureId): PartnerFlowPublicReceipt {
  switch (id) {
    case "approved":
      return { ...BASE };
    case "denied":
      return { ...BASE, receipt_id: "dr_activity_denied", decision_result: "denied" };
    case "expired":
      return {
        ...BASE,
        receipt_id: "dr_activity_expired",
        expires_at: "2020-01-01T00:00:00.000Z",
        status: "expired",
        currently_valid: false,
      };
    case "revoked":
      return { ...BASE, receipt_id: "dr_activity_revoked", status: "revoked", currently_valid: false };
    default: {
      const _never: never = id;
      return _never;
    }
  }
}

export function isActivityFixtureId(value: string): value is ActivityFixtureId {
  return value === "approved" || value === "denied" || value === "expired" || value === "revoked";
}
