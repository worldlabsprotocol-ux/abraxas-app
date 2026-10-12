import { describe, expect, it } from "vitest";
import { runGovernanceActivationGate } from "@/lib/solana/trustRegistry/governance/governanceActivationGate";
import { compareObservationToEvidence535 } from "@/lib/solana/trustRegistry/governance/observeDevnetTrustRegistryActivation";
import { TRUST_REGISTRY_DEVNET_LIVE_V535 } from "@/lib/solana/trustRegistry/governance/trustRegistryDevnetLiveEvidence535";
import { SOLANA_DEVNET_GENESIS_HASH } from "@/lib/partner/testnetGateDeploymentKit/solanaDevnetChainPrecheck";

describe("governance activation gate (Build #538)", () => {
  const alignedObservation = {
    rpc_url: "https://api.devnet.solana.com",
    genesis_hash: SOLANA_DEVNET_GENESIS_HASH,
    program_executable: true,
    program_data_address: TRUST_REGISTRY_DEVNET_LIVE_V535.program_data_address,
    upgrade_authority: TRUST_REGISTRY_DEVNET_LIVE_V535.upgrade_authority,
    registry_pda_present: true,
    registry_data_len: 471,
    governance_authority: TRUST_REGISTRY_DEVNET_LIVE_V535.governance_authority,
    governance_ui_state: "layout_legacy_ops_safe",
    commitment_present: true,
    commitment_status: "REVOKED",
    squads_v4_program_executable: true,
    slot: 510074500,
    errors: [],
  };

  it("passes evidence535 comparison for aligned observation fixture", () => {
    const cmp = compareObservationToEvidence535(alignedObservation);
    expect(cmp.ok).toBe(true);
  });

  it("fail-closes without devnet observation and vault configuration", () => {
    const gate = runGovernanceActivationGate({ devnetObservation: null });
    expect(gate.ok).toBe(false);
    expect(gate.blockers).toContain("devnet_observation_missing");
    expect(gate.blockers).toContain("institutional_multisig_vaults_not_configured");
    expect(gate.stage).toBe("BLOCKED");
  });

  it("reaches observed-aligned stage when chain matches v535 but custody not configured", () => {
    const gate = runGovernanceActivationGate({ devnetObservation: alignedObservation });
    expect(gate.stage).toBe("OBSERVED_DEVNET_ALIGNED");
    expect(gate.ok).toBe(false);
    expect(gate.blockers.some((b) => b.startsWith("unverified_vault"))).toBe(true);
  });
});
