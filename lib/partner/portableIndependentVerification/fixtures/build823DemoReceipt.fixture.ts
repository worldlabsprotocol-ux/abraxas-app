// FILE: lib/partner/portableIndependentVerification/fixtures/build823DemoReceipt.fixture.ts
// Genuine Demo sandbox issuance artifact (public API + sovereign verification_decision_id).

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";

/** Live Demo public receipt `dr_jSXuDfM_pFMT36du` — do not re-sign or alter provenance. */
export const BUILD823_DEMO_RECEIPT_ID = "dr_jSXuDfM_pFMT36du" as const;

export const BUILD823_DEMO_PARTNER_ID =
  "studio-accept-wc-1792620888278-6a4a2447dfc8" as const;

export const BUILD823_DEMO_POLICY_ID =
  "studio-accept-wc-1792620888278-6a4a2447dfc8-wallet_control-v1" as const;

export const BUILD823_DEMO_VERIFICATION_DECISION_ID =
  "9c25d9df-b230-4c90-b4ed-05dbbfb5f127" as const;

/** Demo verification-keys document (`abraxas-demo-primary`). */
export const BUILD823_DEMO_RECEIPT_SIGNING_PUBLIC_JWK = {
  kty: "OKP",
  crv: "Ed25519",
  x: "5z2bLjib8E6FhvrsNhwzqggCS_0zbD1_NdHWNK8CQg4",
} as const;

export function build823GenuineDemoReceiptRecord(): DecisionReceiptRecord {
  return {
    id: BUILD823_DEMO_RECEIPT_ID,
    verification_decision_id: BUILD823_DEMO_VERIFICATION_DECISION_ID,
    consent_receipt_id: null,
    partner_id: BUILD823_DEMO_PARTNER_ID,
    policy_id: BUILD823_DEMO_POLICY_ID,
    policy_version: 1,
    subject_pseudonym_id: "f7859af8eaa66da6083e97d7bb6d733e",
    wallet_binding_ref: "3986c8fa-4c38-4c45-9039-29463165385a",
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [
      {
        claim_id: "287613a6-730b-4d3d-856e-c9e606740a4f",
        claim_type: "wallet_binding_confirmed",
        issuer_id: "issuer:abraxas",
        status: "active",
        issued_at: "2026-10-24T16:04:53.256+00:00",
        expires_at: "2026-10-25T04:04:53.256+00:00",
      },
    ],
    issuer_refs: ["issuer:abraxas"],
    decision_context: "sandbox_only",
    evaluated_at: "2026-10-24T16:04:58.329+00:00",
    expires_at: "2026-10-25T04:04:58.178+00:00",
    revoked_at: null,
    status: "active",
    schema_version: "1.0.0",
    payload_hash: "8b80e83c7a9c1b68599b33c50401cbba92f0e7c2f09414a7436134da16138f4c",
    signature: "v07Dcmig8wtJxDdmrELh-vyCQFCS4vIWyrTegRJPs3u5wCIWrq0pA-6o6FpGMU3t3wvwLE5Hk_EdVVwvem5jBg",
    signing_key_id: "abraxas-demo-primary",
    anchor_reference: null,
    idempotency_key: null,
    created_at: "2026-10-24T16:04:58.329+00:00",
  };
}
