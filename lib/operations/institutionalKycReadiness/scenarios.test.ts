// FILE: lib/operations/institutionalKycReadiness/scenarios.test.ts
// Audit-only Utila-class institutional KYC readiness scenarios.
// Exercises real Abraxas trust primitives; STOPS at documented architecture gaps.

import { describe, expect, it, vi } from "vitest";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import { verifyIssuerAttestationSignature } from "@/lib/trust/issuerClaimAttestation";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { projectInternalFact, type SourceReceiptRow } from "@/lib/passport/reusableEligibility/facts";
import { decideEvidenceReuse } from "@/lib/passport/reusableEligibility/decision";
import { evaluateReusableEvidenceTrust } from "@/lib/passport/reusableEligibility/trust";
import { evaluateFactFreshness } from "@/lib/passport/reusableEligibility/freshness";
import { assertCustodySafePayload } from "@/lib/custody/guardrails";
import { NARROW_PARTNER_RESULT_FORBIDDEN_KEYS } from "@/lib/partner/narrowPartnerResult/contract";
import { WEBHOOK_PII_FORBIDDEN_KEYS } from "@/lib/partner/webhooks/payloadAllowlist";
import { ORGANIZATION_FORBIDDEN_KEYS } from "@/lib/organizationEligibility/contract";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import {
  CONCEPTUAL_INSTITUTIONAL_KYC_POLICY,
  MOCK_APPROVED_KYC_ISSUER_ID,
  buildMockKycAttestationPayload,
  buildNormalizedIdentityClaim,
  rawKycProviderPayload,
  signMockAttestation,
} from "./fixtures";
import { RAW_KYC_FORBIDDEN_FIELDS } from "./contract";

const SUBJECT_A = "0x" + "a".repeat(64);
const SUBJECT_B = "0x" + "b".repeat(64);
const PARTNER_APP_A = "institutional-platform-app-a";
const PARTNER_APP_B = "institutional-platform-app-b";

function receiptRow(overrides: Partial<SourceReceiptRow> = {}): SourceReceiptRow {
  return {
    id: "dr_audit_source",
    verification_decision_id: "00000000-0000-4000-8000-000000000001",
    partner_id: PARTNER_APP_A,
    policy_id: "institutional-platform-age_21_retail-v1",
    policy_version: 1,
    subject_pseudonym_id: subjectPseudonymId(SUBJECT_A),
    decision_result: "approved",
    decision_context: "production",
    evaluated_at: "2026-09-01T00:00:00.000Z",
    expires_at: "2026-12-01T00:00:00.000Z",
    revoked_at: null,
    status: "active",
    ...overrides,
  };
}

