import { createHash } from "crypto";
import { readFileSync } from "fs";
import {
  defaultInstitutionalAuthorityDomains,
  mergeConfiguredVaults,
  type AuthorityDomainSpec,
} from "@/lib/solana/trustRegistry/governance/institutionalAuthorityDomains";
import { runGovernanceExecutionPreflight } from "@/lib/solana/trustRegistry/governance/governanceExecutionPreflight";
import {
  compareObservationToEvidence535,
  type DevnetTrustRegistryObservation,
} from "@/lib/solana/trustRegistry/governance/observeDevnetTrustRegistryActivation";
import { TRUST_REGISTRY_DEVNET_LIVE_V535 } from "@/lib/solana/trustRegistry/governance/trustRegistryDevnetLiveEvidence535";
import { ABRAXAS_TRUST_REGISTRY_PROGRAM_ID } from "@/lib/solana/trustRegistry/constants";
import { SQUADS_MULTISIG_V4_PROGRAM_ID } from "@/lib/solana/trustRegistry/governance/squadsV4Pda";
import { parseInstitutionalCustodyFromEnv } from "@/lib/solana/trustRegistry/governance/institutionalCustodyEnv";
import { parseVerifiedMultisigDestinationsFromEnv } from "@/lib/solana/trustRegistry/governance/verifiedMultisigDestinations";
import type { SquadsV4CustodyPreflightResult } from "@/lib/solana/trustRegistry/governance/squadsV4CustodyPreflight";
import { SOLANA_DEVNET_GENESIS_HASH } from "@/lib/partner/testnetGateDeploymentKit/solanaDevnetChainPrecheck";

export type GovernanceActivationStage =
  | "BLOCKED"
  | "OBSERVED_DEVNET_ALIGNED"
  | "CUSTODY_CONFIGURED_OFF_CHAIN"
  | "SQUADS_LIVE_EXECUTION_REQUIRED";

export type GovernanceActivationGateResult = {
  schema: "trust_registry_governance_activation_gate_v539";
  stage: GovernanceActivationStage;
  ok: boolean;
  blockers: string[];
  checks: string[];
  authority_domains: Record<string, AuthorityDomainSpec>;
  squads_program_id: string;
  devnet_observation: DevnetTrustRegistryObservation | null;
  squads_custody_preflight: SquadsV4CustodyPreflightResult | null;
  artifact_elf_sha256: string | null;
};

const DEFAULT_SBF = "solana/abraxas-eligibility-gate/target/deploy/abraxas_trust_registry.so";

function sha256File(path: string): string | null {
  try {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
  } catch {
    return null;
  }
}

