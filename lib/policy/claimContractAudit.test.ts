import { describe, expect, it } from "vitest";
import type { ClaimType } from "@/lib/credentials/claimSchema";
import {
  CLAIM_CONTRACT,
  POLICY_FLAGS_ENFORCED_EXTERNALLY,
  PRODUCTION_PARTNER_POLICIES,
  allRequiredClaimsAcrossPolicies,
} from "./productionPolicyContract";

describe("backend claim contract audit", () => {
  const requiredClaims = allRequiredClaimsAcrossPolicies();

  it("lists every production policy required claim", () => {
    expect(PRODUCTION_PARTNER_POLICIES.map(p => p.id)).toContain("good-trouble-retail-v1");
    expect(requiredClaims).toContain("residency_country");
    expect(requiredClaims).toContain("asset_ownership_reviewed");
  });

  it("flags claims required by policy but never issued", () => {
    const neverIssued = requiredClaims.filter(claimType => {
      const row = CLAIM_CONTRACT[claimType];
      return row.issuedBy.includes("not_implemented") && row.issuedBy.length === 1;
    });

    // Known gap: batch provenance policy — asset claims not yet wired (sandbox-only pilot)
    expect(neverIssued).toEqual(["asset_ownership_reviewed"]);
  });

  it("residency_country is issued on all IDV paths after P0 fix", () => {
    const row = CLAIM_CONTRACT.residency_country;
    expect(row.issuedBy).toContain("abraxasCaptureApprovedClaims");
    expect(row.issuedBy).toContain("manualApprovedClaims");
    expect(row.issuedBy).toContain("veriffApprovedClaims");
    expect(row.regressionTests.length).toBeGreaterThan(0);
  });

  it("documents policy flags enforced outside evaluatePolicyRules", () => {
    const gtPolicy = PRODUCTION_PARTNER_POLICIES.find(p => p.id === "good-trouble-retail-v1")!;
    expect(gtPolicy.rules.account_required).toBe(true);
    expect(POLICY_FLAGS_ENFORCED_EXTERNALLY.account_required).toBeTruthy();
    expect(POLICY_FLAGS_ENFORCED_EXTERNALLY.biometric_thresholds).toBeTruthy();
    expect(POLICY_FLAGS_ENFORCED_EXTERNALLY.minimum_age).toBeTruthy();
  });

  it("every required claim has storage and evaluation wiring", () => {
    for (const claimType of requiredClaims) {
      const row = CLAIM_CONTRACT[claimType];
      expect(row.storedIn, claimType).toContain("credential_claims");
      expect(row.evaluatedBy, claimType).toContain("evaluatePolicyRules");
      expect(row.resolvedBy, claimType).toBeTruthy();
    }
  });

  it("reports issued-but-unused claim types only when not required by any policy", () => {
    const allClaimTypes = Object.keys(CLAIM_CONTRACT) as ClaimType[];
    const issuedButNotRequired = allClaimTypes.filter(claimType => {
      const row = CLAIM_CONTRACT[claimType];
      const isIssued = !row.issuedBy.includes("not_implemented");
      const isRequired = requiredClaims.includes(claimType);
      return isIssued && !isRequired;
    });

    // government_id_verified is issued but not a standalone policy requirement (bundled with identity)
    expect(issuedButNotRequired).toContain("government_id_verified");
    expect(issuedButNotRequired).not.toContain("residency_country");
  });
});
