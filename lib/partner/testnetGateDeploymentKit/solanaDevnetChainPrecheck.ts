import { PublicKey } from "@solana/web3.js";
import { solanaProgramElfKeccak, solanaProgramElfSha256 } from "@/lib/partner/onchainGateDeployments/solanaElfDigest";
import { deriveGateConfigPda, programDataElf } from "@/lib/partner/onchainGateDeployments/solanaObserve";
import { SOLANA_UPGRADEABLE_LOADER } from "@/lib/partner/onchainGateDeployments/solanaArtifacts";
import { SOLANA_GATE_V2_RELEASE } from "@/lib/partner/onchainGateDeployments/solanaV2Release";
import protocolAccessArtifact from "@/solana/abraxas-eligibility-gate/release/protocol-access-devnet-r1.artifact.json";

export const SOLANA_DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

type Account = { owner: string; data: Uint8Array };
export type PublicSolanaAccountSource = (pubkey: string) => Promise<Account | null | { unavailable: true }>;
export type PublicSolanaGenesisSource = () => Promise<string | null>;

export type DevnetChainPrecheckReason =
  | "invalid_admin" | "wrong_cluster" | "rpc_unavailable"
  | "gate_program_missing" | "gate_artifact_mismatch"
  | "consumer_program_missing" | "consumer_artifact_mismatch"
  | "gate_config_already_initialized";

export type ReviewedProgram = {
  programId: string;
  elfBytes: number;
  keccak: string;
  sha256: string;
};

export const REVIEWED_DEVNET_PROGRAMS: { gate: ReviewedProgram; consumer: ReviewedProgram } = {
  gate: {
    programId: SOLANA_GATE_V2_RELEASE.program_id,
    elfBytes: 278184,
    keccak: SOLANA_GATE_V2_RELEASE.program_data_digest,
    sha256: SOLANA_GATE_V2_RELEASE.elf_sha256,
  },
  consumer: {
    programId: protocolAccessArtifact.program_id,
    elfBytes: protocolAccessArtifact.bytes,
    keccak: protocolAccessArtifact.program_data_digest,
    sha256: protocolAccessArtifact.elf_sha256,
  },
};

function programDataAddress(account: Account): string | null {
  if (account.owner !== SOLANA_UPGRADEABLE_LOADER || account.data.length !== 36) return null;
  if (Buffer.from(account.data).readUInt32LE(0) !== 2) return null;
  return new PublicKey(account.data.subarray(4, 36)).toBase58();
}

export async function inspectProgram(
  reviewed: ReviewedProgram,
  readAccount: PublicSolanaAccountSource,
): Promise<"matched" | "missing" | "mismatch" | "unavailable"> {
  const account = await readAccount(reviewed.programId);
  if (!account) return "missing";
  if ("unavailable" in account) return "unavailable";
  const dataAddress = programDataAddress(account);
  if (!dataAddress) return "mismatch";
  const programData = await readAccount(dataAddress);
  if (!programData || "unavailable" in programData) return "unavailable";
  const elf = programDataElf(programData);
  if (!elf || elf.length !== reviewed.elfBytes) return "mismatch";
  if (solanaProgramElfKeccak(elf).toLowerCase() !== reviewed.keccak.toLowerCase()) return "mismatch";
  if (solanaProgramElfSha256(elf).toLowerCase() !== reviewed.sha256.toLowerCase()) return "mismatch";
  return "matched";
}

/** Read-only chain check. Reviewed fingerprints are pinned by the caller, never by an RPC response. */
export async function inspectSolanaDevnetBeforeConfig(input: {
  adminPubkey: string;
  genesis: PublicSolanaGenesisSource;
  readAccount: PublicSolanaAccountSource;
  reviewed?: { gate: ReviewedProgram; consumer: ReviewedProgram };
}): Promise<
  | { ok: false; reason: DevnetChainPrecheckReason; broadcast: false }
  | { ok: true; network_id: "solana_devnet"; genesis_hash: string; gate_program_id: string;
      consumer_program_id: string; gate_config_pda: string; gate_artifact: "matched";
      consumer_artifact: "matched"; gate_config_state: "uninitialized";
      ownership_verified: false; broadcast: false }
> {
  const fail = (reason: DevnetChainPrecheckReason) => ({ ok: false as const, reason, broadcast: false as const });
  let admin: PublicKey;
  try {
    admin = new PublicKey(input.adminPubkey.trim());
    if (!PublicKey.isOnCurve(admin.toBytes())) return fail("invalid_admin");
  } catch {
    return fail("invalid_admin");
  }
  const reviewed = input.reviewed ?? REVIEWED_DEVNET_PROGRAMS;
  try {
    const before = await input.genesis();
    if (!before) return fail("rpc_unavailable");
    if (before !== SOLANA_DEVNET_GENESIS_HASH) return fail("wrong_cluster");
    const gate = await inspectProgram(reviewed.gate, input.readAccount);
    if (gate !== "matched") return fail(gate === "missing" ? "gate_program_missing" : gate === "unavailable" ? "rpc_unavailable" : "gate_artifact_mismatch");
    const consumer = await inspectProgram(reviewed.consumer, input.readAccount);
    if (consumer !== "matched") return fail(consumer === "missing" ? "consumer_program_missing" : consumer === "unavailable" ? "rpc_unavailable" : "consumer_artifact_mismatch");
    const pda = deriveGateConfigPda(reviewed.gate.programId, admin.toBase58());
    const config = await input.readAccount(pda);
    if (config && "unavailable" in config) return fail("rpc_unavailable");
    if (config) return fail("gate_config_already_initialized");
    const after = await input.genesis();
    if (!after) return fail("rpc_unavailable");
    if (after !== SOLANA_DEVNET_GENESIS_HASH) return fail("wrong_cluster");
    return {
      ok: true, network_id: "solana_devnet", genesis_hash: after,
      gate_program_id: reviewed.gate.programId,
      consumer_program_id: reviewed.consumer.programId,
      gate_config_pda: pda,
      gate_artifact: "matched", consumer_artifact: "matched",
      gate_config_state: "uninitialized",
      ownership_verified: false, broadcast: false,
    };
  } catch {
    return fail("rpc_unavailable");
  }
}