export function runGovernanceActivationGate(params: {
  devnetObservation: DevnetTrustRegistryObservation | null;
  artifactPath?: string;
  protocolUpgradeVaultPda?: string | null;
  registryAdministrationVaultPda?: string | null;
  squadsMemberPubkeys?: string[];
  squadsThreshold?: number | null;
  squadsProposalState?: string;
  squadsApprovals?: number;
  squadsCustodyPreflight?: SquadsV4CustodyPreflightResult | null;
}): GovernanceActivationGateResult {
  const blockers: string[] = [];
  const checks: string[] = [];
  const artifact_elf_sha256 = sha256File(params.artifactPath ?? DEFAULT_SBF);

  const custodyEnv = parseInstitutionalCustodyFromEnv();
  const envAllowlist = custodyEnv.verifiedVaultPdas.length
    ? custodyEnv.verifiedVaultPdas
    : parseVerifiedMultisigDestinationsFromEnv(process.env.ABRAXAS_VERIFIED_MULTISIG_DESTINATIONS);

  const rpcUpgradeVault = params.squadsCustodyPreflight?.protocolUpgrade?.derivedVaultPda ?? null;
  const rpcRegistryVault =
    params.squadsCustodyPreflight?.registryAdministration?.derivedVaultPda ?? null;
  const rpcUpgradeThreshold = params.squadsCustodyPreflight?.protocolUpgrade?.threshold ?? null;
  const rpcRegistryThreshold =
    params.squadsCustodyPreflight?.registryAdministration?.threshold ?? null;
  const rpcUpgradeMembers =
    params.squadsCustodyPreflight?.protocolUpgrade?.memberCount ?? null;
  const rpcRegistryMembers =
    params.squadsCustodyPreflight?.registryAdministration?.memberCount ?? null;

  let domains = defaultInstitutionalAuthorityDomains();
  domains = mergeConfiguredVaults(domains, {
    protocolUpgradeVaultPda:
      params.protocolUpgradeVaultPda ?? rpcUpgradeVault ?? envAllowlist[0] ?? null,
    registryAdministrationVaultPda:
      params.registryAdministrationVaultPda ?? rpcRegistryVault ?? envAllowlist[1] ?? null,
    protocolUpgradeThreshold: rpcUpgradeThreshold ?? params.squadsThreshold ?? null,
    registryAdministrationThreshold: rpcRegistryThreshold ?? params.squadsThreshold ?? null,
    protocolUpgradeMembers:
      rpcUpgradeMembers ??
      params.squadsMemberPubkeys?.length ??
      (custodyEnv.squadsMemberPubkeysDocumented.length || null),
    registryAdministrationMembers:
      rpcRegistryMembers ??
      params.squadsMemberPubkeys?.length ??
      (custodyEnv.squadsMemberPubkeysDocumented.length || null),
  });

  if (!params.devnetObservation) {
    blockers.push("devnet_observation_missing");
  } else {
    const cmp = compareObservationToEvidence535(params.devnetObservation);
    checks.push(...cmp.checks);
    blockers.push(...cmp.blockers);
  }

  if (artifact_elf_sha256 !== TRUST_REGISTRY_DEVNET_LIVE_V535.elf_sha256) {
    blockers.push("local_artifact_digest_differs_from_v535_deployed_bytecode");
  } else if (artifact_elf_sha256) {
    checks.push("artifact_digest_matches_v535_deploy");
  }

  const upgradeVault = domains.protocol_upgrade.configuredVaultPda;
  const registryVault = domains.registry_administration.configuredVaultPda;
  if (!upgradeVault || !registryVault) {
    blockers.push("institutional_multisig_vaults_not_configured");
  } else if (upgradeVault === registryVault) {
    blockers.push("protocol_and_registry_vaults_must_be_distinct");
  } else {
    checks.push("distinct_vault_pdas_configured");
  }

  if (params.squadsCustodyPreflight) {
    if (!params.squadsCustodyPreflight.ok) {
      blockers.push(...params.squadsCustodyPreflight.blockers.map((b) => `squads_custody:${b}`));
    } else {
      checks.push(...params.squadsCustodyPreflight.checks.map((c) => `squads_custody:${c}`));
    }
  } else {
    blockers.push("squads_custody_rpc_preflight_not_run");
  }

  const members =
    params.squadsMemberPubkeys?.length
      ? params.squadsMemberPubkeys
      : custodyEnv.squadsMemberPubkeysDocumented;
  const effectiveThreshold =
    rpcUpgradeThreshold ?? params.squadsThreshold ?? custodyEnv.squadsThresholdDocumented;

  if (members.length < 2 && !params.squadsCustodyPreflight?.ok) {
    blockers.push("insufficient_documented_member_custody_separation");
  } else if (members.length >= 2) {
    const unique = new Set(members);
    if (unique.size !== members.length) blockers.push("duplicate_member_pubkeys");
    else checks.push("member_custody_separation_documented");
  }

  if (params.squadsCustodyPreflight?.ok) {
    checks.push("on_chain_quorum_verified_via_rpc");
  } else if (effectiveThreshold == null || effectiveThreshold < 2) {
    blockers.push("recoverable_quorum_threshold_not_documented");
  } else if (members.length && effectiveThreshold > members.length) {
    blockers.push("threshold_exceeds_member_count");
  } else if (effectiveThreshold != null) {
    checks.push("recoverable_quorum_documented");
  }

  const vaultForPreflight = registryVault ?? "11111111111111111111111111111111";
  const pre = runGovernanceExecutionPreflight({
    clusterGenesisHash: params.devnetObservation?.genesis_hash ?? "",
    expectedGenesisHash: SOLANA_DEVNET_GENESIS_HASH,
    programId: ABRAXAS_TRUST_REGISTRY_PROGRAM_ID,
    expectedProgramId: ABRAXAS_TRUST_REGISTRY_PROGRAM_ID,
    elfSha256: artifact_elf_sha256,
    expectedElfSha256: TRUST_REGISTRY_DEVNET_LIVE_V535.elf_sha256,
    upgradeAuthority: params.devnetObservation?.upgrade_authority ?? null,
    expectedUpgradeAuthority: TRUST_REGISTRY_DEVNET_LIVE_V535.upgrade_authority,
    vaultPda: vaultForPreflight,
    verifiedMultisigEnv: envAllowlist.join(","),
    squadsProposalState: params.squadsProposalState,
    governanceApprovals: params.squadsApprovals,
    governanceThreshold: effectiveThreshold ?? undefined,
  });
  if (!pre.ok) blockers.push(...pre.blockers);
  else checks.push(...pre.checks);

  let stage: GovernanceActivationStage = "BLOCKED";
  const uniqueBlockers = Array.from(new Set(blockers));
  const uniqueChecks = Array.from(new Set(checks));

  if (uniqueBlockers.length === 0) {
    stage = "SQUADS_LIVE_EXECUTION_REQUIRED";
  } else if (
    params.devnetObservation &&
    compareObservationToEvidence535(params.devnetObservation).ok &&
    params.squadsCustodyPreflight?.ok
  ) {
    stage = "CUSTODY_CONFIGURED_OFF_CHAIN";
  } else if (
    params.devnetObservation &&
    compareObservationToEvidence535(params.devnetObservation).ok
  ) {
    stage = "OBSERVED_DEVNET_ALIGNED";
  }

  return {
    schema: "trust_registry_governance_activation_gate_v539",
    stage,
    ok: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    checks: uniqueChecks,
    authority_domains: domains,
    squads_program_id: SQUADS_MULTISIG_V4_PROGRAM_ID,
    devnet_observation: params.devnetObservation,
    squads_custody_preflight: params.squadsCustodyPreflight ?? null,
    artifact_elf_sha256,
  };
}
