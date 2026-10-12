import { Connection, PublicKey } from "@solana/web3.js";
import { ABRAXAS_TRUST_REGISTRY_PROGRAM_ID } from "@/lib/solana/trustRegistry/constants";
import { decodeCommitmentStateAccount } from "@/lib/solana/trustRegistry/decodeCommitmentState";
import {
  decodeTrustRegistryGovernance,
  deriveGovernanceMigrationUiState,
} from "@/lib/solana/trustRegistry/governance/decodeTrustRegistry";
import { TRUST_REGISTRY_DEVNET_LIVE_V535 } from "@/lib/solana/trustRegistry/governance/trustRegistryDevnetLiveEvidence535";
import { SQUADS_MULTISIG_V4_PROGRAM_ID } from "@/lib/solana/trustRegistry/governance/squadsV4Pda";
import { SOLANA_UPGRADEABLE_LOADER } from "@/lib/partner/onchainGateDeployments/solanaArtifacts";
import { SOLANA_DEVNET_GENESIS_HASH } from "@/lib/partner/testnetGateDeploymentKit/solanaDevnetChainPrecheck";

export type DevnetTrustRegistryObservation = {
  rpc_url: string;
  genesis_hash: string | null;
  program_executable: boolean;
  program_data_address: string | null;
  upgrade_authority: string | null;
  registry_pda_present: boolean;
  registry_data_len: number | null;
  governance_authority: string | null;
  governance_ui_state: string | null;
  commitment_present: boolean;
  commitment_status: string | null;
  squads_v4_program_executable: boolean | null;
  slot: number | null;
  errors: string[];
};

function programDataAddress(owner: string, data: Buffer): string | null {
  if (owner !== SOLANA_UPGRADEABLE_LOADER || data.length < 36) return null;
  if (data.readUInt32LE(0) !== 2) return null;
  return new PublicKey(data.subarray(4, 36)).toBase58();
}

function readUpgradeAuthority(programData: Buffer): string | null {
  if (programData.length < 45) return null;
  if (programData.readUInt32LE(0) !== 3) return null;
  const option = programData[12];
  if (option !== 1) return null;
  return new PublicKey(programData.subarray(13, 45)).toBase58();
}

export async function observeDevnetTrustRegistryActivation(
  rpcUrl: string,
): Promise<DevnetTrustRegistryObservation> {
  const errors: string[] = [];
  const connection = new Connection(rpcUrl, "finalized");
  let genesis_hash: string | null = null;
  let slot: number | null = null;
  try {
    genesis_hash = await connection.getGenesisHash();
    slot = await connection.getSlot("finalized");
  } catch (e) {
    errors.push(`rpc_meta_failed:${String(e)}`);
  }

  const programId = new PublicKey(ABRAXAS_TRUST_REGISTRY_PROGRAM_ID);
  const registryPda = new PublicKey(TRUST_REGISTRY_DEVNET_LIVE_V535.registry_pda);
  const commitmentPda = new PublicKey(TRUST_REGISTRY_DEVNET_LIVE_V535.commitment_state_pda);

  let program_executable = false;
  let program_data_address: string | null = null;
  let upgrade_authority: string | null = null;
  try {
    const prog = await connection.getAccountInfo(programId, "finalized");
    program_executable = prog?.executable === true;
    if (prog) {
      program_data_address = programDataAddress(prog.owner.toBase58(), Buffer.from(prog.data));
      if (program_data_address) {
        const pd = await connection.getAccountInfo(new PublicKey(program_data_address), "finalized");
        if (pd) upgrade_authority = readUpgradeAuthority(Buffer.from(pd.data));
      }
    }
  } catch (e) {
    errors.push(`program_observation_failed:${String(e)}`);
  }

  let registry_pda_present = false;
  let registry_data_len: number | null = null;
  let governance_authority: string | null = null;
  let governance_ui_state: string | null = null;
  try {
    const reg = await connection.getAccountInfo(registryPda, "finalized");
    registry_pda_present = reg != null;
    if (reg) {
      registry_data_len = reg.data.length;
      const decoded = decodeTrustRegistryGovernance(Buffer.from(reg.data));
      governance_authority = decoded.governanceAuthority;
      governance_ui_state = deriveGovernanceMigrationUiState(decoded, BigInt(slot ?? 0));
    }
  } catch (e) {
    errors.push(`registry_observation_failed:${String(e)}`);
  }

  let commitment_present = false;
  let commitment_status: string | null = null;
  try {
    const cs = await connection.getAccountInfo(commitmentPda, "finalized");
    commitment_present = cs != null;
    if (cs) {
      commitment_status = decodeCommitmentStateAccount(Buffer.from(cs.data))?.status ?? null;
    }
  } catch (e) {
    errors.push(`commitment_observation_failed:${String(e)}`);
  }

  let squads_v4_program_executable: boolean | null = null;
  try {
    const sq = await connection.getAccountInfo(new PublicKey(SQUADS_MULTISIG_V4_PROGRAM_ID), "finalized");
    squads_v4_program_executable = sq?.executable === true;
  } catch (e) {
    errors.push(`squads_observation_failed:${String(e)}`);
  }

  return {
    rpc_url: rpcUrl,
    genesis_hash,
    program_executable,
    program_data_address,
    upgrade_authority,
    registry_pda_present,
    registry_data_len,
    governance_authority,
    governance_ui_state,
    commitment_present,
    commitment_status,
    squads_v4_program_executable,
    slot,
    errors,
  };
}

export function compareObservationToEvidence535(
  obs: DevnetTrustRegistryObservation,
): { ok: boolean; blockers: string[]; checks: string[] } {
  const blockers: string[] = [];
  const checks: string[] = [];
  const ev = TRUST_REGISTRY_DEVNET_LIVE_V535;

  if (obs.genesis_hash && obs.genesis_hash !== SOLANA_DEVNET_GENESIS_HASH) {
    blockers.push("cluster_genesis_not_devnet");
  } else if (obs.genesis_hash) {
    checks.push("devnet_genesis_ok");
  }

  if (!obs.program_executable) blockers.push("trust_registry_program_not_executable");
  else checks.push("program_executable");

  if (obs.upgrade_authority !== ev.upgrade_authority) {
    blockers.push("upgrade_authority_drift_from_v535_evidence");
  } else checks.push("upgrade_authority_matches_v535");

  if (!obs.registry_pda_present) blockers.push("registry_pda_missing");
  else checks.push("registry_pda_present");

  if (obs.governance_authority !== ev.governance_authority) {
    blockers.push("governance_authority_drift_from_v535_evidence");
  } else checks.push("governance_authority_matches_v535");

  if (!obs.commitment_present) blockers.push("historical_commitment_pda_missing");
  else checks.push("commitment_pda_present");

  if (obs.commitment_status !== "REVOKED") {
    blockers.push("build535_revoked_commitment_state_not_observed");
  } else checks.push("build535_revoked_state_preserved");

  if (obs.squads_v4_program_executable !== true) {
    blockers.push("squads_v4_program_not_executable_on_cluster");
  } else checks.push("squads_v4_deployed");

  if (obs.errors.length) blockers.push(...obs.errors.map((e) => `observation_error:${e}`));

  return { ok: blockers.length === 0, blockers, checks };
}
