// FILE: lib/progressiveProof/evaluate.security.test.ts
// Fail-closed security regressions — spoofed inputs cannot manufacture eligibility.

import { describe, expect, it } from "vitest";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { PRODUCTION_PARTNER_POLICIES } from "@/lib/policy/productionPolicyContract";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { evaluateProgressiveProof } from "./evaluate";
import { evaluateProgressiveProofFromPolicy } from "./evaluateFromSubject";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";

function browseClaim(overrides: Partial<CredentialClaimRecord> = {}): CredentialClaimRecord {
  const now = new Date().toISOString();
  return {
    id: "self-attest:browse",
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
    ...overrides,
  };
}

describe("evaluateProgressiveProof security", () => {
  const retail = PRODUCTION_PARTNER_POLICIES.find((p) => p.id === GOOD_TROUBLE_RETAIL_POLICY_ID)!;
  const browse = PRODUCTION_PARTNER_POLICIES.find((p) => p.id === GOOD_TROUBLE_BROWSE_POLICY_ID)!;

  it("rejects manufactured eligibility via missingClaims: [] without held claims", () => {
    const result = evaluateProgressiveProof({
      signedIn: true,
      walletBound: true,
      policyRules: retail.rules,
      policyDecision: "approved",
      missingClaims: [],
    });
    expect(result.uiState).not.toBe("eligible");
    expect(result.uiState).toBe("proof_needed");
  });

  it("rejects manufactured eligibility via missingClaims: [] with empty held snapshot", () => {
    const result = evaluateProgressiveProof({
      signedIn: true,
      walletBound: true,
      policyRules: retail.rules,
      policyDecision: "approved",
      missingClaims: [],
      heldClaims: [],
    });
    expect(result.uiState).toBe("proof_needed");
    expect(result.missingClaimTypes.length).toBeGreaterThan(0);
  });

  it("browse L0 claim cannot satisfy retail policy", () => {
    const evaluation = evaluatePolicyRules(retail.rules, [browseClaim()]);
    expect(evaluation.decision).not.toBe("approved");
    expect(evaluation.missing_claims.length).toBeGreaterThan(0);

    const progressive = evaluateProgressiveProofFromPolicy({
      signedIn: true,
      walletBound: true,
      policyRules: retail.rules,
      policyEvaluation: evaluation,
      heldClaims: [browseClaim()],
    });
    expect(progressive.uiState).toBe("proof_needed");
  });

  it("browse claim scoped to wrong policy cannot satisfy retail evaluation", () => {
    const wrongPolicy = browseClaim({
      claim_value: {
        outcome: "over_21",
        provenance: "user_self_attestation",
        purpose: "browse",
        partner_id: GOOD_TROUBLE_PARTNER_ID,
        policy_id: "wrong-policy-id",
      },
    });
    const evaluation = evaluatePolicyRules(retail.rules, [wrongPolicy]);
    expect(evaluation.decision).not.toBe("approved");
    expect(evaluation.missing_claims.length).toBeGreaterThan(0);
  });

  it("expired browse claim fails closed", () => {
    const expired = browseClaim({
      status: "expired",
      expires_at: new Date(Date.now() - 86400000).toISOString(),
    });
    const evaluation = evaluatePolicyRules(browse.rules, [expired]);
    expect(evaluation.decision).not.toBe("approved");

    const progressive = evaluateProgressiveProofFromPolicy({
      signedIn: true,
      walletBound: true,
      policyRules: browse.rules,
      policyEvaluation: evaluation,
      heldClaims: [expired],
    });
    expect(progressive.uiState).toBe("expired");
  });

  it("revoked browse claim fails closed", () => {
    const revoked = browseClaim({ status: "revoked" });
    const progressive = evaluateProgressiveProofFromPolicy({
      signedIn: true,
      walletBound: true,
      policyRules: browse.rules,
      heldClaims: [revoked],
    });
    expect(progressive.uiState).toBe("denied");
  });

  it("Stocklana-like policy rejects browse-only evidence", () => {
    const stocklanaLike = {
      sandbox_only: true,
      required_claims: [
        { claim_type: "wallet_binding_confirmed", max_age_hours: 720, min_assurance: "L2" },
        { claim_type: "liveness_passed", max_age_hours: 8760, min_assurance: "L2" },
      ],
    };
    const evaluation = evaluatePolicyRules(stocklanaLike, [browseClaim()]);
    expect(evaluation.decision).not.toBe("approved");
    expect(evaluation.missing_claims).toContain("wallet_binding_confirmed");
  });
});
