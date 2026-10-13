// FILE: lib/institutionalCertification/build546/fixtures.ts
// Deterministic signed receipt fixtures — no Supabase, no live tenants.

import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
  type ReceiptSigningKeyPair,
} from "@/lib/decisionReceipts/signing";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { toPublicView } from "@/lib/decisionReceipts/views";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { RECEIPT_VERIFICATION_REGISTRY_ENV } from "@/lib/decisionReceipts/verificationKeyLifecycle";

export const BUILD_546_FIXTURE_NOW = new Date("2026-06-15T12:00:00.000Z");
export const BUILD_546_PARTNER_ID = "institutional-rp-example";
export const BUILD_546_POLICY_ID = "institutional-age-21-v1";

export const BUILD_546_PRIMARY_KEY: ReceiptSigningKeyPair = generateTestSigningKeyPair("build546-primary");
export const BUILD_546_RETIRED_KEY: ReceiptSigningKeyPair = generateTestSigningKeyPair("build546-retired");
export const BUILD_546_UNKNOWN_KEY: ReceiptSigningKeyPair = generateTestSigningKeyPair("build546-unknown");

function registryEntry(key: ReceiptSigningKeyPair, status: "active" | "retiring" | "retired" | "revoked") {
  return {
    key_id: key.signingKeyId,
    algorithm: "Ed25519",
    environment: "demo",
    status,
    public_jwk: { kty: "OKP", crv: "Ed25519", x: key.publicKeyJwk.x },
    issued_at: "2024-01-01T00:00:00.000Z",
    not_before: "2024-01-01T00:00:00.000Z",
    expires_at: status === "retired" ? "2025-01-01T00:00:00.000Z" : "2099-01-01T00:00:00.000Z",
    schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
    allow_historical_verification: status === "retired",
    historical_verify_until: status === "retired" ? "2026-01-01T00:00:00.000Z" : null,
    issuer_label: "Abraxas Test Issuer",
    reason_class: "rotation",
  };
}

export function build546TrustRegistryEnv(): Record<string, string> {
  return {
    ABRAXAS_RECEIPT_KEY_ENVIRONMENT: "demo",
    [RECEIPT_VERIFICATION_REGISTRY_ENV]: JSON.stringify([
      registryEntry(BUILD_546_PRIMARY_KEY, "active"),
      registryEntry(BUILD_546_RETIRED_KEY, "retired"),
    ]),
  };
}

export function build546SampleRecord(
  key: ReceiptSigningKeyPair = BUILD_546_PRIMARY_KEY,
  overrides: Partial<DecisionReceiptRecord> = {},
): DecisionReceiptRecord {
  const receiptId = overrides.id ?? "dr_build546_valid";
  const decisionId = overrides.verification_decision_id ?? "00000000-0000-4000-8000-000000000546";
  const payload = buildCanonicalPayload({
    receipt_id: receiptId,
    decision_id: decisionId,
    policy_id: overrides.policy_id ?? BUILD_546_POLICY_ID,
    policy_version: overrides.policy_version ?? 1,
    partner_id: overrides.partner_id ?? BUILD_546_PARTNER_ID,
    subject_pseudonym_id: overrides.subject_pseudonym_id ?? subjectPseudonymId("synthetic-holder-546"),
    wallet_binding_ref: overrides.wallet_binding_ref ?? null,
    consent_receipt_id: overrides.consent_receipt_id ?? null,
    decision_result: overrides.decision_result ?? "approved",
    reason_codes: overrides.reason_codes ?? ["all_claims_met"],
    evaluated_claim_refs: overrides.evaluated_claim_refs ?? [
      {
        claim_id: "claim-synthetic-1",
        claim_type: "age_over_21",
        issuer_id: "issuer:synthetic-kyc",
        status: "active",
        issued_at: "2026-01-01T00:00:00.000Z",
        expires_at: "2027-01-01T00:00:00.000Z",
      },
    ],
    issuer_refs: overrides.issuer_refs ?? ["issuer:synthetic-kyc"],
    decision_context: overrides.decision_context ?? "production",
    evaluated_at: overrides.evaluated_at ?? "2026-06-01T12:00:00.000Z",
    expires_at: overrides.expires_at ?? "2027-06-01T12:00:00.000Z",
  });
  const { payloadHash, signature } = signReceiptPayload(payload, key.privateKeyJwk);
  return {
    id: payload.receipt_id,
    verification_decision_id: payload.decision_id,
    consent_receipt_id: payload.consent_receipt_id,
    partner_id: payload.partner_id,
    policy_id: payload.policy_id,
    policy_version: payload.policy_version,
    subject_pseudonym_id: payload.subject_pseudonym_id,
    wallet_binding_ref: payload.wallet_binding_ref,
    decision_result: payload.decision_result,
    reason_codes: payload.reason_codes,
    evaluated_claim_refs: payload.evaluated_claim_refs,
    issuer_refs: payload.issuer_refs,
    decision_context: payload.decision_context,
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: overrides.revoked_at ?? null,
    status: overrides.status ?? "active",
    schema_version: payload.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: overrides.signing_key_id ?? key.signingKeyId,
    anchor_reference: overrides.anchor_reference ?? null,
    idempotency_key: overrides.idempotency_key ?? payload.decision_id,
    created_at: overrides.created_at ?? payload.evaluated_at,
  };
}

export function build546PublicPartnerView(record: DecisionReceiptRecord): PartnerFlowPublicReceipt {
  const pub = toPublicView(record);
  return {
    ...pub,
    currently_valid: true,
    validity: "active",
    issued_valid: true,
    lifecycle_status: "active",
    invalidation_reasons: [],
    validity_checked_at: BUILD_546_FIXTURE_NOW.toISOString(),
  };
}
