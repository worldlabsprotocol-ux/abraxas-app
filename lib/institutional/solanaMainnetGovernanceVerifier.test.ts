import { describe, expect, it } from "vitest";
import { runSolanaMainnetGovernanceVerification, SOLANA_MAINNET_GENESIS_HASH } from "@/lib/institutional/solanaMainnetGovernanceVerifier";
import { SOLANA_DEVNET_GENESIS_HASH } from "@/lib/partner/testnetGateDeploymentKit/solanaDevnetChainPrecheck";

describe("runSolanaMainnetGovernanceVerification", () => {
  it("fails closed on RPC disagreement", async () => {
    process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL = "https://primary.example.rpc";
    process.env.ABRAXAS_SOLANA_INDEPENDENT_RPC_URL = "https://independent.example.rpc";
    const report = await runSolanaMainnetGovernanceVerification({
      primaryGenesis: async () => SOLANA_DEVNET_GENESIS_HASH,
      independentGenesis: async () => SOLANA_MAINNET_GENESIS_HASH,
      signerRotationDocumented: true,
      signerCustodyDocumented: true,
      finalizedConfirmationPolicyDocumented: true,
    });
    const disagreement = report.evidence.find(e => e.id === "independent_rpc_agreement");
    expect(disagreement?.outcome).toBe("FAIL");
    expect(report.overall).not.toBe("PASS");
    delete process.env.ABRAXAS_SOLANA_INDEPENDENT_RPC_URL;
    delete process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL;
  });

  it("rejects forged governance upgrade authority evidence", async () => {
    const report = await runSolanaMainnetGovernanceVerification({
      upgradeAuthorityObserved: "AuthorityA",
      expectedUpgradeAuthority: "AuthorityB",
      signerRotationDocumented: true,
      signerCustodyDocumented: true,
      finalizedConfirmationPolicyDocumented: true,
    });
    const upgrade = report.evidence.find(e => e.id === "upgrade_authority_custody");
    expect(upgrade?.outcome).toBe("FAIL");
  });

  it("blocks when independent observation absent", async () => {
    const report = await runSolanaMainnetGovernanceVerification({
      finalizedConfirmationPolicyDocumented: true,
    });
    expect(report.evidence.some(e => e.outcome === "BLOCKED")).toBe(true);
    expect(report.devnet_proof_sufficient_for_mainnet).toBe(false);
  });

  it("detects wrong cluster genesis", async () => {
    const report = await runSolanaMainnetGovernanceVerification({
      primaryGenesis: async () => "WrongGenesisHashValue",
      signerRotationDocumented: true,
      signerCustodyDocumented: true,
      finalizedConfirmationPolicyDocumented: true,
    });
    const cluster = report.evidence.find(e => e.id === "primary_rpc_cluster");
    expect(cluster?.outcome).toBe("FAIL");
  });
});
