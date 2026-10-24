/**
 * Build #822 — real Partner Flow receipt shape → portable verification bundle → standalone verifier.
 */
import { describe, expect, it } from "vitest";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
} from "@/lib/decisionReceipts/signing";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { toPublicView } from "@/lib/decisionReceipts/views";
import {
  assessPortableVerificationReadiness,
  buildPortableVerificationBundle,
  publicReceiptToVerifierRecord,
  verifyPortableBundle,
} from "./index";

const PARTNER_ID = "partner-flow-822";
const POLICY_ID = "policy-sandbox-822";

function partnerFlowEnv(receiptKey: ReturnType<typeof generateTestSigningKeyPair>): Record<string, string> {
  const anchor = generateTestSigningKeyPair("anchor-822");
  const statusSigner = generateTestSigningKeyPair("status-822");
  const pub = receiptKey.publicKeyJwk;
  return {
    ABRAXAS_SIGNING_KEY: JSON.stringify(receiptKey.privateKeyJwk),
    ABRAXAS_SIGNING_KEY_ID: receiptKey.signingKeyId,
    VERCEL_ENV: "preview",
    ABRAXAS_ISSUER_AUTHORITY_REGISTRY_VERSION: "2",
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID: "anchor-822",
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK: JSON.stringify(anchor.privateKeyJwk),
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK: JSON.stringify(anchor.publicKeyJwk),
    ABRAXAS_STATUS_SIGNER_KEY_ID: statusSigner.signingKeyId,
    ABRAXAS_STATUS_SIGNER_PRIVATE_JWK: JSON.stringify(statusSigner.privateKeyJwk),
    ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(statusSigner.publicKeyJwk),
    ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify([
      {
        key_id: receiptKey.signingKeyId,
        environment: "demo",
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
    NEXT_PUBLIC_SUPABASE_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
  };
}

function buildPartnerFlowSandboxReceipt(receiptKey: ReturnType<typeof generateTestSigningKeyPair>): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_partner_flow_822",
    decision_id: "00000000-0000-4000-8000-000000008822",
    policy_id: POLICY_ID,
    policy_version: 1,
    partner_id: PARTNER_ID,
    subject_pseudonym_id: subjectPseudonymId("holder-822"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["all_claims_met"],
    evaluated_claim_refs: [],
    issuer_refs: ["issuer:abraxas"],
    decision_context: "sandbox_only",
    evaluated_at: "2026-09-01T00:00:00.000Z",
    expires_at: "2030-09-01T00:00:00.000Z",
  });
  const { payloadHash, signature } = signReceiptPayload(payload, receiptKey.privateKeyJwk);
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
    issuer_refs: payload.issuer_refs,
    decision_context: "sandbox_only",
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    schema_version: payload.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: receiptKey.signingKeyId,
    anchor_reference: null,
    idempotency_key: null,
    created_at: payload.evaluated_at,
  };
}

describe("Build #822 Partner Flow portable verification", () => {
  const receiptKey = generateTestSigningKeyPair("pf-822-signer");
  const env = partnerFlowEnv(receiptKey);

  it("assesses issuer export readiness from env", () => {
    expect(assessPortableVerificationReadiness(env).ready).toBe(true);
    expect(assessPortableVerificationReadiness({}).ready).toBe(false);
  });

  it("maps public receipt view to verifier record when verification_decision_id present", () => {
    const record = buildPartnerFlowSandboxReceipt(receiptKey);
    const view = toPublicView(record);
    const mapped = publicReceiptToVerifierRecord(view);
    if ("ok" in mapped) throw new Error("expected verifier record");
    expect(mapped.verification_decision_id).toBe(record.verification_decision_id);
    expect(mapped.payload_hash).toBe(record.payload_hash);
  });

  it("exports bundle and passes standalone verifier for sandbox Partner Flow receipt", async () => {
    const record = buildPartnerFlowSandboxReceipt(receiptKey);
    const built = await buildPortableVerificationBundle({ record, env });
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const verified = verifyPortableBundle({
      bundle: built.bundle,
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
    });
    expect(verified.cryptographically_authentic).toBe(true);
    expect(verified.issuer_currently_authorized).toBe(true);
    expect(verified.status_evidence_authentic).toBe(true);
    expect(verified.currently_acceptable).toBe("yes");
  });

  it("rejects wrong partner audience on exported bundle", async () => {
    const record = buildPartnerFlowSandboxReceipt(receiptKey);
    const built = await buildPortableVerificationBundle({ record, env });
    if (!built.ok) throw new Error("bundle");
    const verified = verifyPortableBundle({
      bundle: built.bundle,
      partnerId: "wrong-partner",
      policyId: POLICY_ID,
    });
    expect(verified.currently_acceptable).toBe("no");
    expect(verified.failure_codes).toContain("audience_mismatch");
  });

  it("rejects revoked Partner Flow receipt in exported status", async () => {
    const record = { ...buildPartnerFlowSandboxReceipt(receiptKey), status: "revoked" as const, revoked_at: new Date().toISOString() };
    const built = await buildPortableVerificationBundle({ record, env });
    if (!built.ok) throw new Error("bundle");
    const verified = verifyPortableBundle({
      bundle: built.bundle,
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
    });
    expect(verified.currently_acceptable).toBe("no");
  });
});
