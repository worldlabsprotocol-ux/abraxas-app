import { SOLANA_DEVNET_GENESIS_HASH } from "@/lib/partner/testnetGateDeploymentKit/solanaDevnetChainPrecheck";
import {
  INSTITUTIONAL_VAULT_MIN_LAMPORTS,
  type InstitutionalCustodyEnvConfig,
} from "@/lib/solana/trustRegistry/governance/institutionalCustodyEnv";
import type { SquadsV4MultisigObservation } from "@/lib/solana/trustRegistry/governance/observeSquadsV4Multisig";

export type SquadsV4CustodyDomainRole = "protocol_upgrade" | "registry_administration";

export type SquadsV4CustodyPreflightResult = {
  schema: "squads_v4_custody_preflight_v539";
  ok: boolean;
  blockers: string[];
  checks: string[];
  clusterGenesisHash: string;
  protocolUpgrade: SquadsV4MultisigObservation | null;
  registryAdministration: SquadsV4MultisigObservation | null;
};

const MIN_MEMBERS = 3;
const MIN_THRESHOLD = 2;

function memberPubkeys(obs: SquadsV4MultisigObservation): string[] {
  return obs.members.map((m) => m.pubkey);
}

function validateSingleMultisig(
  role: SquadsV4CustodyDomainRole,
  obs: SquadsV4MultisigObservation | null,
  blockers: string[],
  checks: string[],
): void {
  const prefix = role === "protocol_upgrade" ? "protocol_upgrade" : "registry_administration";
  if (!obs) {
    blockers.push(`${prefix}_multisig_observation_missing`);
    return;
  }
  if (obs.errors.length) {
    for (const e of obs.errors) blockers.push(`${prefix}:${e}`);
  }
  if (!obs.accountPresent) {
    blockers.push(`${prefix}_multisig_not_on_chain`);
    return;
  }
  if (!obs.vaultPdaDerivationMatchesSdk) {
    blockers.push(`${prefix}_vault_derivation_sdk_mismatch`);
  } else {
    checks.push(`${prefix}_vault_derivation_matches_sqds_sdk`);
  }
  if (obs.vaultPdaMatchesExpected === false) {
    blockers.push(`${prefix}_vault_allowlist_mismatch`);
  } else if (obs.vaultPdaMatchesExpected === true) {
    checks.push(`${prefix}_vault_allowlist_verified`);
  }
  if (obs.threshold == null || obs.threshold < MIN_THRESHOLD) {
    blockers.push(`${prefix}_threshold_below_minimum_2_of_3`);
  } else {
    checks.push(`${prefix}_threshold_meets_minimum`);
  }
  if (obs.memberCount == null || obs.memberCount < MIN_MEMBERS) {
    blockers.push(`${prefix}_member_count_below_three`);
  } else {
    checks.push(`${prefix}_member_count_at_least_three`);
  }
  const voters = obs.members.filter((m) => m.hasVote);
  if (obs.threshold != null && voters.length < obs.threshold) {
    blockers.push(`${prefix}_insufficient_vote_permission_members`);
  }
  const executors = obs.members.filter((m) => m.hasExecute);
  if (executors.length < 1) {
    blockers.push(`${prefix}_no_execute_permission_member`);
  }
  const uniqueMembers = new Set(memberPubkeys(obs));
  if (uniqueMembers.size !== obs.members.length) {
    blockers.push(`${prefix}_duplicate_members`);
  }
  if (obs.vaultLamports == null || obs.vaultLamports < INSTITUTIONAL_VAULT_MIN_LAMPORTS) {
    blockers.push(`${prefix}_vault_underfunded`);
  } else {
    checks.push(`${prefix}_vault_funded`);
  }
}

/** Pure + observation-based checks (RPC observations supplied by caller). */
export function runSquadsV4CustodyPreflight(params: {
  clusterGenesisHash: string;
  expectedGenesisHash?: string;
  protocolUpgrade: SquadsV4MultisigObservation | null;
  registryAdministration: SquadsV4MultisigObservation | null;
  env?: InstitutionalCustodyEnvConfig;
}): SquadsV4CustodyPreflightResult {
  const blockers: string[] = [];
  const checks: string[] = [];
  const expectedGenesis = params.expectedGenesisHash ?? SOLANA_DEVNET_GENESIS_HASH;

  if (!params.clusterGenesisHash) {
    blockers.push("cluster_genesis_missing");
  } else if (params.clusterGenesisHash !== expectedGenesis) {
    blockers.push("cluster_genesis_not_devnet");
  } else {
    checks.push("cluster_genesis_devnet");
  }

  validateSingleMultisig("protocol_upgrade", params.protocolUpgrade, blockers, checks);
  validateSingleMultisig("registry_administration", params.registryAdministration, blockers, checks);

  if (params.protocolUpgrade?.accountPresent && params.registryAdministration?.accountPresent) {
    const upVault = params.protocolUpgrade.derivedVaultPda;
    const regVault = params.registryAdministration.derivedVaultPda;
    if (upVault && regVault && upVault === regVault) {
      blockers.push("common_custody_vault_concentration");
    } else {
      checks.push("distinct_vault_pdas_on_chain");
    }
    if (params.protocolUpgrade.multisigPda === params.registryAdministration.multisigPda) {
      blockers.push("common_multisig_control_plane");
    } else {
      checks.push("distinct_multisig_accounts");
    }
    const upMembers = new Set(memberPubkeys(params.protocolUpgrade));
    const regMembers = new Set(memberPubkeys(params.registryAdministration));
    const overlap = Array.from(upMembers).filter((m) => regMembers.has(m));
    if (overlap.length === upMembers.size && overlap.length === regMembers.size) {
      blockers.push("identical_member_sets_across_domains");
    } else if (overlap.length > 0) {
      checks.push("partial_member_overlap_documented");
    } else {
      checks.push("fully_disjoint_member_sets");
    }
  }

  if (params.env) {
    const doc = params.env.squadsMemberPubkeysDocumented;
    if (doc.length >= MIN_MEMBERS) checks.push("off_chain_member_roster_documented");
    else blockers.push("off_chain_member_roster_incomplete");
  }

  const uniqueBlockers = Array.from(new Set(blockers));
  const uniqueChecks = Array.from(new Set(checks));

  return {
    schema: "squads_v4_custody_preflight_v539",
    ok: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    checks: uniqueChecks,
    clusterGenesisHash: params.clusterGenesisHash,
    protocolUpgrade: params.protocolUpgrade,
    registryAdministration: params.registryAdministration,
  };
}
