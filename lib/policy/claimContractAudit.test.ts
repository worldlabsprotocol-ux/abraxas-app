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
      const storedInCredentialClaims = row.storedIn.includes("credential_claims");
      const storedInSelfAttestationLedger = row.storedIn.includes("self_attestation_ledger");
      expect(
        storedInCredentialClaims || storedInSelfAttestationLedger,
        claimType,
      ).toBe(true);
      expect(row.evaluatedBy, claimType).toContain("evaluatePolicyRules");
      expect(row.resolvedBy, claimType).toBeTruthy();
    }
  });

  it("documents provenance claims issued via submitProvenanceDisclosure", () => {
    const provenanceClaims = [
      "creator_attested",
      "ai_assistance_disclosed",
      "source_integrity_verified",
    ] as const satisfies readonly ClaimType[];

    for (const claimType of provenanceClaims) {
      const row = CLAIM_CONTRACT[claimType];
      expect(row.issuedBy).toEqual(["submitProvenanceDisclosure"]);
      expect(row.storedIn).toContain("content_artifact_records");
      expect(row.evaluatedBy).toContain("evaluateContentOriginDisclosure");
      expect(row.regressionTests.length).toBeGreaterThan(0);
    }

    expect(CLAIM_CONTRACT.creator_attested.evaluatedBy).toContain("L0");
    expect(CLAIM_CONTRACT.ai_assistance_disclosed.resolvedBy).toContain("disclosure");
    expect(CLAIM_CONTRACT.source_integrity_verified.evaluatedBy).toContain("L1");
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