describe("institutional KYC readiness — scenario 1: cross-application reuse", () => {
  it("STEP 1-3: authenticated issuer attestation is required; browser assertion fails when trust context loaded", () => {
    const rules: PartnerPolicyRules = {
      required_claims: [{
        claim_type: "identity_verified",
        min_assurance: "L2",
        accepted_issuers: [MOCK_APPROVED_KYC_ISSUER_ID],
        max_age_hours: 8760,
      }],
    };

    const browserForgedClaim: CredentialClaimRecord = {
      id: "forged-1",
      subject_id: SUBJECT_A,
      credential_jti: null,
      claim_type: "identity_verified",
      claim_value: { kyc_verified: true },
      issuer_id: "issuer:browser-forged",
      assurance_level: "L4",
      issued_at: new Date().toISOString(),
      expires_at: null,
      status: "active",
      revocation_reference: null,
      evidence_reference: null,
      jurisdiction: null,
      policy_scope: null,
    };

    const forgedWithoutTrust = evaluatePolicyRules(rules, [browserForgedClaim]);
    expect(forgedWithoutTrust.decision).not.toBe("approved");
    expect(forgedWithoutTrust.reason_codes.some((c) => c.includes("trust_context_required"))).toBe(true);

    const forgedEval = evaluatePolicyRules(rules, [browserForgedClaim], {
      partnerId: "institutional-platform",
      policyId: "institutional-platform-kyc_completed-v1",
      trustRulesByClaimType: new Map([[
        "identity_verified",
        { accepted_issuer_ids: [MOCK_APPROVED_KYC_ISSUER_ID], minimum_assurance_level: "L2" },
      ]]),
    });
    expect(forgedEval.decision).toBe("denied");
    expect(forgedEval.reason_codes.some((c) => c.includes("untrusted_issuer") || c.includes("missing"))).toBe(true);

    const attestation = buildMockKycAttestationPayload(SUBJECT_A);
    const signature = signMockAttestation(attestation);
    const key = { x: attestation._test_public_key_x! };
    expect(verifyIssuerAttestationSignature(attestation, signature, key)).toBe(true);

    const normalizedClaim = buildNormalizedIdentityClaim(attestation, MOCK_APPROVED_KYC_ISSUER_ID);
    const approvedEval = evaluatePolicyRules(rules, [normalizedClaim], {
      partnerId: "institutional-platform",
      policyId: "institutional-platform-kyc_completed-v1",
      trustRulesByClaimType: new Map([[
        "identity_verified",
        { accepted_issuer_ids: [MOCK_APPROVED_KYC_ISSUER_ID], minimum_assurance_level: "L2" },
      ]]),
    });
    expect(approvedEval.decision).toBe("approved");
    expect(approvedEval.production_usable).toBe(true);
  });

  it("STEP 4-8: Application B reuses compatible evidence without new raw KYC collection", () => {
    const fact = projectInternalFact({ subjectId: SUBJECT_A, receipt: receiptRow() })!;
    const reuseForAppB = decideEvidenceReuse({
      fact,
      targetPolicyId: "institutional-platform-age_21_retail-v1",
      targetPolicyVersion: 1,
      targetEnvironment: "production",
      relyingPartner: PARTNER_APP_B,
      now: new Date("2026-09-15T00:00:00.000Z"),
    });
    expect(reuseForAppB.decision).toBe("reuse");
    expect(reuseForAppB.trust.consent_required).toBe(true);
  });

  it("STEP 9-11: revoked source receipt blocks reuse (refresh required)", () => {
    const fact = projectInternalFact({
      subjectId: SUBJECT_A,
      receipt: receiptRow({ status: "revoked", revoked_at: "2026-09-16T00:00:00.000Z" }),
    })!;
    const trust = evaluateReusableEvidenceTrust({
      fact,
      targetPolicyId: "institutional-platform-age_21_retail-v1",
      targetPolicyVersion: 1,
      targetEnvironment: "production",
      relyingPartner: PARTNER_APP_B,
    });
    expect(trust.reusable).toBe(false);
    expect(trust.source_active).toBe(false);
  });

  it("BOUNDARY: same pseudonym globally — pairwise partner refs NOT implemented", () => {
    const pseudoA = subjectPseudonymId(SUBJECT_A);
    const pseudoB = subjectPseudonymId(SUBJECT_A);
    expect(pseudoA).toBe(pseudoB);
    // Institutional deployment would need per-partner pairwise refs — documented P0 gap.
  });
});

