// FILE: lib/idv/goodTroubleIdentityReviewPrivacy.test.ts

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  shouldEscalatePartnerRejectToHumanReview,
  withPartnerHumanReviewEscalation,
  isHardBiometricReject,
} from "@/lib/idv/partnerCaptureReviewRouting";
import {
  RAW_IDENTITY_EVIDENCE_RETENTION_ENV,
  resolveRawEvidenceRetentionDays,
} from "@/lib/idv/rawEvidenceRetention";
import {
  eligibilityResultFromMinimumAge,
  hashEvidenceBuffers,
} from "@/lib/idv/identityReviewSession";
import {
  purgeRawEvidenceForSession,
  findPurgeEligibleSessions,
} from "@/lib/idv/rawEvidencePurge";
import {
  subjectLabelFromAddress,
  sanitizeBiometricForList,
} from "@/lib/admin/identityReviewQueueResponse";
import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import type { BiometricAssessment } from "@/lib/idv/biometric/types";
import { resolvePartnerFlowStep } from "@/lib/partner/relyingPartyFlow";
import { buildPartnerVerificationResult } from "@/lib/partner/partnerVerificationResult";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  abraxasCaptureApprovedClaims,
  productEligibilityClaim,
  walletBindingClaim,
  type CredentialClaimRecord,
} from "@/lib/credentials/claimSchema";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { resolveEffectivePolicyRules } from "@/lib/policy/resolveEffectivePolicyRules";
import { PRODUCTION_PARTNER_POLICIES } from "@/lib/policy/productionPolicyContract";
import type { PartnerPolicy } from "@/lib/policy/types";
import { shouldEnforceStrictProductionAdminAccess } from "@/lib/adminAuth";

