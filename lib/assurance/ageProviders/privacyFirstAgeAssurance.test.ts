// FILE: lib/assurance/ageProviders/privacyFirstAgeAssurance.test.ts
// Privacy-first age-assurance trust boundaries and provider-neutral architecture.

import { describe, expect, it, vi } from "vitest";
import {
  evaluateSocialSignalForAgePolicy,
  claimedSocialBirthdayCannotSatisfyPolicy,
  assertSocialSignalNotUsedAsAgeEvidence,
  type SocialAccountSignal,
} from "./socialSignalPolicy";
import {
  listAvailableAgeAssuranceProviderMeta,
  listConfiguredAgeAssuranceProviderMeta,
  ageBandSatisfiesThreshold,
  assertKnownProvider,
} from "./registry";
import {
  isAuthoritativeAgeAssuranceResult,
  mapAgeBandToEligibilityOutcome,
} from "./eligibility";
import { reuseExistingAgeCredential } from "./reuseService";
import { consumeAgeAssuranceCallback } from "./sessionService";
import { buildProductEligibilityClaimsForIssuance } from "@/lib/idv/buildProductEligibilityClaims";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { buildPartnerVerificationResult } from "@/lib/partner/partnerVerificationResult";
import { assertMerchantSafeCredentialView } from "@/lib/assurance/reusableCredential";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { PRODUCTION_PARTNER_POLICIES, GOOD_TROUBLE_RETAIL_V2_PENDING_RULES } from "@/lib/policy/productionPolicyContract";
import {
  abraxasCaptureApprovedClaims,
  productEligibilityClaim,
  walletBindingClaim,
  type CredentialClaimRecord,
} from "@/lib/credentials/claimSchema";
import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { normalizeSuiAddress } from "@mysten/sui/utils";

const HOLDER = normalizeSuiAddress("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd");
const JTI = "urn:uuid:privacy-age-test";
const EXPIRES = new Date("2027-06-01T00:00:00Z");

function socialSignal(provider: SocialAccountSignal["provider"]): SocialAccountSignal {
  return {
    provider,
    authenticated: true,
    emailVerified: true,
    accountSubjectHash: "hash",
    claimedBirthday: "1990-01-01",
    accountAgeDays: 3650,
  };
}

function withStatus(claims: Omit<CredentialClaimRecord, "id" | "status">[]): CredentialClaimRecord[] {
  return claims.map((c, i) => ({ ...c, id: `claim-${i}`, status: "active" as const }));
}

describe("social login is not age proof", () => {
  it("Google authentication alone cannot satisfy over_21", () => {
    const result = evaluateSocialSignalForAgePolicy(socialSignal("google"), 21);
    expect(result.satisfiesPolicy).toBe(false);
    expect(result.reasonCode).toBe("social_google_not_age_proof");
  });

  it("LinkedIn authentication alone cannot satisfy over_21", () => {
    const result = evaluateSocialSignalForAgePolicy(socialSignal("linkedin"), 21);
    expect(result.satisfiesPolicy).toBe(false);
  });

  it("Facebook authentication alone cannot satisfy over_21", () => {
    const result = evaluateSocialSignalForAgePolicy(socialSignal("facebook"), 21);
    expect(result.satisfiesPolicy).toBe(false);
  });

  it("claimed social birthday cannot satisfy policy", () => {
    expect(claimedSocialBirthdayCannotSatisfyPolicy("1990-01-01", 21)).toBe(true);
  });

  it("social oauth cannot issue age claims", () => {
    expect(() => assertSocialSignalNotUsedAsAgeEvidence("over_21", "social_google")).toThrow();
    expect(() => assertSocialSignalNotUsedAsAgeEvidence("product_eligibility", "oauth_profile")).toThrow();
  });
});

describe("authoritative provider results", () => {
  it("valid authoritative provider result can satisfy over_21", () => {
    const result = {
      verified: true,
      ageBand: "over_21" as const,
      assuranceLevel: "L3",
      evidenceRefHash: "abc123",
      providerId: "digital_wallet_age",
    };
    expect(isAuthoritativeAgeAssuranceResult(result, 21)).toBe(true);
    expect(mapAgeBandToEligibilityOutcome("over_21")).toBe("over_21");
  });

  it("under-21, unknown or ambiguous result fails closed", () => {
    for (const ageBand of ["under_18", "unknown"] as const) {
      expect(isAuthoritativeAgeAssuranceResult({
        verified: true,
        ageBand,
        assuranceLevel: "L2",
        evidenceRefHash: "hash",
        providerId: "test",
      }, 21)).toBe(false);
    }
    expect(isAuthoritativeAgeAssuranceResult({
      verified: false,
      ageBand: "over_21",
      assuranceLevel: "L2",
      evidenceRefHash: "hash",
      providerId: "test",
    }, 21)).toBe(false);
  });

  it("authoritative age band issues product_eligibility without DOB", () => {
    const claims = buildProductEligibilityClaimsForIssuance({
      subjectId: HOLDER,
      jti: JTI,
      authoritativeAgeBand: "over_21",
      minimumAgeGate: 21,
      expiresAt: EXPIRES,
      evidenceReference: "provider:hash",
    });
    expect(claims).toHaveLength(1);
    expect(claims[0].claim_type).toBe("product_eligibility");
    expect(claims[0].claim_value).toEqual({ outcome: "over_21" });
  });
});

