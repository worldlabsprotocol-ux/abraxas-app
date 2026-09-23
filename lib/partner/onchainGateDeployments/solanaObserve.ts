import { PublicKey } from "@solana/web3.js";
import { sha256 } from "@noble/hashes/sha256";
import { hashEnvironment, hashNetworkId, hashSignerKeyId } from "@/lib/partner/chainAttestation/hashes";
import type { OnchainGateSafeReason } from "./contract";
import type { SolanaDeploymentManifest } from "./types";
import type { SolanaChainObservation } from "./adapters";
import { expectedSolanaConfigDigest } from "./digests";
import { solanaProgramElfKeccak } from "./solanaElfDigest";
import {
  lookupSolanaGateArtifact,
  SOLANA_GATE_ACCOUNT_NAME,
  SOLANA_GATE_CONFIG_SEED,
  SOLANA_UPGRADEABLE_LOADER,
  type SolanaGateArtifactClass,
} from "./solanaArtifacts";

export interface SolanaAccountSnapshot {
  owner: string;
  data: Uint8Array;
}

export type SolanaAccountSource = (pubkey: string) => Promise<SolanaAccountSnapshot | null | { unavailable: true }>;

export type SolanaSignerClass = "active_trusted" | "stale" | "missing";
export type SolanaDigestMatchClass = "matched" | "mismatched";

export interface SafeSolanaObservation extends SolanaChainObservation {
  artifactClass?: SolanaGateArtifactClass;
  signerClass?: SolanaSignerClass;
  digestMatchClass?: SolanaDigestMatchClass;
  safeReason?: OnchainGateSafeReason;
}

const SIGNER_EMPTY = 0;
const SIGNER_ACTIVE = 1;
const SIGNER_RETIRING = 2;
const MAX_SIGNERS = 4;
const SIGNER_SLOT = 65;
const GATE_CONFIG_BODY =
  32 + 32 + 32 + 32 + 32 + 32 + 32 + 1 + 1 + 32 + 32 + 32 + 1 + MAX_SIGNERS * SIGNER_SLOT;

function hex32(bytes: Uint8Array): `0x${string}` {
  return (`0x${Buffer.from(bytes).toString("hex")}`) as `0x${string}`;
}

function readPubkey(data: Uint8Array, offset: number): string {
  return new PublicKey(data.subarray(offset, offset + 32)).toBase58();
}

export function gateConfigDiscriminator(): Uint8Array {
  return sha256(new TextEncoder().encode(`account:${SOLANA_GATE_ACCOUNT_NAME}`)).slice(0, 8);
}

export function deriveGateConfigPda(programId: string, admin: string): string {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(SOLANA_GATE_CONFIG_SEED), new PublicKey(admin).toBuffer()],
    new PublicKey(programId),
  );
  return pda.toBase58();
}

function programDataAddress(programAccount: SolanaAccountSnapshot): string | null {
  if (programAccount.owner !== SOLANA_UPGRADEABLE_LOADER) return null;
  if (programAccount.data.length < 36) return null;
  const disc = Buffer.from(programAccount.data.subarray(0, 4)).readUInt32LE(0);
  if (disc !== 2) return null;
  return new PublicKey(programAccount.data.subarray(4, 36)).toBase58();
}

export function programDataElf(programData: SolanaAccountSnapshot): Uint8Array | null {
  if (programData.owner !== SOLANA_UPGRADEABLE_LOADER) return null;
  if (programData.data.length < 13) return null;
  const disc = Buffer.from(programData.data.subarray(0, 4)).readUInt32LE(0);
  if (disc !== 3) return null;
  const option = programData.data[12];
  const header = option === 1 ? 45 : option === 0 ? 13 : -1;
  if (header < 0 || programData.data.length <= header) return null;
  return programData.data.subarray(header);
}

