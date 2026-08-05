// FILE: lib/partner/partnerConformanceFixtures.ts
// Safe in-memory public receipt fixtures for conformance harness (no live data).

import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";

/** Generic placeholder ids — never a production partner row. */
export const CONFORMANCE_FIXTURE_PARTNER_ID = "your-protocol-partner";
export const CONFORMANCE_FIXTURE_POLICY_ID = "your-protocol-policy-v1";

export const CONFORMANCE_FIXTURE_NOW = new Date("2026-06-01T12:00:00.000Z");
export const CONFORMANCE_FIXTURE_FUTURE_EXPIRY = "2099-01-01T00:00:00.000Z";
export const CONFORMANCE_FIXTURE_PAST_EXPIRY = "2020-01-01T00:00:00.000Z";

export type ConformanceReceiptFixtureCase = {
  id: string;
  label: string;
  receipt: PartnerFlowPublicReceipt | null;
  expectValid: boolean;
  expectedReasonPrefix?: string;
  allowSandbox?: boolean;
};

function baseReceipt(overrides: Partial<PartnerFlowPublicReceipt> = {}): PartnerFlowPublicReceipt {
  return {
    receipt_id: "dr_conformance_fixture",
    partner_id: CONFORMANCE_FIXTURE_PARTNER_ID,
    policy_id: CONFORMANCE_FIXTURE_POLICY_ID,
    decision_result: "approved",
    signature_valid: true,
    expires_at: CONFORMANCE_FIXTURE_FUTURE_EXPIRY,
    status: "active",
    production_usable: true,
    ...overrides,
  };
}

export function conformanceReceiptFixtureCases(): ConformanceReceiptFixtureCase[] {
  return [
    {
      id: "valid-production-receipt",
      label: "valid approved production receipt",
      receipt: baseReceipt(),
      expectValid: true,
    },
    {
      id: "invalid-signature",
      label: "invalid signature",
      receipt: baseReceipt({ signature_valid: false }),
      expectValid: false,
      expectedReasonPrefix: "signature_invalid",
    },
    {
      id: "wrong-partner",
      label: "wrong partner_id",
      receipt: baseReceipt({ partner_id: "other-partner" }),
      expectValid: false,
      expectedReasonPrefix: "partner_mismatch",
    },
    {
      id: "wrong-policy",
      label: "wrong policy_id",
      receipt: baseReceipt({ policy_id: "other-policy-v1" }),
      expectValid: false,
      expectedReasonPrefix: "policy_mismatch",
    },
    {
      id: "expired-receipt",
      label: "expired receipt",
      receipt: baseReceipt({ expires_at: CONFORMANCE_FIXTURE_PAST_EXPIRY }),
      expectValid: false,
      expectedReasonPrefix: "receipt_expired",
    },
    {
      id: "revoked-receipt",
      label: "revoked receipt",
      receipt: baseReceipt({ status: "revoked" }),
      expectValid: false,
      expectedReasonPrefix: "receipt_revoked",
    },
    {
      id: "sandbox-only-receipt",
      label: "sandbox-only receipt without opt-in",
      receipt: baseReceipt({ production_usable: false }),
      expectValid: false,
      expectedReasonPrefix: "production_not_usable",
    },
    {
      id: "sandbox-only-with-opt-in",
      label: "sandbox-only receipt with explicit allowSandbox",
      receipt: baseReceipt({ production_usable: false }),
      expectValid: true,
      allowSandbox: true,
    },
  ];
}
