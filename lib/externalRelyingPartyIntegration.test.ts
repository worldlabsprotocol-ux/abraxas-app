// FILE: lib/externalRelyingPartyIntegration.test.ts

import { describe, expect, it } from "vitest";
import {
  getExternalRelyingPartyIntegrationGuide,
  VERIFY_MODE_GUIDE,
  EXTERNAL_RP_SUMMARY,
} from "./externalRelyingPartyIntegration";

describe("externalRelyingPartyIntegration", () => {
  it("exports a complete machine-readable guide", () => {
    const guide = getExternalRelyingPartyIntegrationGuide();

    expect(guide.version).toBeTruthy();
    expect(guide.endpoints.verify.path).toBe("/api/credentials/verify");
    expect(guide.endpoints.proof_lookup.path).toBe("/api/proof/{proof_id}");
    expect(guide.endpoints.verify.example_response.proof_id).toMatch(/^aprx_/);
    expect(guide.endpoints.proof_lookup.example_response.signature_valid).toBe(true);
    expect(guide.examples.minimal_integration).toContain("/api/credentials/verify");
    expect(guide.examples.minimal_integration).toContain("signature_valid");
    expect(guide.onboarding_steps).toHaveLength(4);
  });

  it("documents three verify modes", () => {
    expect(VERIFY_MODE_GUIDE.map(m => m.mode)).toEqual([
      "registry",
      "credential_jwt",
      "policy_check",
    ]);
  });

  it("includes internal handoff summary", () => {
    expect(EXTERNAL_RP_SUMMARY.whatTheyDo.length).toBeGreaterThanOrEqual(3);
    expect(EXTERNAL_RP_SUMMARY.howTheyVerifyIndependently.some(s => s.includes("signature_valid"))).toBe(true);
  });
});
