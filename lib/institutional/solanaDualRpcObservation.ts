// Read-only dual-RPC Solana observation — does not submit transactions.

import { Connection, PublicKey } from "@solana/web3.js";
import { SOLANA_UPGRADEABLE_LOADER } from "@/lib/partner/onchainGateDeployments/solanaArtifacts";
import { programDataElf } from "@/lib/partner/onchainGateDeployments/solanaObserve";
import { solanaProgramElfSha256 } from "@/lib/partner/onchainGateDeployments/solanaElfDigest";
import { SOLANA_DEVNET_GENESIS_HASH } from "@/lib/partner/testnetGateDeploymentKit/solanaDevnetChainPrecheck";
import { SOLANA_MAINNET_GENESIS_HASH } from "@/lib/institutional/solanaMainnetGovernanceVerifier";

export type RpcEndpointFingerprint = {
  url_redacted: string;
  host: string;
  path: string;
};

export type ProgramObservation = {
  program_id: string;
  executable: boolean;
  owner: string;
  program_data_address: string | null;
  elf_sha256: string | null;
  upgrade_authority: string | null;
  slot: string | null;
};

export type DualRpcObservation = {
  primary: RpcEndpointFingerprint;
  independent: RpcEndpointFingerprint | null;
  /** Host-level comparison only — same host does not prove operational independence. */
  likely_same_operator: boolean | null;
  primary_genesis: string | null;
  independent_genesis: string | null;
  genesis_agreement: boolean | null;
  cluster: "mainnet" | "devnet" | "unknown" | "disagreement";
  program: ProgramObservation | null;
  independent_program_elf_sha256: string | null;
  program_elf_agreement: boolean | null;
  observed_at: string;
  errors: string[];
};

function redactRpcUrl(url: string): RpcEndpointFingerprint {
  try {
    const parsed = new URL(url);
    return {
      url_redacted: `${parsed.protocol}//${parsed.host}${parsed.pathname}`,
      host: parsed.hostname.toLowerCase(),
      path: parsed.pathname,
    };
  } catch {
    return { url_redacted: "invalid_url", host: "", path: "" };
  }
}

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

async function observeProgram(connection: Connection, programId: string): Promise<ProgramObservation | null> {
  const info = await connection.getAccountInfo(new PublicKey(programId), { commitment: "finalized" });
  if (!info) return null;
  const data = Buffer.from(info.data);
  const dataAddress = programDataAddress(info.owner.toBase58(), data);
  let elfSha: string | null = null;
  let upgradeAuthority: string | null = null;
  let slot: string | null = null;
  if (dataAddress) {
    const pd = await connection.getAccountInfo(new PublicKey(dataAddress), { commitment: "finalized" });
    if (pd) {
      const pdBuf = Buffer.from(pd.data);
      slot = pdBuf.length >= 12 ? String(pdBuf.readBigUInt64LE(4)) : null;
      upgradeAuthority = readUpgradeAuthority(pdBuf);
      const elf = programDataElf({ owner: pd.owner.toBase58(), data: pdBuf });
      if (elf) elfSha = solanaProgramElfSha256(elf);
    }
  }
  return {
    program_id: programId,
    executable: info.executable,
    owner: info.owner.toBase58(),
    program_data_address: dataAddress,
    elf_sha256: elfSha,
    upgrade_authority: upgradeAuthority,
    slot,
  };
}

export async function observeSolanaDualRpc(input: {
  primaryRpcUrl: string;
  independentRpcUrl?: string | null;
  programId?: string | null;
  now?: Date;
}): Promise<DualRpcObservation> {
  const now = input.now ?? new Date();
  const primaryFp = redactRpcUrl(input.primaryRpcUrl);
  const independentUrl = input.independentRpcUrl?.trim() || null;
  const independentFp = independentUrl ? redactRpcUrl(independentUrl) : null;
  const errors: string[] = [];

  const primary = new Connection(input.primaryRpcUrl, { commitment: "finalized", disableRetryOnRateLimit: true });
  let primaryGenesis: string | null = null;
  let independentGenesis: string | null = null;
  try {
    primaryGenesis = await primary.getGenesisHash();
  } catch {
    errors.push("primary_genesis_unavailable");
  }

  let independentConn: Connection | null = null;
  if (independentUrl) {
    independentConn = new Connection(independentUrl, { commitment: "finalized", disableRetryOnRateLimit: true });
    try {
      independentGenesis = await independentConn.getGenesisHash();
    } catch {
      errors.push("independent_genesis_unavailable");
    }
  }

  const genesisAgreement =
    primaryGenesis && independentGenesis ? primaryGenesis === independentGenesis : null;

  let cluster: DualRpcObservation["cluster"] = "unknown";
  if (primaryGenesis === SOLANA_MAINNET_GENESIS_HASH) cluster = "mainnet";
  else if (primaryGenesis === SOLANA_DEVNET_GENESIS_HASH) cluster = "devnet";
  if (genesisAgreement === false) cluster = "disagreement";

  const programId = input.programId?.trim() || null;
  let program: ProgramObservation | null = null;
  let independentElf: string | null = null;
  if (programId) {
    try {
      program = await observeProgram(primary, programId);
    } catch {
      errors.push("primary_program_unavailable");
    }
    if (independentConn && program) {
      try {
        const ind = await observeProgram(independentConn, programId);
        independentElf = ind?.elf_sha256 ?? null;
      } catch {
        errors.push("independent_program_unavailable");
      }
    }
  }

  const programElfAgreement =
    program?.elf_sha256 && independentElf ? program.elf_sha256 === independentElf : null;

  const likelySameOperator =
    independentFp && primaryFp.host
      ? primaryFp.host === independentFp.host
      : null;

  return {
    primary: primaryFp,
    independent: independentFp,
    likely_same_operator: likelySameOperator,
    primary_genesis: primaryGenesis,
    independent_genesis: independentGenesis,
    genesis_agreement: genesisAgreement,
    cluster,
    program,
    independent_program_elf_sha256: independentElf,
    program_elf_agreement: programElfAgreement,
    observed_at: now.toISOString(),
    errors,
  };
}
