// FILE: lib/progressiveProof/evaluate.test.ts

import { describe, expect, it } from "vitest";
import { evaluateProgressiveProof } from "./evaluate";
import type { PartnerPolicyRules } from "@/lib/policy/types";

const browsePolicy: PartnerPolicyRules = {
  browse_access_only: true,
  required_claims: [
    { claim_type: "self_attested_age_band", must_equal: "over_21", max_age_hours: 24 },
  ],
};

const retailPolicy: PartnerPolicyRules = {
  required_claims: [
    { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
    { claim_type: "wallet_binding_confirmed", max_age_hours: 720, min_assurance: "L2" },
  ],
  consent_required: true,
};

describe("evaluateProgressiveProof", () => {
  it("requires sign-in before any eligibility", () => {
    const result = evaluateProgressiveProof({
      signedIn: false,
      walletBound: false,
      policyRules: browsePolicy,
    });
    expect(result.uiState).toBe("proof_needed");
    expect(result.nextEvidenceStep).toBe("sign_in");
    expect(result.signInIsNotProof).toBe(true);
  });

  it("never treats missing proof as eligible", () => {
    const result = evaluateProgressiveProof({
      signedIn: true,
      walletBound: true,
      policyRules: retailPolicy,
      policyDecision: "approved",
      missingClaims: ["identity_verified"],
    });
    expect(result.uiState).toBe("proof_needed");
    expect(result.missingClaimTypes).toContain("identity_verified");
  });

  it("maps approved policy with satisfied claims to eligible", () => {
    const result = evaluateProgressiveProof({
      signedIn: true,
      walletBound: true,
      consentGranted: true,
      policyRules: browsePolicy,
      policyDecision: "approved",
      missingClaims: [],
      heldClaims: [{
        claimType: "self_attested_age_band",
        issuerId: "issuer:abraxas-self-attest",
        assuranceLevel: "L0",
        issuedAt: new Date().toISOString(),
        expiresAt: null,
        status: "active",
        walletBindingRequired: false,
        credentialJti: null,
      }],
    });
    expect(result.uiState).toBe("eligible");
    expect(result.missingClaimTypes).toHaveLength(0);
  });

  it("routes browse missing claims to self_attest", () => {
    const result = evaluateProgressiveProof({
      signedIn: true,
      walletBound: true,
      policyRules: browsePolicy,
      missingClaims: ["self_attested_age_band"],
    });
    expect(result.uiState).toBe("proof_needed");
    expect(result.nextEvidenceStep).toBe("self_attest");
  });

  it("maps revoked required claims to denied", () => {
    const result = evaluateProgressiveProof({
      signedIn: true,
      walletBound: true,
      policyRules: retailPolicy,
      heldClaims: [{
        claimType: "identity_verified",
        issuerId: "issuer:abraxas",
        assuranceLevel: "L2",
        issuedAt: new Date().toISOString(),
        expiresAt: null,
        status: "revoked",
        walletBindingRequired: false,
        credentialJti: "jti_revoked",
      }],
    });
    expect(result.uiState).toBe("denied");
  });

  it("maps manual_review to pending", () => {
    const result = evaluateProgressiveProof({
      signedIn: true,
      walletBound: true,
      policyRules: retailPolicy,
      policyDecision: "manual_review",
    });
    expect(result.uiState).toBe("pending");
  });
});
