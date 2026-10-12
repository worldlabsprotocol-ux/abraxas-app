import { PublicKey } from "@solana/web3.js";
import { ABRAXAS_TRUST_REGISTRY_PROGRAM_ID } from "@/lib/solana/trustRegistry/constants";
import { SQUADS_MULTISIG_V4_PROGRAM_ID } from "@/lib/solana/trustRegistry/governance/squadsV4Pda";
import { verifyMultisigDestination } from "@/lib/solana/trustRegistry/governance/verifiedMultisigDestinations";

export type GovernanceExecutionPreflightInput = {
  clusterGenesisHash: string;
  expectedGenesisHash: string;
  programId: string;
  expectedProgramId?: string;
  elfSha256: string | null;
  expectedElfSha256?: string;
  upgradeAuthority: string | null;
  expectedUpgradeAuthority?: string;
  vaultPda: string;
  verifiedMultisigEnv?: string;
  squadsProposalState?: string;
  governanceApprovals?: number;
  governanceThreshold?: number;
};

export type GovernanceExecutionPreflightResult =
  | { ok: true; checks: string[] }
  | { ok: false; blockers: string[]; checks: string[] };

const DEVNET_GENESIS_PLACEHOLDER = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

export function runGovernanceExecutionPreflight(
  input: GovernanceExecutionPreflightInput,
): GovernanceExecutionPreflightResult {
  const checks: string[] = [];
  const blockers: string[] = [];

  if (input.expectedGenesisHash && input.clusterGenesisHash !== input.expectedGenesisHash) {
    blockers.push("cluster_genesis_mismatch");
  } else {
    checks.push("cluster_genesis_ok");
  }

  if (input.expectedProgramId && input.programId !== input.expectedProgramId) {
    blockers.push("program_id_mismatch");
  } else if (input.programId !== ABRAXAS_TRUST_REGISTRY_PROGRAM_ID) {
    blockers.push("unexpected_trust_registry_program_id");
  } else {
    checks.push("program_id_ok");
  }

  if (!input.elfSha256) {
    blockers.push("missing_program_artifact_hash");
  } else if (input.expectedElfSha256 && input.elfSha256 !== input.expectedElfSha256) {
    blockers.push("program_artifact_hash_mismatch");
  } else {
    checks.push("program_artifact_hash_present");
  }

  if (input.expectedUpgradeAuthority) {
    if (!input.upgradeAuthority || input.upgradeAuthority !== input.expectedUpgradeAuthority) {
      blockers.push("upgrade_authority_mismatch");
    } else {
      checks.push("upgrade_authority_ok");
    }
  }

  const vault = verifyMultisigDestination(input.vaultPda, { envAllowlist: input.verifiedMultisigEnv });
  if (!vault.ok) {
    blockers.push(`unverified_vault:${vault.reason}`);
  } else {
    checks.push("vault_destination_verified");
  }

  try {
    new PublicKey(SQUADS_MULTISIG_V4_PROGRAM_ID);
    checks.push("squads_v4_program_id_parseable");
  } catch {
    blockers.push("squads_program_id_invalid");
  }

  if (input.squadsProposalState) {
    const executableStates = new Set(["EXECUTABLE", "EXECUTED", "FINALIZED"]);
    if (!executableStates.has(input.squadsProposalState) && input.squadsProposalState !== "APPROVED") {
      if (input.squadsProposalState === "PROPOSED") {
        blockers.push("governance_proposal_not_executable");
      } else if (input.squadsProposalState === "REJECTED") {
        blockers.push("governance_proposal_rejected");
      }
    } else {
      checks.push("governance_proposal_state_ok");
    }
  }

  if (input.governanceThreshold != null && input.governanceApprovals != null) {
    if (input.governanceApprovals < input.governanceThreshold) {
      blockers.push("insufficient_multisig_approvals");
    } else {
      checks.push("multisig_threshold_met");
    }
  }

  if (blockers.length) return { ok: false, blockers, checks };
  return { ok: true, checks };
}

/** Default devnet genesis for rehearsal preflight when caller omits explicit hash. */
export function defaultDevnetGenesisExpectation(): string {
  return DEVNET_GENESIS_PLACEHOLDER;
}
