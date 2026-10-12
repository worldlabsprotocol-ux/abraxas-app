import { describe, expect, it } from "vitest";
import { compareObservationToEvidence535 } from "@/lib/solana/trustRegistry/governance/observeDevnetTrustRegistryActivation";
import { TRUST_REGISTRY_DEVNET_LIVE_V535 } from "@/lib/solana/trustRegistry/governance/trustRegistryDevnetLiveEvidence535";
import { SOLANA_DEVNET_GENESIS_HASH } from "@/lib/partner/testnetGateDeploymentKit/solanaDevnetChainPrecheck";

describe("compareObservationToEvidence535", () => {
  const base = {
    rpc_url: "x",
    genesis_hash: SOLANA_DEVNET_GENESIS_HASH,
    program_executable: true,
    program_data_address: TRUST_REGISTRY_DEVNET_LIVE_V535.program_data_address,
    upgrade_authority: TRUST_REGISTRY_DEVNET_LIVE_V535.upgrade_authority,
    registry_pda_present: true,
    registry_data_len: 471,
    governance_authority: TRUST_REGISTRY_DEVNET_LIVE_V535.governance_authority,
    governance_ui_state: "layout_legacy_ops_safe",
    commitment_present: true,
    commitment_status: "REVOKED" as const,
    squads_v4_program_executable: true,
    slot: 1,
    errors: [],
  };

  it("flags governance authority drift", () => {
    const cmp = compareObservationToEvidence535({
      ...base,
      governance_authority: "11111111111111111111111111111112",
    });
    expect(cmp.ok).toBe(false);
    expect(cmp.blockers).toContain("governance_authority_drift_from_v535_evidence");
  });

  it("flags missing revoked commitment state", () => {
    const cmp = compareObservationToEvidence535({ ...base, commitment_status: "ACTIVE" });
    expect(cmp.blockers).toContain("build535_revoked_commitment_state_not_observed");
  });
});
