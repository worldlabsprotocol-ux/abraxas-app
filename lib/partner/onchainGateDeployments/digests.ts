import { utf8Bytes } from "@/lib/partner/chainAttestation/utf8";
import { keccakHex } from "@/lib/partner/chainAttestationSignerLifecycle/keccak";
import { hashAction, hashEnvironment, hashPartnerId, hashPolicy, hashSignerKeyId } from "@/lib/partner/chainAttestation/hashes";
import type { EvmDeploymentManifest, SolanaDeploymentManifest } from "./types";

function hexBytes(value: `0x${string}`): Uint8Array {
  const hex = value.slice(2);
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) throw new Error("invalid_hex");
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function bytes32(value: `0x${string}`): Uint8Array {
  const bytes = hexBytes(value);
  if (bytes.length !== 32) throw new Error("invalid_bytes32");
  return bytes;
}

function uint256(value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("invalid_uint256");
  const bytes = new Uint8Array(32);
  let remainder = BigInt(value);
  for (let index = 31; index >= 0; index -= 1) {
    bytes[index] = Number(remainder & 255n);
    remainder >>= 8n;
  }
  return bytes;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

function digest(parts: Uint8Array[]): `0x${string}` {
  return keccakHex(concatBytes(parts));
}

export function expectedEvmConfigDigest(input: {
  chainId: number;
  gateAddress: `0x${string}`;
  partnerHash: `0x${string}`;
  policyHash: `0x${string}`;
  actionHash: `0x${string}`;
  environment: `0x${string}`;
  signerKeyId: string;
  subjectBindingMode: string;
}): `0x${string}` {
  const address = hexBytes(input.gateAddress);
  if (address.length !== 20) throw new Error("invalid_address");
  const paddedAddress = new Uint8Array(32);
  paddedAddress.set(address, 12);
  return digest([
    uint256(input.chainId), paddedAddress,
    bytes32(input.partnerHash), bytes32(input.policyHash), bytes32(input.actionHash),
    bytes32(input.environment),
    bytes32(keccakHex(utf8Bytes(input.signerKeyId))),
    bytes32(keccakHex(utf8Bytes(input.subjectBindingMode))),
  ]);
}

export function expectedSolanaConfigDigest(input: {
  programId: string;
  partnerProgramId: string;
  gateConfigPda: string;
  programDigest: `0x${string}`;
  partnerHash: `0x${string}`;
  policyHash: `0x${string}`;
  actionHash: `0x${string}`;
  environment: `0x${string}`;
  signerKeyId: string;
  subjectBindingMode: string;
}): `0x${string}` {
  return digest([
    bytes32(keccakHex(utf8Bytes(input.programId))),
    bytes32(keccakHex(utf8Bytes(input.partnerProgramId))),
    bytes32(keccakHex(utf8Bytes(input.gateConfigPda))),
    bytes32(input.programDigest), bytes32(input.partnerHash), bytes32(input.policyHash),
    bytes32(input.actionHash), bytes32(input.environment),
    bytes32(keccakHex(utf8Bytes(input.signerKeyId))),
    bytes32(keccakHex(utf8Bytes(input.subjectBindingMode))),
  ]);
}

export function hashesForApplication(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  actionType: string;
  actionScope: string;
  environment: "sandbox" | "production";
  signerKeyId: string;
}) {
  return {
    partner_hash: hashPartnerId(input.partnerId),
    policy_hash: hashPolicy(input.policyId, input.policyVersion),
    action_hash: hashAction(input.actionType, input.actionScope),
    environment_hash: hashEnvironment(input.environment),
    signer_key_hash: hashSignerKeyId(input.signerKeyId),
  };
}

export function evmDigestFromManifest(manifest: EvmDeploymentManifest, environmentHash: `0x${string}`): `0x${string}` {
  return expectedEvmConfigDigest({
    chainId: manifest.chain_id,
    gateAddress: manifest.gate_address,
    partnerHash: manifest.partner_hash,
    policyHash: manifest.policy_hash,
    actionHash: manifest.action_hash,
    environment: environmentHash,
    signerKeyId: manifest.signer_key_id,
    subjectBindingMode: manifest.subject_binding_mode,
  });
}

export function solanaDigestFromManifest(manifest: SolanaDeploymentManifest, environmentHash: `0x${string}`): `0x${string}` {
  return expectedSolanaConfigDigest({
    programId: manifest.program_id,
    partnerProgramId: manifest.partner_program_id,
    gateConfigPda: manifest.gate_config_pda,
    programDigest: manifest.program_digest,
    partnerHash: manifest.partner_hash,
    policyHash: manifest.policy_hash,
    actionHash: manifest.action_hash,
    environment: environmentHash,
    signerKeyId: manifest.signer_key_id,
    subjectBindingMode: manifest.subject_binding_mode,
  });
}