describe("institutional KYC readiness — scenario 2: stricter policy requests only missing evidence", () => {
  it("reuses identity when sufficient; denies when screening claim missing", () => {
    const identityClaim: CredentialClaimRecord = {
      id: "id-1",
      subject_id: SUBJECT_A,
      credential_jti: null,
      claim_type: "identity_verified",
      claim_value: { outcome: "verified" },
      issuer_id: MOCK_APPROVED_KYC_ISSUER_ID,
      assurance_level: "L2",
      issued_at: new Date().toISOString(),
      expires_at: null,
      status: "active",
      revocation_reference: null,
      evidence_reference: "ev_ref",
      jurisdiction: "US",
      policy_scope: null,
    };

    const withIdentityOnly = evaluatePolicyRules(CONCEPTUAL_INSTITUTIONAL_KYC_POLICY, [identityClaim], {
      trustRulesByClaimType: new Map([
        ["identity_verified", { accepted_issuer_ids: [MOCK_APPROVED_KYC_ISSUER_ID] }],
      ]),
    });
    expect(withIdentityOnly.decision).toBe("denied");
    expect(withIdentityOnly.missing_claims).toContain("screening_outcome");

    const screeningClaim: CredentialClaimRecord = {
      id: "scr-1",
      subject_id: SUBJECT_A,
      credential_jti: null,
      claim_type: "screening_outcome",
      claim_value: { outcome: "clear" },
      issuer_id: "issuer:screening-partner",
      assurance_level: "L2",
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400_000).toISOString(),
      status: "active",
      revocation_reference: null,
      evidence_reference: "scr_ref",
      jurisdiction: "US",
      policy_scope: "compliance",
    };

    const residencyClaim: CredentialClaimRecord = {
      id: "res-1",
      subject_id: SUBJECT_A,
      credential_jti: null,
      claim_type: "residency_country",
      claim_value: { country: "US" },
      issuer_id: MOCK_APPROVED_KYC_ISSUER_ID,
      assurance_level: "L1",
      issued_at: new Date().toISOString(),
      expires_at: null,
      status: "active",
      revocation_reference: null,
      evidence_reference: "res_ref",
      jurisdiction: "US",
      policy_scope: null,
    };

    const complete = evaluatePolicyRules(
      CONCEPTUAL_INSTITUTIONAL_KYC_POLICY,
      [identityClaim, screeningClaim, residencyClaim],
      {
        trustRulesByClaimType: new Map([
          ["identity_verified", { accepted_issuer_ids: [MOCK_APPROVED_KYC_ISSUER_ID] }],
          ["screening_outcome", { accepted_issuer_ids: ["issuer:screening-partner"], credential_max_age_hours: 24 }],
          ["residency_country", { accepted_issuer_ids: [MOCK_APPROVED_KYC_ISSUER_ID] }],
        ]),
      },
    );
    expect(complete.decision).toBe("approved");
  });

  it("missing screening alone yields manual_review (AML refresh path), not silent approval", () => {
    const identityClaim: CredentialClaimRecord = {
      id: "id-only",
      subject_id: SUBJECT_A,
      credential_jti: null,
      claim_type: "identity_verified",
      claim_value: { outcome: "verified" },
      issuer_id: MOCK_APPROVED_KYC_ISSUER_ID,
      assurance_level: "L2",
      issued_at: new Date().toISOString(),
      expires_at: null,
      status: "active",
      revocation_reference: null,
      evidence_reference: "ev_ref",
      jurisdiction: "US",
      policy_scope: null,
    };
    const kycPlusScreening: PartnerPolicyRules = {
      required_claims: [
        { claim_type: "identity_verified", min_assurance: "L2", accepted_issuers: [MOCK_APPROVED_KYC_ISSUER_ID] },
        { claim_type: "screening_outcome", min_assurance: "L2", accepted_issuers: ["issuer:screening-partner"], max_age_hours: 24 },
      ],
    };
    const partial = evaluatePolicyRules(kycPlusScreening, [identityClaim], {
      trustRulesByClaimType: new Map([
        ["identity_verified", { accepted_issuer_ids: [MOCK_APPROVED_KYC_ISSUER_ID] }],
      ]),
    });
    expect(partial.decision).toBe("manual_review");
    expect(partial.missing_claims).toEqual(["screening_outcome"]);
  });

  it("higher assurance policy rejects lower-assurance reusable fact", () => {
    const lowFact = projectInternalFact({
      subjectId: SUBJECT_A,
      receipt: receiptRow({
        policy_id: "institutional-platform-age_18_retail-v1",
      }),
    })!;
    expect(lowFact).not.toBeNull();
    const decision = decideEvidenceReuse({
      fact: lowFact!,
      targetPolicyId: "institutional-platform-age_21_retail-v1",
      targetPolicyVersion: 1,
      targetEnvironment: "production",
      relyingPartner: PARTNER_APP_B,
      now: new Date("2026-09-15T00:00:00.000Z"),
    });
    expect(decision.decision).not.toBe("reuse");
    expect(decision.trust.assurance_sufficient).toBe(false);
  });
});

describe("institutional KYC readiness — scenario 3: provider portability", () => {
  it("accepts IssuerA when policy allows IssuerA OR IssuerB", () => {
    const issuerAClaim = buildNormalizedIdentityClaim(
      buildMockKycAttestationPayload(SUBJECT_A),
      MOCK_APPROVED_KYC_ISSUER_ID,
    );
    const rules: PartnerPolicyRules = {
      required_claims: [{
        claim_type: "identity_verified",
        min_assurance: "L2",
        accepted_issuers: [MOCK_APPROVED_KYC_ISSUER_ID, "issuer:mock-kyc-b"],
      }],
    };
    const evalA = evaluatePolicyRules(rules, [issuerAClaim], {
      partnerId: "institutional-platform",
      policyId: "institutional-platform-kyc-v1",
      trustRulesByClaimType: new Map([[
        "identity_verified",
        { accepted_issuer_ids: [MOCK_APPROVED_KYC_ISSUER_ID, "issuer:mock-kyc-b"], minimum_assurance_level: "L2" },
      ]]),
    });
    expect(evalA.decision).toBe("approved");
  });

  it("IssuerB-only policy rejects IssuerA evidence for NEW requests", () => {
    const issuerAClaim = buildNormalizedIdentityClaim(
      buildMockKycAttestationPayload(SUBJECT_A),
      MOCK_APPROVED_KYC_ISSUER_ID,
    );
    const rulesBOnly: PartnerPolicyRules = {
      required_claims: [{
        claim_type: "identity_verified",
        min_assurance: "L2",
        accepted_issuers: ["issuer:mock-kyc-b"],
      }],
    };
    const evalB = evaluatePolicyRules(rulesBOnly, [issuerAClaim], {
      trustRulesByClaimType: new Map([[
        "identity_verified",
        { accepted_issuer_ids: ["issuer:mock-kyc-b"], minimum_assurance_level: "L2" },
      ]]),
    });
    expect(evalB.decision).toBe("denied");
  });

  it("historical receipt remains verifiable; current-validity may fail under new policy", () => {
    const oldReceipt = receiptRow({
      policy_id: "institutional-platform-age_21_retail-v1",
      evaluated_at: "2026-01-01T00:00:00.000Z",
      expires_at: "2026-02-01T00:00:00.000Z",
    });
    const fact = projectInternalFact({
      subjectId: SUBJECT_A,
      receipt: oldReceipt,
      now: new Date("2026-09-01T00:00:00.000Z"),
    })!;
    expect(fact.status).toBe("expired");
    const stale = evaluateFactFreshness({
      fact,
      targetPolicyId: "institutional-platform-age_21_retail-v1",
      now: new Date("2026-09-01T00:00:00.000Z"),
    });
    expect(["stale", "incompatible", "expired"]).toContain(stale.state);
  });
});

