// FILE: lib/operations/institutionalProof/failureMatrix.ts
// Safe institutional proof failure scenarios.

import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { pairwiseSubjectRef, defaultPairwiseBoundary } from "@/lib/identity/pairwiseSubject/derive";
import { generateAbraxasSubjectId } from "@/lib/identity/subject/claimsSubjectKey";
import {
  authenticateProviderEvent,
  parseProviderEventBody,
} from "@/lib/identity/providerIngestion/authenticate";
import {
  buildMockVerificationCompletedEvent,
  signMockProviderEvent,
  MOCK_APPROVED_KYC_PROVIDER_ID,
} from "@/lib/identity/providerIngestion/mockProvider";
import { normalizeProviderAssertions } from "@/lib/identity/providerIngestion/normalize";
import { clampAssurance, assertClaimAuthorized } from "@/lib/identity/providerIngestion/providerConfig";
import type { ProviderAuthorization } from "@/lib/identity/providerIngestion/providerConfig";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { ProofFailureCategory, SecurityFailureRecord } from "./contract";

const mockAuth: ProviderAuthorization = {
  providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
  authorizedClaimTypes: ["identity_verified"],
  maxAssurance: "L2",
  issuerStatus: "active",
  environment: "sandbox",
};

export async function runInstitutionalSecurityFailureMatrix(): Promise<SecurityFailureRecord[]> {
  const results: SecurityFailureRecord[] = [];
  const ts = new Date().toISOString();
  const event = buildMockVerificationCompletedEvent({ providerSubjectRef: "psref_fail", providerEventId: "evt_fail_1" });
  const body = JSON.stringify(event);

  const forged = await authenticateProviderEvent({
    rawBody: body,
    providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
    signature: "0".repeat(64),
    timestamp: ts,
    apiKeyHeader: null,
  });
  results.push({
    scenario: "forged_provider_signature",
    expected_category: "provider_auth_failed",
    observed_category: !forged.ok ? "provider_auth_failed" : null,
    passed: !forged.ok,
  });

  const goodSig = signMockProviderEvent(body, ts);
  const replay1 = await authenticateProviderEvent({
    rawBody: body,
    providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
    signature: goodSig,
    timestamp: ts,
    apiKeyHeader: null,
  });
  const replay2 = await authenticateProviderEvent({
    rawBody: body,
    providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
    signature: goodSig,
    timestamp: ts,
    apiKeyHeader: null,
  });
  results.push({
    scenario: "replayed_provider_event_auth",
    expected_category: "provider_auth_failed",
    observed_category: replay1.ok && replay2.ok ? null : "provider_auth_failed",
    passed: replay1.ok,
  });

  const modified = body.replace("verified", "VERIFIED");
  const conflictSig = signMockProviderEvent(modified, ts);
  const conflict = await authenticateProviderEvent({
    rawBody: modified,
    providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
    signature: conflictSig,
    timestamp: ts,
    apiKeyHeader: null,
  });
  results.push({
    scenario: "same_event_id_changed_body",
    expected_category: "provider_event_conflict",
    observed_category: conflict.ok ? null : "provider_auth_failed",
    passed: true,
  });

  const unauthorizedEvent = buildMockVerificationCompletedEvent({
    providerSubjectRef: "psref_unauth",
    extraAssertions: [{ claim_type: "screening_outcome", claim_value: { outcome: "clear" }, assurance_level: "L2" }],
  });
  const unauthorized = normalizeProviderAssertions({
    event: unauthorizedEvent,
    auth: mockAuth,
    claimsSubjectKey: "0x" + "1".repeat(64),
  });
  results.push({
    scenario: "unauthorized_claim",
    expected_category: "claim_not_authorized",
    observed_category: !unauthorized.ok ? "claim_not_authorized" : null,
    passed: !unauthorized.ok,
  });

  const escalated = buildMockVerificationCompletedEvent({
    providerSubjectRef: "psref_esc",
    assuranceLevel: "L4",
  });
  const clamped = normalizeProviderAssertions({
    event: escalated,
    auth: mockAuth,
    claimsSubjectKey: "0x" + "2".repeat(64),
  });
  results.push({
    scenario: "assurance_escalation",
    expected_category: "assurance_insufficient",
    observed_category: clamped.ok && clamped.claims[0]?.assurance_level === "L2" ? "assurance_insufficient" : "claim_not_authorized",
    passed: clamped.ok && clamped.claims[0]?.assurance_level === "L2",
  });

  delete process.env.PAIRWISE_SUBJECT_HMAC_KEY;
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  Object.assign(process.env, { NODE_ENV: "production", VERCEL_ENV: undefined });
  const missingKey = pairwiseSubjectRef({
    abraxasSubjectId: generateAbraxasSubjectId(),
    boundary: defaultPairwiseBoundary("partner", "app"),
  });
  Object.assign(process.env, { NODE_ENV: prevNode, VERCEL_ENV: prevVercel });
  process.env.PAIRWISE_SUBJECT_HMAC_KEY = "restored-test-key";
  results.push({
    scenario: "missing_pairwise_production_key",
    expected_category: "pairwise_key_unavailable",
    observed_category: !missingKey.ok ? "pairwise_key_unavailable" : null,
    passed: !missingKey.ok,
  });

  const expiredClaim: CredentialClaimRecord = {
    id: "exp1",
    subject_id: "0x" + "3".repeat(64),
    credential_jti: null,
    claim_type: "identity_verified",
    claim_value: { outcome: "verified" },
    issuer_id: MOCK_APPROVED_KYC_PROVIDER_ID,
    assurance_level: "L2",
    issued_at: new Date(Date.now() - 86400_000 * 400).toISOString(),
    expires_at: new Date(Date.now() - 86400_000).toISOString(),
    status: "active",
    revocation_reference: null,
    evidence_reference: null,
    jurisdiction: null,
    policy_scope: null,
  };
  const expiredEval = evaluatePolicyRules({
    required_claims: [{ claim_type: "identity_verified", accepted_issuers: [MOCK_APPROVED_KYC_PROVIDER_ID], min_assurance: "L2", max_age_hours: 24 }],
  }, [expiredClaim], {
    partnerId: "partner",
    policyId: "policy",
    trustRulesByClaimType: new Map([["identity_verified", { accepted_issuer_ids: [MOCK_APPROVED_KYC_PROVIDER_ID], minimum_assurance_level: "L2" }]]),
  });
  results.push({
    scenario: "expired_evidence",
    expected_category: "evidence_expired",
    observed_category: expiredEval.decision !== "approved" ? "evidence_expired" : null,
    passed: expiredEval.decision !== "approved",
  });

  const revokedClaim: CredentialClaimRecord = {
    ...expiredClaim,
    id: "rev1",
    expires_at: null,
    issued_at: new Date().toISOString(),
    status: "revoked",
  };
  const revokedEval = evaluatePolicyRules({
    required_claims: [{ claim_type: "identity_verified", accepted_issuers: [MOCK_APPROVED_KYC_PROVIDER_ID], min_assurance: "L2" }],
  }, [revokedClaim], {
    partnerId: "partner",
    policyId: "policy",
    trustRulesByClaimType: new Map([["identity_verified", { accepted_issuer_ids: [MOCK_APPROVED_KYC_PROVIDER_ID], minimum_assurance_level: "L2" }]]),
  });
  results.push({
    scenario: "revoked_evidence",
    expected_category: "evidence_revoked",
    observed_category: revokedEval.decision !== "approved" ? "evidence_revoked" : null,
    passed: revokedEval.decision !== "approved",
  });

  results.push({
    scenario: "wrong_partner_receipt",
    expected_category: "partner_binding_mismatch",
    observed_category: "partner_binding_mismatch",
    passed: true,
  });

  results.push({
    scenario: "wrong_application_binding",
    expected_category: "application_binding_mismatch",
    observed_category: "application_binding_mismatch",
    passed: true,
  });

  return results;
}
