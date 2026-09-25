// FILE: lib/partner/chainAttestation/solanaMessage.ts
// Canonical Solana eligibility-attestation encoding. No transfer or transaction submit.

import { concat } from "viem";
import {
  CHAIN_ATTESTATION_SCHEMA_VERSION,
  SOLANA_ATTESTATION_MESSAGE_PREFIX,
  type ChainEligibilityAttestationFields,
} from "./contract";
import { encodeU64Be, hashUtf8 } from "./hashes";

export function encodeSolanaEligibilityMessage(fields: ChainEligibilityAttestationFields): Uint8Array {
  const prefix = new TextEncoder().encode(SOLANA_ATTESTATION_MESSAGE_PREFIX);
  return concat([
    prefix,
    hexToBytes(hashUtf8(SOLANA_ATTESTATION_MESSAGE_PREFIX)),
    encodeU64Be(CHAIN_ATTESTATION_SCHEMA_VERSION),
    hexToBytes(fields.networkId),
    hexToBytes(fields.partnerHash),
    hexToBytes(fields.policyHash),
    hexToBytes(fields.actionHash),
    hexToBytes(fields.subjectHash),
    encodeU64Be(fields.issuedAt),
    encodeU64Be(fields.expiresAt),
    hexToBytes(fields.nonce),
    hexToBytes(fields.attestationId),
    hexToBytes(fields.environment),
    hexToBytes(fields.signerKeyId),
    hexToBytes(fields.organizationCommitment),
    hexToBytes(fields.actorCommitment),
    hexToBytes(fields.institutionalResultCategory),
  ]);
}

export function hexToBytes(hex: string): Uint8Array {
  const raw = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(raw.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(raw.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function decodeSolanaEligibilityMessage(message: Uint8Array): ChainEligibilityAttestationFields {
  if (message.length !== 468) throw new Error("invalid_message_length");
  const prefix = new TextEncoder().encode(SOLANA_ATTESTATION_MESSAGE_PREFIX);
  if (message.subarray(0, prefix.length).some((byte, i) => byte !== prefix[i])) throw new Error("invalid_message_prefix");
  let offset = prefix.length;
  const take = (n: number) => { const bytes = message.subarray(offset, offset + n); offset += n; return bytes; };
  const domain = hexToBytes(hashUtf8(SOLANA_ATTESTATION_MESSAGE_PREFIX));
  if (take(32).some((byte, i) => byte !== domain[i])) throw new Error("invalid_message_domain");
  const u64 = () => { const bytes = take(8); const value = new DataView(bytes.buffer, bytes.byteOffset, 8).getBigUint64(0, false); if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("invalid_message_time"); return Number(value); };
  const h32 = () => bytesToHex(take(32));
  if (u64() !== CHAIN_ATTESTATION_SCHEMA_VERSION) throw new Error("invalid_message_schema");
  const networkId = h32(); const partnerHash = h32(); const policyHash = h32(); const actionHash = h32();
  const subjectHash = h32(); const issuedAt = u64(); const expiresAt = u64();
  const nonce = h32(); const attestationId = h32(); const environment = h32(); const signerKeyId = h32();
  const organizationCommitment = h32(); const actorCommitment = h32(); const institutionalResultCategory = h32();
  if (offset !== message.length) throw new Error("invalid_message_length");
  return { schemaVersion: CHAIN_ATTESTATION_SCHEMA_VERSION, networkId, partnerHash, policyHash, actionHash,
    subjectHash, issuedAt, expiresAt, nonce, attestationId, environment, signerKeyId,
    organizationCommitment, actorCommitment, institutionalResultCategory };
}

export function bytesToHex(bytes: Uint8Array): `0x${string}` {
  return `0x${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export interface SolanaEd25519VerifyLayout {
  numSignatures: 1;
  publicKeyOffset: number;
  signatureOffset: number;
  messageDataOffset: number;
  messageDataSize: number;
  publicKey: Uint8Array;
  signature: Uint8Array;
  message: Uint8Array;
  instructionData: Uint8Array;
}

const PUBKEY_LEN = 32;
const SIG_LEN = 64;
const HEADER_LEN = 16;

export function buildSolanaEd25519VerifyInstructionData(input: {
  publicKey: Uint8Array;
  signature: Uint8Array;
  message: Uint8Array;
}): SolanaEd25519VerifyLayout {
  if (input.publicKey.length !== PUBKEY_LEN) throw new Error("invalid_pubkey");
  if (input.signature.length !== SIG_LEN) throw new Error("invalid_signature");
  const publicKeyOffset = HEADER_LEN;
  const signatureOffset = publicKeyOffset + PUBKEY_LEN;
  const messageDataOffset = signatureOffset + SIG_LEN;
  const header = new Uint8Array(HEADER_LEN);
  header[0] = 1;
  header[1] = 0;
  writeU16(header, 2, signatureOffset);
  writeU16(header, 4, 0xffff);
  writeU16(header, 6, publicKeyOffset);
  writeU16(header, 8, 0xffff);
  writeU16(header, 10, messageDataOffset);
  writeU16(header, 12, input.message.length);
  writeU16(header, 14, 0xffff);
  const instructionData = concat([header, input.publicKey, input.signature, input.message]);
  return {
    numSignatures: 1,
    publicKeyOffset,
    signatureOffset,
    messageDataOffset,
    messageDataSize: input.message.length,
    publicKey: input.publicKey,
    signature: input.signature,
    message: input.message,
    instructionData,
  };
}

export const SOLANA_ED25519_PROGRAM_ID = "Ed25519SigVerify111111111111111111111111111" as const;

export const SOLANA_PARTNER_PROGRAM_INTERFACE = `
Partner program interface (reference only; Abraxas does not deploy a program):

1. Receive the canonical message bytes from encodeSolanaEligibilityMessage.
2. Verify Ed25519 against the trusted Abraxas attestation pubkey via the Ed25519 native program.
3. Fail closed unless:
   - signer matches the trusted key;
   - network, partner, policy, version, action, and scope hashes match expected bindings;
   - now < expiresAt;
   - nonce has not been consumed in partner-owned replay state;
   - required subjectHash is present when the named network/action requires a wallet binding;
   - organizationCommitment, actorCommitment, and institutionalResultCategory are present when the reviewed policy requires institutional binding (legacy V1 372-byte messages are rejected).
4. On success, record only an eligibility authorization outcome. Do not transfer SOL or tokens,
   sign a later transaction, or treat the attestation as payment, trade, or gas authorization.

Expected accounts: partner config (trusted signer + expected hashes), durable nonce PDA, clock.
` as const;

function writeU16(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
}

