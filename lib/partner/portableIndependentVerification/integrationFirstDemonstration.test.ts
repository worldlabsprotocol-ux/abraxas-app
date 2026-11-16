// FILE: lib/partner/portableIndependentVerification/integrationFirstDemonstration.test.ts

import { describe, expect, it } from "vitest";
import { verifyPortableBundle } from "./verifyWithStandaloneVerifier";
import {
  runVerificationFirstDemoScenario,
  verificationFirstDemoManifest,
  verificationFirstHostedLearningVerifyInputs,
  verificationFirstSyntheticPortableBundle,
  VERIFICATION_FIRST_DEMO_SCENARIOS,
} from "./integrationFirstDemonstration";

describe("verification-first adoption demonstration (Build #821 fixtures)", () => {
  it("ships synthetic portable bundle for offline verifier onboarding", () => {
    const bundle = verificationFirstSyntheticPortableBundle();
    expect(bundle.schema).toBe("abraxas_portable_verification_bundle/1.0.0");
    expect(bundle.export_provenance.bundled_trust_anchor_informational_only).toBe(true);
    expect(bundle.decision_receipt.id).toBeTruthy();
    expect(bundle.signed_issuer_authority).toBeTruthy();
  });

  it("hosted paste teaching bundle verifies like demo valid when checkpoint supplied", () => {
    const bundle = verificationFirstSyntheticPortableBundle();
    const anchor = bundle.bundled_trust_anchor!;
    const hosted = verifyPortableBundle({
      bundle,
      integratorPinnedTrustAnchor: anchor,
      partnerId: bundle.decision_receipt.partner_id,
      policyId: bundle.decision_receipt.policy_id,
      ...verificationFirstHostedLearningVerifyInputs(bundle),
    });
    const demo = runVerificationFirstDemoScenario("valid");
    expect(hosted.currently_acceptable).toBe(demo.verification.currently_acceptable);
    expect(hosted.issuer_currently_authorized).toBe(true);
  });

  it("exposes synthetic non-production manifest", () => {
    const m = verificationFirstDemoManifest();
    expect(m.not_for_production).toBe(true);
    expect(m.partner_id).toBe("partner-integration-821");
  });

  it.each(VERIFICATION_FIRST_DEMO_SCENARIOS)("runs scenario %s", (scenario) => {
    const out = runVerificationFirstDemoScenario(scenario);
    expect(out.scenario).toBe(scenario);
    expect(out.verification.contract_version).toMatch(/independent_verifier/);
    if (scenario === "valid") {
      expect(out.verification.currently_acceptable).toBe("yes");
      expect(out.verification.cryptographically_authentic).toBe(true);
    }
    if (scenario === "wrong_audience") {
      expect(out.verification.currently_acceptable).not.toBe("yes");
    }
    if (scenario === "revoked") {
      expect(out.verification.currently_acceptable).not.toBe("yes");
    }
    if (scenario === "tampered_signature") {
      expect(out.verification.cryptographically_authentic).toBe(false);
    }
    if (scenario === "stale_status") {
      expect(out.verification.currently_acceptable).not.toBe("yes");
    }
  });
});