describe("provider registry", () => {
  it("placeholder providers are disabled by default", () => {
    const configured = listConfiguredAgeAssuranceProviderMeta();
    expect(configured.every(p => !p.configured)).toBe(true);
    expect(configured.every(p => !p.authoritative)).toBe(true);
    expect(listAvailableAgeAssuranceProviderMeta(21)).toHaveLength(0);
  });

  it("env flags and API keys cannot make placeholders authoritative", async () => {
    const prevEnabled = process.env.AGE_ASSURANCE_DIGITAL_WALLET_ENABLED;
    const prevKey = process.env.AGE_ASSURANCE_DIGITAL_WALLET_API_KEY;
    process.env.AGE_ASSURANCE_DIGITAL_WALLET_ENABLED = "true";
    process.env.AGE_ASSURANCE_DIGITAL_WALLET_API_KEY = "operator-supplied-key";

    const { digitalWalletAgeProvider } = await import("./adapters/stubProvider");
    const { isProviderAuthoritative } = await import("./providerAuthority");

    expect(digitalWalletAgeProvider.isProductionCapable()).toBe(false);
    expect(digitalWalletAgeProvider.isConfigured()).toBe(false);
    expect(isProviderAuthoritative(digitalWalletAgeProvider)).toBe(false);
    expect(listAvailableAgeAssuranceProviderMeta(21)).toHaveLength(0);

    process.env.AGE_ASSURANCE_DIGITAL_WALLET_ENABLED = prevEnabled;
    process.env.AGE_ASSURANCE_DIGITAL_WALLET_API_KEY = prevKey;
  });

  it("placeholder verifyCallback always fails closed", async () => {
    const { digitalWalletAgeProvider } = await import("./adapters/stubProvider");
    const result = await digitalWalletAgeProvider.verifyCallback({
      providerSessionId: "ps-1",
      callbackPayload: { simulated_age_band: "over_21" },
    });
    expect(result.verified).toBe(false);
    expect(result.ageBand).toBe("unknown");
    expect(result.reasonCode).toBe("placeholder_not_authoritative");
  });

  it("rejects unknown provider IDs", () => {
    expect(() => assertKnownProvider("unknown_vendor")).toThrow("unknown_provider");
  });

  it("provider outage does not silently approve", () => {
    expect(ageBandSatisfiesThreshold("unknown", 21)).toBe(false);
  });
});

