// FILE: lib/progressiveProof/progressiveProofFlows.test.ts
// Cross-industry progressive proof regressions — Good Trouble browse + Stocklana-like Solana pilot.

import { describe, expect, it } from "vitest";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { PRODUCTION_PARTNER_POLICIES } from "@/lib/policy/productionPolicyContract";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { evaluateProgressiveProofFromPolicy } from "./evaluateFromSubject";
import { buildPartnerVerificationSurface } from "./partnerSurface";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { PartnerPolicyRules } from "@/lib/policy/types";

/** Stocklana-like pilot fixture — Solana wallet + age assurance without Abraxas chain adoption. */
const STOCKLANA_LIKE_POLICY: PartnerPolicyRules = {
  sandbox_only: true,
  required_claims: [
    { claim_type: "wallet_binding_confirmed", max_age_hours: 720, min_assurance: "L2" },
    { claim_type: "liveness_passed", max_age_hours: 8760, min_assurance: "L2" },
  ],
  consent_required: true,
  minimum_age: 21,
};

function browseClaim(): CredentialClaimRecord {
  const now = new Date().toISOString();
  return {
    id: "self-attest:gt-browse",
    subject_id: "0xabc",
    credential_jti: null,
    claim_type: "self_attested_age_band",
    claim_value: {
      outcome: "over_21",
      provenance: "user_self_attestation",
      purpose: "browse",
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
    },
    issuer_id: "issuer:abraxas-self-attest",
    assurance_level: "L0",
    issued_at: now,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    status: "active",
    revocation_reference: null,
    evidence_reference: "br_test",
    jurisdiction: null,
    policy_scope: GOOD_TROUBLE_BROWSE_POLICY_ID,
  };
}

describe("Good Trouble browse progressive proof", () => {
  const browsePolicy = PRODUCTION_PARTNER_POLICIES.find((p) => p.id === GOOD_TROUBLE_BROWSE_POLICY_ID)!;

  it("approves L0 self-attestation without identity credential", () => {
    const evaluation = evaluatePolicyRules(browsePolicy.rules, [browseClaim()]);
    expect(evaluation.decision).toBe("approved");
    expect(evaluation.missing_claims).toHaveLength(0);

    const progressive = evaluateProgressiveProofFromPolicy({
      signedIn: true,
      walletBound: true,
      policyRules: browsePolicy.rules,
      policyEvaluation: evaluation,
      heldClaims: [browseClaim()],
    });
    expect(progressive.uiState).toBe("eligible");

    const surface = buildPartnerVerificationSurface({ evaluation: progressive, policyEvaluation: evaluation });
    expect(surface.decision).toBe("approved");
    expect(surface.withheld).toContain("date_of_birth");
    expect(surface.disclosedClaims).not.toContain("passport_image");
  });

  it("does not let Google sign-in alone satisfy retail checkout", () => {
    const retail = PRODUCTION_PARTNER_POLICIES.find((p) => p.id === GOOD_TROUBLE_RETAIL_POLICY_ID)!;
    const evaluation = evaluatePolicyRules(retail.rules, []);
    expect(evaluation.decision).not.toBe("approved");

    const progressive = evaluateProgressiveProofFromPolicy({
      signedIn: true,
      walletBound: true,
      policyRules: retail.rules,
      policyEvaluation: evaluation,
      heldClaims: [],
    });
    expect(progressive.uiState).toBe("proof_needed");
    expect(progressive.signInIsNotProof).toBe(true);
  });
});

describe("Stocklana-like Solana eligibility fixture", () => {
  it("requires wallet binding and liveness — sign-in alone is insufficient", () => {
    const evaluation = evaluatePolicyRules(STOCKLANA_LIKE_POLICY, []);
    expect(evaluation.missing_claims).toEqual([
      "wallet_binding_confirmed",
      "liveness_passed",
    ]);

    const signedInOnly = evaluateProgressiveProofFromPolicy({
      signedIn: true,
      walletBound: false,
      consentGranted: true,
      policyRules: STOCKLANA_LIKE_POLICY,
      policyEvaluation: evaluation,
    });
    expect(signedInOnly.uiState).toBe("proof_needed");
    expect(signedInOnly.nextEvidenceStep).toBe("bind_wallet");
  });

  it("surfaces chain-agnostic partner result when claims satisfy policy", () => {
    const now = new Date().toISOString();
    const claims: CredentialClaimRecord[] = [
      {
        id: "claim:wallet",
        subject_id: "0xsol",
        credential_jti: "jti_wallet",
        claim_type: "wallet_binding_confirmed",
        claim_value: { chain: "solana", address: "So1ana..." },
        issuer_id: "issuer:abraxas",
        assurance_level: "L2",
        issued_at: now,
        expires_at: new Date(Date.now() + 720 * 3600000).toISOString(),
        status: "active",
        revocation_reference: null,
        evidence_reference: null,
        jurisdiction: null,
        policy_scope: "stocklana-pilot-v1",
      },
      {
        id: "claim:liveness",
        subject_id: "0xsol",
        credential_jti: "jti_live",
        claim_type: "liveness_passed",
        claim_value: { outcome: "pass" },
        issuer_id: "issuer:abraxas",
        assurance_level: "L2",
        issued_at: now,
        expires_at: new Date(Date.now() + 8760 * 3600000).toISOString(),
        status: "active",
        revocation_reference: null,
        evidence_reference: null,
        jurisdiction: null,
        policy_scope: "stocklana-pilot-v1",
      },
    ];

    const evaluation = evaluatePolicyRules(STOCKLANA_LIKE_POLICY, claims);
    expect(evaluation.decision).toBe("approved");

    const progressive = evaluateProgressiveProofFromPolicy({
      signedIn: true,
      walletBound: true,
      consentGranted: true,
      policyRules: STOCKLANA_LIKE_POLICY,
      policyEvaluation: evaluation,
      heldClaims: claims,
    });
    expect(progressive.uiState).toBe("eligible");

    const surface = buildPartnerVerificationSurface({ evaluation: progressive, policyEvaluation: evaluation });
    expect(surface.receiptRequired).toBe(true);
    expect(surface.disclosedClaims).toContain("wallet_binding_confirmed");
    expect(surface.withheld).toContain("raw_document");
  });
});
