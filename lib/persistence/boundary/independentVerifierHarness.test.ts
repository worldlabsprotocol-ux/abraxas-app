/**
 * Build #818 — external relying-party verifier harness (package-only crypto path).
 */
import { describe, expect, it } from "vitest";
import { generateTestSigningKeyPair, signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { publishSignedIssuerAuthorityFromRegistry } from "./issuerAuthority/buildFromRegistry";
import { buildTrustAnchorBundleV1 } from "./trustDistribution/buildTrustAnchorBundle";
import {
  verifyAbraxasReceiptIndependently,
  type DecisionReceiptRecord as IndependentRecord,
} from "@abraxas/independent-verifier";

const RECEIPT_KEY = generateTestSigningKeyPair();
const ANCHOR_KEY = generateTestSigningKeyPair();

function registryEnv(): Record<string, string> {
  const pub = RECEIPT_KEY.publicKeyJwk;
  return {
    ABRAXAS_SIGNING_KEY: JSON.stringify(RECEIPT_KEY.privateKeyJwk),
    ABRAXAS_SIGNING_KEY_ID: RECEIPT_KEY.signingKeyId,
    ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify([
      {
        key_id: RECEIPT_KEY.signingKeyId,
        environment: "production",
        status: "active",
        public_jwk: pub,
        fingerprint: publicReceiptJwkFingerprint(pub as { kty: "OKP"; crv: "Ed25519"; x: string }),
        issued_at: "2020-01-01T00:00:00.000Z",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
        reason_class: "active",
        allow_historical_verification: false,
        historical_verify_until: null,
      },
    ]),
    VERCEL_ENV: "production",
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID: "anchor-harness",
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK: JSON.stringify(ANCHOR_KEY.privateKeyJwk),
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK: JSON.stringify(ANCHOR_KEY.publicKeyJwk),
  };
}

function sampleRecord(): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_harness818",
    decision_id: "00000000-0000-4000-8000-000000008818",
    policy_id: "policy-harness",
    policy_version: 1,
    partner_id: "partner-harness",
    subject_pseudonym_id: subjectPseudonymId("w-harness"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["ok"],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    evaluated_at: "2026-06-01T12:00:00.000Z",
    expires_at: "2027-06-01T12:00:00.000Z",
  });
  const { payloadHash, signature } = signReceiptPayload(payload, RECEIPT_KEY.privateKeyJwk);
  return {
    id: payload.receipt_id,
    verification_decision_id: payload.decision_id,
    consent_receipt_id: null,
    partner_id: payload.partner_id,
    policy_id: payload.policy_id,
    policy_version: payload.policy_version,
    subject_pseudonym_id: payload.subject_pseudonym_id,
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: payload.reason_codes,
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    schema_version: payload.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: RECEIPT_KEY.signingKeyId,
    created_at: payload.evaluated_at,
  };
}

describe("independent verifier harness (#818)", () => {
  it("verifies receipt using pinned anchor + SIAS without Supabase or app verify imports", () => {
    const env = registryEnv();
    const statement = publishSignedIssuerAuthorityFromRegistry({
      env,
      registryVersion: 2,
      anchorKeyId: "anchor-harness",
      anchorPrivateJwk: ANCHOR_KEY.privateKeyJwk,
    });
    if ("ok" in statement && statement.ok === false) throw new Error(statement.reason);
    const bundle = buildTrustAnchorBundleV1({
      anchorKeyId: "anchor-harness",
      anchorPublicJwk: ANCHOR_KEY.publicKeyJwk,
      environment: "production",
    });
    const record = sampleRecord() as IndependentRecord;
    const result = verifyAbraxasReceiptIndependently({
      record,
      pinnedTrustAnchor: bundle,
      signedIssuerAuthority: statement,
      relyingParty: {
        partner_id: record.partner_id,
        policy_id: record.policy_id,
        environment: "production",
      },
      statementObservedAt: new Date().toISOString(),
      statusEvidence: {
        document: "abraxas_receipt_status_evidence",
        schema_version: "1.0.0",
        receipt_id: record.id,
        observed_at: new Date().toISOString(),
        receipt_status: "active",
        superseded: false,
        partner_operational: true,
        policy_active: true,
        claims_current: true,
        evidence_current: true,
      },
    });
    expect(result.cryptographically_authentic).toBe(true);
    expect(result.issuer_currently_authorized).toBe(true);
    expect(result.currently_acceptable).toBe("yes");
  });
});
