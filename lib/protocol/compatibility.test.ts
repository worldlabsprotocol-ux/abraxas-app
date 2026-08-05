import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  DECISION_RECEIPT_SCHEMA_VERSION,
  PARTNER_CALLBACK_PARAMS,
  FROZEN_TRUST_DECISION_KEYS,
  FROZEN_TRUST_DECISION_PROOF_KEYS,
  FROZEN_PUBLIC_RECEIPT_VIEW_KEYS,
  FROZEN_PARTNER_FLOW_EVALUATE_ENTER_KEYS,
  FROZEN_PARTNER_VERIFICATION_RESULT_KEYS,
} from "./compatibility";
import { buildTrustDecision } from "@/lib/verify/trustDecision";
import {
  PARTNER_FLOW_COMPATIBILITY_VERSION,
  buildPartnerFlowCompatibilityManifest,
} from "@/lib/protocol/partnerFlowCompatibilityManifest";
import type { PolicyDecisionRecord } from "@/lib/policy/types";
import { buildRedirectUrl } from "@/lib/connect/returnUrlAllowlist";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
} from "@/lib/decisionReceipts/signing";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { toPublicView } from "@/lib/decisionReceipts/views";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { buildPartnerVerificationResult } from "@/lib/partner/partnerVerificationResult";
import { flowTraceIdFromVerificationRequest } from "@/lib/partner/partnerFlowAudit";

const TEST_KEY = generateTestSigningKeyPair();

function sortedKeys(obj: object): string[] {
  return Object.keys(obj as Record<string, unknown>).sort();
}

function sampleDecision(): PolicyDecisionRecord {
  return {
    id: "vd_compat",
    request_id: "req_compat",
    partner_id: "good-trouble-cannabis",
    subject_id: "0xabc",
    policy_id: "good-trouble-retail-v1",
    policy_version: 1,
    decision: "approved",
    claims_json: { identity_verified: true },
    reason_codes: [],
    valid_until: "2026-08-01T00:00:00.000Z",
    decided_at: "2026-07-30T00:00:00.000Z",
    status: "active",
  };
}

function sampleReceiptRecord(): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_compat",
    decision_id: "vd_compat",
    policy_id: "good-trouble-retail-v1",
    policy_version: 1,
    partner_id: "good-trouble-cannabis",
    subject_pseudonym_id: subjectPseudonymId("0xabc"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["all_claims_met"],
    evaluated_claim_refs: [{
      claim_id: "claim-compat",
      claim_type: "identity_verified",
      issuer_id: "issuer:abraxas",
      status: "active",
      issued_at: "2026-07-30T00:00:00.000Z",
      expires_at: null,
    }],
    issuer_refs: ["issuer:abraxas"],
    decision_context: "production",
    evaluated_at: "2026-07-30T00:00:00.000Z",
    expires_at: "2026-08-01T00:00:00.000Z",
  });
  const { payloadHash, signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
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
    revoked_at: null,
    status: "active",
    schema_version: payload.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: TEST_KEY.signingKeyId,
    anchor_reference: null,
    idempotency_key: payload.decision_id,
    created_at: payload.evaluated_at,
  };
}

describe("protocol compatibility — live implementation output", () => {
  beforeEach(() => {
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(TEST_KEY.publicKeyJwk);
  });

  afterEach(() => {
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });

  it("pins schema version constants", () => {
    expect(DECISION_RECEIPT_SCHEMA_VERSION).toBe("1.0.0");
  });

  it("buildTrustDecision output matches frozen public field set", () => {
    const receipt = sampleReceiptRecord();
    const td = buildTrustDecision({
      decision: sampleDecision(),
      receipt,
      appUrl: "https://example.com",
    });

    expect(sortedKeys(td)).toEqual([...FROZEN_TRUST_DECISION_KEYS].sort());
    expect(td.policy_id).toBe("good-trouble-retail-v1");
    expect(td.permission).toBe("regulated_purchase");
    expect(td.proof).not.toBeNull();
    expect(sortedKeys(td.proof!)).toEqual(
      [...FROZEN_TRUST_DECISION_PROOF_KEYS].sort(),
    );
    expect(td.proof?.schema_version).toBe(DECISION_RECEIPT_SCHEMA_VERSION);
  });

  it("public receipt serialization matches frozen public view field set", () => {
    const view = toPublicView(sampleReceiptRecord());
    expect(sortedKeys(view)).toEqual(
      [...FROZEN_PUBLIC_RECEIPT_VIEW_KEYS].sort(),
    );
    expect(view.schema_version).toBe(DECISION_RECEIPT_SCHEMA_VERSION);
    expect(view.artifact_type).toBe("eligibility_decision_receipt");
  });

  it("partner callback URL contains exactly frozen query parameters", () => {
    const redirect = buildRedirectUrl("https://partner.example.com/callback", {
      status: "approved",
      decision_id: "vd_compat",
      receipt_id: "dr_compat",
      receipt_expires_at: "2026-08-01T00:00:00.000Z",
      credential_id: "cred-jti",
      policy_id: "good-trouble-retail-v1",
      partner_id: "good-trouble-cannabis",
    });

    const url = new URL(redirect);
    const paramKeys = Array.from(url.searchParams.keys()).sort();
    expect(paramKeys).toEqual([...PARTNER_CALLBACK_PARAMS].sort());
    expect(paramKeys).not.toContain("date_of_birth");
    expect(url.searchParams.get("receipt_id")).toBe("dr_compat");
  });

  it("partner-flow evaluate enter payload matches frozen response shapes", () => {
    const vrId = "00000000-0000-4000-8000-0000000000bb";
    const partnerResult = buildPartnerVerificationResult({
      decision: "approved",
      credentialJti: "cred-jti",
      issuer: "https://issuer.example",
      evaluatedAt: "2026-07-30T00:00:00.000Z",
      receiptId: "dr_enter",
      receiptExpiresAt: "2026-08-01T00:00:00.000Z",
      policyId: "good-trouble-retail-v1",
      partnerId: "good-trouble-cannabis",
      identityVerified: true,
      minimumAge: 21,
      assuranceLevel: "L2",
      reasonCodes: [],
    });

    const response = {
      next: "enter",
      redirect_url: buildRedirectUrl("https://partner.example.com/callback", {
        status: "approved",
        decision_id: "vd_compat",
        receipt_id: "dr_enter",
        receipt_expires_at: "2026-08-01T00:00:00.000Z",
        credential_id: "cred-jti",
        policy_id: "good-trouble-retail-v1",
        partner_id: "good-trouble-cannabis",
      }),
      partner_result: partnerResult,
      flow_trace_id: flowTraceIdFromVerificationRequest(vrId),
    };

    expect(sortedKeys(response)).toEqual(
      [...FROZEN_PARTNER_FLOW_EVALUATE_ENTER_KEYS].sort(),
    );
    expect(sortedKeys(partnerResult)).toEqual(
      [...FROZEN_PARTNER_VERIFICATION_RESULT_KEYS].sort(),
    );
  });

  it("compatibility manifest version aligns with frozen constants", () => {
    const manifest = buildPartnerFlowCompatibilityManifest();
    expect(manifest.compatibility_version).toBe(PARTNER_FLOW_COMPATIBILITY_VERSION);
    expect(manifest.schema_versions.decision_receipt).toBe(DECISION_RECEIPT_SCHEMA_VERSION);
  });
});