function decodeGateConfig(account: SolanaAccountSnapshot, expectedOwner: string): {
  admin: string;
  partnerProgram: string;
  partnerHash: `0x${string}`;
  policyHash: `0x${string}`;
  actionHash: `0x${string}`;
  environment: `0x${string}`;
  networkId: `0x${string}`;
  requireSubject: boolean;
  requireInstitutional: boolean;
  bump: number;
  signers: Array<{ keyId: `0x${string}`; status: number }>;
} | null {
  if (account.owner !== expectedOwner) return null;
  const expected = 8 + GATE_CONFIG_BODY;
  if (account.data.length < expected) return null;
  const disc = gateConfigDiscriminator();
  if (!account.data.subarray(0, 8).every((byte, index) => byte === disc[index])) return null;
  let offset = 8;
  const admin = readPubkey(account.data, offset); offset += 32;
  const partnerProgram = readPubkey(account.data, offset); offset += 32;
  const networkId = hex32(account.data.subarray(offset, offset + 32)); offset += 32;
  const partnerHash = hex32(account.data.subarray(offset, offset + 32)); offset += 32;
  const policyHash = hex32(account.data.subarray(offset, offset + 32)); offset += 32;
  const actionHash = hex32(account.data.subarray(offset, offset + 32)); offset += 32;
  const environment = hex32(account.data.subarray(offset, offset + 32)); offset += 32;
  const requireSubject = account.data[offset] === 1; offset += 1;
  const requireInstitutional = account.data[offset] === 1; offset += 1;
  offset += 96; // expected commitments
  const bump = account.data[offset]; offset += 1;
  const signers: Array<{ keyId: `0x${string}`; status: number }> = [];
  for (let i = 0; i < MAX_SIGNERS; i += 1) {
    const keyId = hex32(account.data.subarray(offset, offset + 32));
    const status = account.data[offset + 64];
    signers.push({ keyId, status });
    offset += SIGNER_SLOT;
  }
  return {
    admin,
    partnerProgram,
    partnerHash,
    policyHash,
    actionHash,
    environment,
    networkId,
    requireSubject,
    requireInstitutional,
    bump,
    signers,
  };
}

function signerClass(
  signers: Array<{ keyId: `0x${string}`; status: number }>,
  expectedKeyHash: `0x${string}`,
): SolanaSignerClass {
  const wanted = expectedKeyHash.toLowerCase();
  const match = signers.find((slot) => slot.keyId.toLowerCase() === wanted && slot.status !== SIGNER_EMPTY);
  if (!match) return "missing";
  if (match.status === SIGNER_ACTIVE || match.status === SIGNER_RETIRING) return "active_trusted";
  return "stale";
}

