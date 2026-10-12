import { describe, expect, it } from "vitest";
import { Keypair } from "@solana/web3.js";
import { ABRAXAS_TRUST_REGISTRY_PROGRAM_ID } from "@/lib/solana/trustRegistry/constants";
import {
  defaultDevnetGenesisExpectation,
  runGovernanceExecutionPreflight,
} from "@/lib/solana/trustRegistry/governance/governanceExecutionPreflight";

describe("governance execution preflight (Build #537)", () => {
  it("fail-closes on genesis, artifact, and unverified vault", () => {
    const vault = Keypair.generate().publicKey.toBase58();
    const res = runGovernanceExecutionPreflight({
      clusterGenesisHash: "wrong",
      expectedGenesisHash: defaultDevnetGenesisExpectation(),
      programId: ABRAXAS_TRUST_REGISTRY_PROGRAM_ID,
      elfSha256: null,
      upgradeAuthority: null,
      vaultPda: vault,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.blockers).toContain("cluster_genesis_mismatch");
      expect(res.blockers).toContain("missing_program_artifact_hash");
      expect(res.blockers.some((b) => b.startsWith("unverified_vault"))).toBe(true);
    }
  });

  it("passes when env allowlist and artifact hash match", () => {
    const vault = Keypair.generate().publicKey.toBase58();
    const res = runGovernanceExecutionPreflight({
      clusterGenesisHash: defaultDevnetGenesisExpectation(),
      expectedGenesisHash: defaultDevnetGenesisExpectation(),
      programId: ABRAXAS_TRUST_REGISTRY_PROGRAM_ID,
      elfSha256: "abc123",
      upgradeAuthority: null,
      vaultPda: vault,
      verifiedMultisigEnv: vault,
      squadsProposalState: "EXECUTABLE",
      governanceApprovals: 2,
      governanceThreshold: 2,
    });
    expect(res.ok).toBe(true);
  });
});