describe("credential reuse and partner receipts", () => {
  const financialPolicy = PRODUCTION_PARTNER_POLICIES.find(p => p.id === "abraxas-rwa-us-v1")!;

  function cannabisCredential(): CredentialClaimRecord[] {
    return withStatus([
      ...abraxasCaptureApprovedClaims({
        subjectId: HOLDER,
        jti: JTI,
        jurisdiction: "US-MO",
        documentType: "drivers_license",
        expiresAt: EXPIRES,
        captureSessionId: "cap-1",
        reviewMethod: "automated_biometric",
        biometricScores: { face_match: 0.95, liveness: 0.94 },
      }),
      walletBindingClaim({ subjectId: HOLDER, walletAddress: HOLDER, bindingMethod: "zklogin" }),
      productEligibilityClaim({
        subjectId: HOLDER,
        jti: JTI,
        outcome: "over_21",
        expiresAt: EXPIRES,
      }),
    ]);
  }

  it("existing valid credential can satisfy policy without recollection", () => {
    const evaluation = evaluatePolicyRules(GOOD_TROUBLE_RETAIL_V2_PENDING_RULES, cannabisCredential(), {
      jurisdiction: "US",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    expect(evaluation.decision).toBe("approved");
  });

  it("expired credential fails closed", () => {
    const expired = withStatus([
      ...cannabisCredential().map(c =>
        c.claim_type === "product_eligibility"
          ? { ...c, expires_at: "2020-01-01T00:00:00.000Z" }
          : c,
      ),
    ]);
    const evaluation = evaluatePolicyRules(GOOD_TROUBLE_RETAIL_V2_PENDING_RULES, expired, {
      jurisdiction: "US",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    expect(evaluation.decision).not.toBe("approved");
  });

  it("revoked credential fails closed", () => {
    const revoked = cannabisCredential().map(c => ({ ...c, status: "revoked" as const }));
    const evaluation = evaluatePolicyRules(GOOD_TROUBLE_RETAIL_V2_PENDING_RULES, revoked, {
      jurisdiction: "US",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    expect(evaluation.decision).not.toBe("approved");
  });

  it("financial policy cannot be satisfied by cannabis age credential", () => {
    const evaluation = evaluatePolicyRules(financialPolicy.rules, cannabisCredential(), {
      jurisdiction: "US",
      partnerId: "abraxas",
      policyId: financialPolicy.id,
    });
    expect(evaluation.decision).not.toBe("approved");
  });

  it("receipts contain no DOB, images, social data or provider payload", () => {
    const result = buildPartnerVerificationResult({
      decision: "approved",
      credentialJti: JTI,
      issuer: "did:web:abraxas.world",
      evaluatedAt: new Date().toISOString(),
      receiptId: "rcpt-privacy",
      receiptExpiresAt: EXPIRES.toISOString(),
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      identityVerified: true,
      minimumAge: 21,
      productEligibilityRequired: true,
      productEligibilityVerified: true,
      assuranceLevel: "L2",
    });
    expect(() => assertMerchantSafeCredentialView(result as unknown as Record<string, unknown>)).not.toThrow();
    expect(result).not.toHaveProperty("date_of_birth");
    expect(result).not.toHaveProperty("oauth_sub");
  });

  it("partner mismatch is rejected", () => {
    const validation = validatePartnerFlowPublicReceipt(
      {
        receipt_id: "dr_privacy",
        schema_version: "1.0.0",
        partner_id: "other-partner",
        policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
        decision_result: "approved",
        signature_valid: true,
        expires_at: "2099-01-01T00:00:00.000Z",
        status: "active",
        artifact_type: "eligibility_decision_receipt",
        production_usable: true,
        decision_context: "production",
        currently_valid: true,
        validity: "active",
        invalidation_reasons: [],
        evaluated_claim_refs: [],
      },
      {
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
        now: new Date("2026-01-01"),
      },
    );
    expect(validation.ok).toBe(false);
  });

  it("Good Trouble remains only a policy configuration", () => {
    const gtPolicy = PRODUCTION_PARTNER_POLICIES.find(p => p.id === GOOD_TROUBLE_RETAIL_POLICY_ID);
    expect(gtPolicy?.partnerId).toBe(GOOD_TROUBLE_PARTNER_ID);
    expect(listConfiguredAgeAssuranceProviderMeta().every(p => p.id !== GOOD_TROUBLE_PARTNER_ID)).toBe(true);
  });
});

describe("session callback replay protection", () => {
  function mockSupabaseSession(session: Record<string, unknown> | null) {
    const maybeSingle = vi.fn().mockResolvedValue({ data: session });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    return { from };
  }

  it("callback replay is rejected", async () => {
    const session = {
      id: "sess-1",
      session_nonce: "nonce-1",
      provider_id: "digital_wallet_age",
      provider_session_id: "ps-1",
      subject_sui_address: HOLDER,
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
      return_url: "https://partner.example/return",
      requested_threshold: 21,
      status: "completed",
      age_band_result: "over_21",
      assurance_level: "L3",
      evidence_ref_hash: "hash",
      callback_consumed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60000).toISOString(),
      completed_at: new Date().toISOString(),
      reason_code: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await consumeAgeAssuranceCallback({
      sessionNonce: "nonce-1",
      providerId: "digital_wallet_age",
      providerSessionId: "ps-1",
      subjectSuiAddress: HOLDER,
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      ageBand: "over_21",
      assuranceLevel: "L3",
      evidenceRefHash: "hash",
      verified: true,
      sb: mockSupabaseSession(session) as never,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.replay).toBe(true);
  });

  it("callback subject/partner/policy mismatch fails closed", async () => {
    const session = {
      id: "sess-2",
      session_nonce: "nonce-2",
      provider_id: "digital_wallet_age",
      provider_session_id: "ps-2",
      subject_sui_address: HOLDER,
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
      return_url: "https://partner.example/return",
      requested_threshold: 21,
      status: "pending",
      age_band_result: null,
      assurance_level: null,
      evidence_ref_hash: null,
      callback_consumed_at: null,
      expires_at: new Date(Date.now() + 60000).toISOString(),
      completed_at: null,
      reason_code: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await consumeAgeAssuranceCallback({
      sessionNonce: "nonce-2",
      providerId: "digital_wallet_age",
      providerSessionId: "ps-2",
      subjectSuiAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      ageBand: "over_21",
      assuranceLevel: "L3",
      evidenceRefHash: "hash",
      verified: true,
      sb: mockSupabaseSession(session) as never,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("subject_mismatch");
  });
});

vi.mock("@/lib/partner/returnUrlAllowlist", () => ({
  isAllowedPartnerReturnUrl: vi.fn(async () => true),
}));

vi.mock("@/lib/partner/relyingPartyFlow", () => ({
  getHolderCredentialStatus: vi.fn(),
  completePartnerFlowAfterApproval: vi.fn(),
}));

vi.mock("@/lib/policy/evaluateSubjectPolicy", () => ({
  evaluatePolicyForSubject: vi.fn(),
}));

describe("reuse service", () => {
  it("expired credential fails closed on reuse", async () => {
    const { getHolderCredentialStatus } = await import("@/lib/partner/relyingPartyFlow");
    vi.mocked(getHolderCredentialStatus).mockResolvedValue({ status: "expired" });

    const result = await reuseExistingAgeCredential({
      suiAddress: HOLDER,
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      returnUrl: "https://goodtrouble.example/return",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("credential_expired");
  });
});