export async function observeSolanaFromAccounts(
  manifest: SolanaDeploymentManifest,
  fetchAccount: SolanaAccountSource,
): Promise<{ ok: true; observation: SafeSolanaObservation } | { ok: false; reason: OnchainGateSafeReason }> {
  try {
    const program = await fetchAccount(manifest.program_id);
    if (!program || "unavailable" in program) return { ok: false, reason: "deployment_verification_unavailable" };
    const programDataKey = programDataAddress(program);
    if (!programDataKey) return { ok: false, reason: "program_mismatch" };
    const programData = await fetchAccount(programDataKey);
    if (!programData || "unavailable" in programData) return { ok: false, reason: "deployment_verification_unavailable" };
    const elf = programDataElf(programData);
    if (!elf) return { ok: false, reason: "program_mismatch" };
    const programDigest = solanaProgramElfKeccak(elf);
    const artifact = lookupSolanaGateArtifact(programDigest);
    if (!artifact) return { ok: false, reason: "unrecognized_gate_artifact" };
    if (artifact.program_id && artifact.program_id !== manifest.program_id) {
      return { ok: false, reason: "program_mismatch" };
    }

    const claimed = await fetchAccount(manifest.gate_config_pda);
    if (!claimed || "unavailable" in claimed) return { ok: false, reason: "deployment_verification_unavailable" };
    const decoded = decodeGateConfig(claimed, manifest.program_id);
    if (!decoded) return { ok: false, reason: "invalid" };

    const derivedPda = deriveGateConfigPda(manifest.program_id, decoded.admin);
    if (derivedPda !== manifest.gate_config_pda) return { ok: false, reason: "gate_config_mismatch" };
    if (decoded.partnerProgram !== manifest.partner_program_id) return { ok: false, reason: "program_mismatch" };

    if (decoded.partnerHash.toLowerCase() !== manifest.partner_hash.toLowerCase()) {
      return { ok: false, reason: "tenant_mismatch" };
    }
    if (decoded.policyHash.toLowerCase() !== manifest.policy_hash.toLowerCase()) {
      return { ok: false, reason: "policy_mismatch" };
    }
    if (decoded.actionHash.toLowerCase() !== manifest.action_hash.toLowerCase()) {
      return { ok: false, reason: "action_mismatch" };
    }
    if (decoded.environment.toLowerCase() !== hashEnvironment(manifest.environment).toLowerCase()) {
      return { ok: false, reason: "environment_mismatch" };
    }
    if (decoded.networkId.toLowerCase() !== hashNetworkId(manifest.network_id).toLowerCase()) {
      return { ok: false, reason: "network_disabled" };
    }
    if (manifest.subject_binding_mode === "required" && !decoded.requireSubject) {
      return { ok: false, reason: "invalid" };
    }

    const signers = signerClass(decoded.signers, hashSignerKeyId(manifest.signer_key_id));
    if (signers === "stale") return { ok: false, reason: "signer_update_required" };
    if (signers === "missing") return { ok: false, reason: "deployment_mismatch" };

    const digestMatch: SolanaDigestMatchClass =
      programDigest.toLowerCase() === manifest.program_digest.toLowerCase() ? "matched" : "mismatched";
    if (digestMatch === "mismatched") return { ok: false, reason: "program_mismatch" };

    const schemaVersion = artifact.schema_versions_supported.includes(2) && decoded.requireInstitutional ? 2 : artifact.schema_versions_supported[0];
    const institutional = artifact.institutional_capable && decoded.requireInstitutional && schemaVersion === 2;
    if (decoded.requireInstitutional && !artifact.institutional_capable) {
      return { ok: false, reason: "institutional_required" };
    }

    const configDigest = expectedSolanaConfigDigest({
      programId: manifest.program_id,
      partnerProgramId: decoded.partnerProgram,
      gateConfigPda: derivedPda,
      programDigest,
      partnerHash: manifest.partner_hash,
      policyHash: manifest.policy_hash,
      actionHash: manifest.action_hash,
      environment: hashEnvironment(manifest.environment),
      signerKeyId: manifest.signer_key_id,
      subjectBindingMode: manifest.subject_binding_mode,
    });
    const observation: SafeSolanaObservation = {
      programId: manifest.program_id,
      partnerProgramId: decoded.partnerProgram,
      gateConfigPda: derivedPda,
      programDigest,
      configDigest,
      schemaVersion: institutional ? 2 : artifact.schema_versions_supported[0],
      canonicalMessageLen: institutional ? 468 : artifact.canonical_message_lengths[0],
      requireInstitutional: institutional,
      institutionalCapable: institutional,
      artifactClass: artifact.artifact_class,
      signerClass: signers,
      digestMatchClass: digestMatch,
      safeReason: "permitted",
    };
    return { ok: true, observation };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export function encodeUpgradeableProgramAccount(programDataAddress: string): Uint8Array {
  const data = Buffer.alloc(36);
  data.writeUInt32LE(2, 0);
  new PublicKey(programDataAddress).toBuffer().copy(data, 4);
  return data;
}

export function encodeProgramDataAccount(elf: Uint8Array, authority: string): Uint8Array {
  const header = Buffer.alloc(45);
  header.writeUInt32LE(3, 0);
  header.writeUInt32LE(1, 4);
  header.writeUInt32LE(0, 8);
  header[12] = 1;
  new PublicKey(authority).toBuffer().copy(header, 13);
  return Buffer.concat([header, Buffer.from(elf)]);
}

export function encodeGateConfigAccount(input: {
  admin: string;
  partnerProgram: string;
  networkId: `0x${string}`;
  partnerHash: `0x${string}`;
  policyHash: `0x${string}`;
  actionHash: `0x${string}`;
  environment: `0x${string}`;
  requireSubject: boolean;
  requireInstitutional: boolean;
  bump: number;
  signerKeyId: `0x${string}`;
  signerStatus?: number;
}): Uint8Array {
  const body = Buffer.alloc(GATE_CONFIG_BODY);
  let offset = 0;
  const writePk = (value: string) => {
    new PublicKey(value).toBuffer().copy(body, offset);
    offset += 32;
  };
  const write32 = (hex: `0x${string}`) => {
    Buffer.from(hex.slice(2), "hex").copy(body, offset);
    offset += 32;
  };
  writePk(input.admin);
  writePk(input.partnerProgram);
  write32(input.networkId);
  write32(input.partnerHash);
  write32(input.policyHash);
  write32(input.actionHash);
  write32(input.environment);
  body[offset] = input.requireSubject ? 1 : 0; offset += 1;
  body[offset] = input.requireInstitutional ? 1 : 0; offset += 1;
  offset += 96;
  body[offset] = input.bump; offset += 1;
  Buffer.from(input.signerKeyId.slice(2), "hex").copy(body, offset);
  body[offset + 64] = input.signerStatus ?? SIGNER_ACTIVE;
  return Buffer.concat([Buffer.from(gateConfigDiscriminator()), body]);
}
