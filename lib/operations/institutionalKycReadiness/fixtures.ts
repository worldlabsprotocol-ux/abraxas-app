// FILE: lib/operations/institutionalKycReadiness/fixtures.ts
// Audit-only fixtures — mock issuer, no real vendor integration.

import { createHash } from "crypto";
import nacl from "tweetnacl";
import { canonicalizeJson } from "@/lib/decisionReceipts/canonical";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import type { IssuerClaimAttestationPayload } from "@/lib/trust/issuerClaimAttestation";
import type { MockExternalKycAssertion } from "./contract";

export const MOCK_APPROVED_KYC_ISSUER_ID = "issuer:mock-approved-kyc" as const;

const TEST_KEYPAIR = nacl.sign.keyPair();

/** Conceptual composite policy — NOT shipped. */
export const CONCEPTUAL_INSTITUTIONAL_KYC_POLICY: PartnerPolicyRules = {
  required_claims: [
    {
      claim_type: "identity_verified",
      min_assurance: "L2",
      accepted_issuers: [MOCK_APPROVED_KYC_ISSUER_ID],
      max_age_hours: 8760,
    },
    {
      claim_type: "screening_outcome",
      min_assurance: "L2",
      accepted_issuers: ["issuer:screening-partner"],
      max_age_hours: 24,
    },
    {
      claim_type: "residency_country",
      min_assurance: "L1",
      accepted_issuers: [MOCK_APPROVED_KYC_ISSUER_ID],
    },
  ],
};

export function rawKycProviderPayload(): Record<string, unknown> {
  return {
    legal_name: "Audit Subject",
    date_of_birth: "1990-01-01",
    passport_number: "X1234567",
    document_image_url: "https://provider.example/doc.jpg",
    selfie_url: "https://provider.example/selfie.jpg",
    address_line: "123 Main St",
    provider_internal_case_id: "case_secret_999",
    risk_notes: "internal only",
    provider_payload: { nested: "raw" },
  };
}

export function buildMockKycAttestationPayload(
  subjectId: string,
): IssuerClaimAttestationPayload & { _test_public_key_x?: string } {
  const now = new Date().toISOString();
  return {
    schema_version: "1.0.0",
    issuer_id: MOCK_APPROVED_KYC_ISSUER_ID,
    signing_key_id: "key_mock_audit",
    subject_id: subjectId,
    claim_type: "identity_verified",
    assurance_level: "L2",
    jurisdiction: "US",
    issued_at: now,
    expires_at: new Date(Date.now() + 365 * 86400_000).toISOString(),
    claim_value: { outcome: "verified", provider_event_id: "evt_audit_1" },
    idempotency_key: `audit:${subjectId}:${now}`,
    _test_public_key_x: Buffer.from(TEST_KEYPAIR.publicKey).toString("base64"),
  };
}

export function signMockAttestation(payload: IssuerClaimAttestationPayload): string {
  const hash = createHash("sha256").update(canonicalizeJson(payload), "utf8").digest();
  const sig = nacl.sign.detached(Buffer.from(hash), TEST_KEYPAIR.secretKey);
  return Buffer.from(sig).toString("base64url");
}

export function buildNormalizedIdentityClaim(
  attestation: IssuerClaimAttestationPayload,
  issuerId: string,
): CredentialClaimRecord {
  return {
    id: `claim:${attestation.idempotency_key}`,
    subject_id: attestation.subject_id,
    credential_jti: null,
    claim_type: "identity_verified",
    claim_value: attestation.claim_value,
    issuer_id: issuerId,
    assurance_level: attestation.assurance_level,
    issued_at: attestation.issued_at,
    expires_at: attestation.expires_at,
    status: "active",
    revocation_reference: null,
    evidence_reference: attestation.idempotency_key,
    jurisdiction: attestation.jurisdiction,
    policy_scope: null,
  };
}

export function mockExternalKycAssertion(subjectRef: string): MockExternalKycAssertion {
  return {
    provider_subject_reference: subjectRef,
    verification_status: "approved",
    verified_at: new Date().toISOString(),
    assurance_level: "L2",
    jurisdiction: "US",
    evidence_reference: "ev_audit_ref",
    provider_event_id: "evt_provider_1",
  };
}
