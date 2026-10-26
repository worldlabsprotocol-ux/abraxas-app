import { describe, expect, it } from "vitest";
import { evaluateControlledTestEvidenceGate } from "./controlledTestEvidenceGate";

describe("controlledTestEvidenceGate", () => {
  it("blocks production deploy even when flag is set", () => {
    const result = evaluateControlledTestEvidenceGate({
      ABRAXAS_TRUST_EXECUTION_CONTROLLED_TEST_EVIDENCE: "1",
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      ABRAXAS_SOVEREIGN_STAGING_FIXTURE_WRITES: "true",
      ABRAXAS_TRUST_EXECUTION_FIXTURE_ATTESTATION: "disposable_ci_only",
      VERCEL_ENV: "production",
    });
    expect(result.allowed).toBe(false);
    if (result.allowed) return;
    expect(result.code).toBe("production_deploy_forbidden");
  });

  it("blocks preview deploy", () => {
    const result = evaluateControlledTestEvidenceGate({
      ABRAXAS_TRUST_EXECUTION_CONTROLLED_TEST_EVIDENCE: "1",
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      ABRAXAS_SOVEREIGN_STAGING_FIXTURE_WRITES: "true",
      ABRAXAS_TRUST_EXECUTION_FIXTURE_ATTESTATION: "disposable_ci_only",
      VERCEL_ENV: "preview",
    });
    expect(result.allowed).toBe(false);
  });

  it("requires disposable class and attestation", () => {
    const result = evaluateControlledTestEvidenceGate({
      ABRAXAS_TRUST_EXECUTION_CONTROLLED_TEST_EVIDENCE: "1",
      ABRAXAS_SOVEREIGN_ENV_CLASS: "staging",
      ABRAXAS_SOVEREIGN_STAGING_FIXTURE_WRITES: "true",
      ABRAXAS_TRUST_EXECUTION_FIXTURE_ATTESTATION: "disposable_ci_only",
    });
    expect(result.allowed).toBe(false);
  });

  it("allows fully attested disposable CI", () => {
    const result = evaluateControlledTestEvidenceGate({
      ABRAXAS_TRUST_EXECUTION_CONTROLLED_TEST_EVIDENCE: "1",
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      ABRAXAS_SOVEREIGN_STAGING_FIXTURE_WRITES: "true",
      ABRAXAS_TRUST_EXECUTION_FIXTURE_ATTESTATION: "disposable_ci_only",
      VERCEL_ENV: "development",
    });
    expect(result).toEqual({ allowed: true });
  });
});