function mockAssessment(overrides: Partial<BiometricAssessment> = {}): BiometricAssessment {
  return {
    capture_session_id: "sess-gt-1",
    sui_address: "0xabc",
    scores: { face_match: 0.7, liveness: 0.72, document_quality: 0.8, selfie_quality: 0.75 },
    decision: "reject",
    assurance_level: "L2",
    review_method: "human_biometric_match",
    engine_version: "test",
    reasons: ["Fraud risk high"],
    reason_codes: ["FRAUD_RISK_HIGH"],
    signals: {
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      selfie_face_count: 1,
      selfie_face_presence: 0.9,
      id_face_presence: 0.85,
      fraud_risk_score: 0.4,
    },
    analyzed_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("Good Trouble identity review routing", () => {
  const gtPolicyContext = {
    partnerId: GOOD_TROUBLE_PARTNER_ID,
    policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    policyRules: { minimum_age: 21, sandbox_only: true },
  };

  it("escalates soft engine reject to human review for age-gated partner flows", () => {
    const assessment = mockAssessment();
    expect(shouldEscalatePartnerRejectToHumanReview(assessment, gtPolicyContext)).toBe(true);
    const escalated = withPartnerHumanReviewEscalation(assessment, gtPolicyContext);
    expect(escalated.decision).toBe("human_review");
    expect(escalated.reason_codes).toContain("PARTNER_HUMAN_REVIEW_ESCALATION");
  });

  it("does not escalate hard biometric rejects", () => {
    const assessment = mockAssessment({
      reason_codes: ["SELFIE_MULTIPLE_FACES"],
      signals: { selfie_face_count: 2, selfie_face_presence: 0.9, id_face_presence: 0.9 },
    });
    expect(isHardBiometricReject(assessment)).toBe(true);
    expect(shouldEscalatePartnerRejectToHumanReview(assessment, gtPolicyContext)).toBe(false);
  });

  it("does not escalate non-partner flows", () => {
    const assessment = mockAssessment();
    expect(shouldEscalatePartnerRejectToHumanReview(assessment, {})).toBe(false);
  });
});

describe("identity review session helpers", () => {
  it("maps eligibility result from minimum age gate", () => {
    expect(eligibilityResultFromMinimumAge(21)).toBe("over_21");
    expect(eligibilityResultFromMinimumAge(18)).toBe("over_18");
  });

  it("hashes evidence buffers without storing PII", () => {
    const hash = hashEvidenceBuffers(Buffer.from("id"), Buffer.from("selfie"));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("raw evidence retention config", () => {
  it("fails safely when retention env is absent", () => {
    const result = resolveRawEvidenceRetentionDays({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(RAW_IDENTITY_EVIDENCE_RETENTION_ENV);
    }
  });

  it("accepts valid retention days", () => {
    const result = resolveRawEvidenceRetentionDays({ RAW_IDENTITY_EVIDENCE_RETENTION_DAYS: "90" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.retentionDays).toBe(90);
  });

  it("rejects invalid retention values", () => {
    const result = resolveRawEvidenceRetentionDays({ RAW_IDENTITY_EVIDENCE_RETENTION_DAYS: "0" });
    expect(result.ok).toBe(false);
  });
});

describe("admin queue privacy shaping", () => {
  it("does not expose email or legal name in list labels", () => {
    const label = subjectLabelFromAddress("0x1234567890abcdef1234567890abcdef12345678");
    expect(label).toContain("Subject");
    expect(label).not.toContain("@");
  });

  it("sanitizes biometric signals for list view", () => {
    const sanitized = sanitizeBiometricForList({
      decision: "human_review",
      signals: {
        partner_id: GOOD_TROUBLE_PARTNER_ID,
        fraud_risk_score: 0.2,
        reason_codes: ["FRAUD_RISK_HIGH"],
        legal_name: "should-not-appear",
      },
    });
    expect(sanitized?.signals).toEqual({
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      threshold_policy_source: undefined,
      fraud_risk_score: 0.2,
      reason_codes: ["FRAUD_RISK_HIGH"],
    });
    expect(JSON.stringify(sanitized)).not.toContain("should-not-appear");
  });
});

describe("raw evidence purge", () => {
  beforeEach(() => {
    vi.stubEnv("RAW_IDENTITY_EVIDENCE_RETENTION_DAYS", "30");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires retention config for eligibility scan", async () => {
    vi.stubEnv("RAW_IDENTITY_EVIDENCE_RETENTION_DAYS", "");
    const sb = {
      from: () => ({
        select: () => ({
          is: () => ({
            in: () => ({
              lte: () => ({
                order: () => ({
                  limit: () => ({ eq: () => ({}) }),
                }),
              }),
            }),
          }),
        }),
      }),
    } as never;
    const result = await findPurgeEligibleSessions(sb);
    expect(result.ok).toBe(false);
  });

  it("purge is idempotent when already purged", async () => {
    const sb = {
      from: (table: string) => {
        if (table === "identity_review_sessions") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "sess-row-1",
                    capture_session_id: "cap-1",
                    purge_attempt_count: 1,
                    raw_evidence_purged_at: "2026-01-01T00:00:00Z",
                    review_status: "approved",
                    updated_at: "2026-01-01T00:00:00Z",
                  },
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({}) }) };
      },
      storage: { from: () => ({ remove: async () => ({ error: null }) }) },
    } as never;

    const result = await purgeRawEvidenceForSession("cap-1", { sb, force: true });
    expect(result.ok).toBe(true);
    expect(result.already_purged).toBe(true);
  });
});

describe("repeat visit after purge", () => {
  const HOLDER = "0xrepeatvisitabcdefabcdefabcdefabcdefabcd";
  const JTI = "urn:uuid:gt-repeat-purge";
  const EXPIRES = new Date("2027-06-01T00:00:00Z");

  function claims(): CredentialClaimRecord[] {
    const base = [
      ...abraxasCaptureApprovedClaims({
        subjectId: HOLDER,
        jti: JTI,
        jurisdiction: "US-MO",
        documentType: "drivers_license",
        expiresAt: EXPIRES,
        captureSessionId: "cap-repeat-purge",
        reviewMethod: "human_biometric_match",
        biometricScores: { face_match: 0.95, liveness: 0.94 },
      }),
      walletBindingClaim({ subjectId: HOLDER, walletAddress: HOLDER, bindingMethod: "zklogin" }),
      productEligibilityClaim({
        subjectId: HOLDER,
        jti: JTI,
        outcome: "over_21",
        expiresAt: EXPIRES,
      }),
    ];
    return base.map((c, i) => ({ ...c, id: `claim-${i}`, status: "active" as const }));
  }

  const gtDef = PRODUCTION_PARTNER_POLICIES.find(p => p.id === GOOD_TROUBLE_RETAIL_POLICY_ID)!;
  const policy: PartnerPolicy = {
    id: gtDef.id,
    partner_id: gtDef.partnerId,
    name: gtDef.id,
    version: 1,
    status: "active",
    rules_json: gtDef.rules,
  };

  it("re-evaluates credential and issues fresh partner-bound receipt without DOB in payload", () => {
    const effectiveRules = resolveEffectivePolicyRules(policy);
    const evaluation = evaluatePolicyRules(effectiveRules, claims(), {
      jurisdiction: "US",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    expect(evaluation.decision).toBe("approved");

    const step = resolvePartnerFlowStep({
      authenticated: true,
      credentialStatus: "active",
      policyDecision: evaluation.decision,
    });
    expect(step).toBe("enter");

    const receipt = buildPartnerVerificationResult({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      decision: "approved",
      credentialJti: JTI,
      issuer: "https://abraxasworld.xyz",
      evaluatedAt: new Date().toISOString(),
      receiptId: "rcpt-repeat-purge-1",
      receiptExpiresAt: EXPIRES.toISOString(),
      identityVerified: true,
      productEligibilityRequired: true,
      productEligibilityVerified: true,
      minimumAge: 21,
      assuranceLevel: "L2",
    });
    const serialized = JSON.stringify(receipt);
    expect(serialized.toLowerCase()).not.toContain("document_date_of_birth");
    expect(serialized.toLowerCase()).not.toContain("document_number");
    expect(serialized.toLowerCase()).not.toContain("legal_name");
    expect(receipt.partner_id).toBe(GOOD_TROUBLE_PARTNER_ID);
    expect(receipt.policy_id).toBe(GOOD_TROUBLE_RETAIL_POLICY_ID);
    expect(receipt.over_21).toBe(true);
    const mismatch = validatePartnerFlowPublicReceipt(
      { ...receipt, partner_id: "other-partner" },
      {
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
        mode: "sandbox",
      },
    );
    expect(mismatch.ok).toBe(false);
  });
});

describe("production admin auth boundary", () => {
  it("enforces strict session auth on production origin", () => {
    expect(
      shouldEnforceStrictProductionAdminAccess({
        NEXT_PUBLIC_APP_URL: "https://abraxasworld.xyz",
      }),
    ).toBe(true);
  });

  it("allows PIN fallback on localhost", () => {
    expect(
      shouldEnforceStrictProductionAdminAccess({
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }),
    ).toBe(false);
  });
});
