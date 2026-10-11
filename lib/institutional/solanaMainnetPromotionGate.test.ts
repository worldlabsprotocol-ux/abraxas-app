import { describe, expect, it } from "vitest";
import { evaluateSolanaMainnetPromotionGate } from "./solanaMainnetPromotionGate";

describe("evaluateSolanaMainnetPromotionGate", () => {
  it("returns BLOCKED when observation and registry checks are incomplete", () => {
    const report = evaluateSolanaMainnetPromotionGate({});
    expect(report.overall === "BLOCKED" || report.overall === "FAIL").toBe(true);
    expect(report.devnet_proof_sufficient_for_mainnet).toBe(false);
    expect(report.checks.some(c => c.id === "independent_observation")).toBe(true);
  });

  it("PASS only when all required checks pass and mainnet remains disabled", () => {
    const report = evaluateSolanaMainnetPromotionGate({
      deployment_registry_integrity_ok: true,
      verified_program_id_match: true,
      upgrade_authority_documented: true,
      signer_active: true,
      signer_rotation_documented: true,
      rpc_url_configured: true,
      rpc_is_devnet: true,
      independent_observation_present: true,
      receipt_commitment_consistency_ok: true,
      conformance_vectors_pass: true,
    });
    expect(report.mainnet_programs_enabled).toBe(false);
    expect(report.overall).toBe("PASS");
  });
});