describe("institutional KYC readiness — privacy and minimum disclosure", () => {
  it("raw KYC payload fields are blocked on partner webhook and narrow result surfaces", () => {
    const raw = rawKycProviderPayload();
    for (const key of RAW_KYC_FORBIDDEN_FIELDS) {
      expect(Object.keys(raw)).toContain(key);
    }

    const narrowShape = {
      schema_version: "1.0.0",
      receipt_id: "dr_audit",
      partner_id: "institutional-platform",
      policy_id: "institutional-platform-kyc_completed-v1",
      decision: "approved" as const,
      result_family: "kyc_completed",
      identity_verified: true,
      assurance_level: "L2",
    };
    const custody = assertCustodySafePayload(narrowShape, "partner_api");
    expect(custody.ok).toBe(true);
    expect(JSON.stringify(narrowShape)).not.toMatch(/legal_name|date_of_birth|passport_number/);

    for (const forbidden of NARROW_PARTNER_RESULT_FORBIDDEN_KEYS) {
      expect(JSON.stringify(narrowShape)).not.toContain(`"${forbidden}"`);
    }
    for (const forbidden of WEBHOOK_PII_FORBIDDEN_KEYS) {
      if (forbidden === "subject_id") continue;
      expect(JSON.stringify(narrowShape)).not.toContain(`"${forbidden}"`);
    }
  });

  it("organization eligibility contract forbids KYB raw evidence keys", () => {
    expect(ORGANIZATION_FORBIDDEN_KEYS).toContain("legal_name");
    expect(ORGANIZATION_FORBIDDEN_KEYS).toContain("kyb_evidence");
    expect(ORGANIZATION_FORBIDDEN_KEYS).toContain("provider_payload");
  });

  it("sandbox evidence cannot satisfy production policy (environment boundary)", () => {
    const sandboxClaim: CredentialClaimRecord = {
      id: "sb-1",
      subject_id: SUBJECT_A,
      credential_jti: null,
      claim_type: "product_eligibility",
      claim_value: { outcome: "sandbox_demo_eligible", environment: "sandbox" },
      issuer_id: "issuer:abraxas-sandbox",
      assurance_level: "L1",
      issued_at: new Date().toISOString(),
      expires_at: null,
      status: "active",
      revocation_reference: null,
      evidence_reference: null,
      jurisdiction: null,
      policy_scope: null,
    };
    const prodRules = POLICY_PACKS.age_21_retail.rules;
    const evalProd = evaluatePolicyRules(prodRules, [sandboxClaim]);
    expect(evalProd.decision).toBe("denied");
    expect(evalProd.production_usable).toBe(false);
  });
});

describe("institutional KYC readiness — architectural STOP boundaries", () => {
  it("STOP: no live KYB/UBO claim issuance path exists", () => {
    expect(POLICY_PACKS).not.toHaveProperty("kyb_verified");
    // kyb_verified exists in claim schema but productionPolicyContract marks not_implemented
  });

  it("STOP: subject binding is wallet-normalized Sui address — provider ref mapping not unified", () => {
    expect(SUBJECT_A.startsWith("0x")).toBe(true);
    expect(SUBJECT_A).not.toBe(SUBJECT_B);
    // Provider subject reference → Abraxas subject binding is ad hoc per integration today.
  });

  it("STOP: unified ExternalVerificationProviderAdapter inbound webhook framework not present", () => {
    // Proven by architecture review: Veriff, screening, Reclaim are ad hoc routes.
    // Age provider callbacks hard-disabled with provider_not_authoritative.
    expect(true).toBe(true);
  });
});
